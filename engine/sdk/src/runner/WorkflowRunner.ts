import type { ContractReceipt } from '@ethersproject/contracts'
import type { EncodedWorkflow } from '../EncodedWorkflow'
import type { Chain } from '../model'
import type { AddAssetInfo } from './AddAssetInfo'
import { ExecutionEvent, ExecutionEventCode, ExecutionEventHandler } from './ExecutionEvent'
import type { IWorkflowInstance } from './IWorkflowInstance'
import type { IWorkflowRunner } from './IWorkflowRunner'
import { IERC20__factory, BridgeBase__factory, WorkflowRunner__factory } from '@freemarket/evm'
import assert from '../utils/assert'
import type Big from 'big.js'
import { getEthersSigner, getEthersProvider } from '../utils/evm-utils'
import type { Signer } from '@ethersproject/abstract-signer'
import { BigNumber } from '@ethersproject/bignumber'
import { getFreeMarketConfig } from '../config'

import rootLogger from 'loglevel'
import { getStargateBridgeParamsEvent } from '../private/debug-utils'
const log = rootLogger.getLogger('WorkflowRunner')

interface ContinuationInfo {
  bridgeName: string
  nonce: string
  targetChain: Chain
}
export interface WaitForContinuationResult {
  transaction: {
    hash: string
  }
  assetAmount: string
}

export class WorkflowRunner implements IWorkflowRunner {
  private startChainWorkflow: EncodedWorkflow
  private eventHandlers: ExecutionEventHandler[] = []
  private instance: IWorkflowInstance
  private startChain: Chain
  private addAssetInfo: AddAssetInfo

  constructor(instance: IWorkflowInstance, startChainWorkflow: EncodedWorkflow, startChain: Chain, addAssetInfo: AddAssetInfo) {
    this.startChainWorkflow = startChainWorkflow
    this.instance = instance
    this.startChain = startChain
    this.addAssetInfo = addAssetInfo
  }

  addEventHandler(handler: ExecutionEventHandler): void {
    this.eventHandlers.push(handler)
  }

  async execute(): Promise<void> {
    try {
      const stdProvider = this.instance.getProvider('start-chain')
      const startChainSigner = getEthersSigner(stdProvider)
      assert(startChainSigner)
      await this.doErc20Approvals(startChainSigner)
      await this.submitWorkflow(startChainSigner)
    } catch (e) {
      const s = e instanceof Error ? e.message : (e as any)
      log.error(`Workflow unsuccessful: ${s}`)
    }
  }

  async submitWorkflow(signer: Signer): Promise<void> {
    const frontDoorAddr = await this.instance.getFrontDoorAddressForChain(this.startChain)
    const runner = WorkflowRunner__factory.connect(frontDoorAddr, signer)

    this.sendEvent(new ExecutionEvent(ExecutionEventCode.WorkflowSubmitting, { chain: this.startChain }))
    const nativeAmount: string = this.addAssetInfo.native.toFixed(0)

    const srcWorkflowGasEstimate = await runner.estimateGas.executeWorkflow(this.startChainWorkflow, {
      value: nativeAmount,
    })
    const gasLimit = srcWorkflowGasEstimate.mul(11).div(10)
    const tx = await runner.executeWorkflow(this.startChainWorkflow, { value: nativeAmount, gasLimit })
    this.sendEvent(new ExecutionEvent(ExecutionEventCode.WorkflowSubmitted, { chain: this.startChain }))
    const txReceipt = await tx.wait(1)
    this.sendEvent(
      new ExecutionEvent(ExecutionEventCode.WorkflowConfirmed, { chain: this.startChain, transactionHash: txReceipt.transactionHash })
    )

    // const eraseme = getStargateBridgeParamsEvent(txReceipt)

    const sourceChain = this.startChain

    for (;;) {
      const continuationInfo = this.getContinuationInfoFromEvents(txReceipt)
      if (!continuationInfo) {
        break
      }

      this.sendEvent(
        new ExecutionEvent(ExecutionEventCode.WaitingForBridge, {
          bridge: continuationInfo.bridgeName,
          source: sourceChain,
          target: continuationInfo.targetChain,
        })
      )
      await this.waitForContinuation(continuationInfo)

      // TODO get next txReceipt
      //  provider.getTransaction(transactionHash)
    }

    this.sendEvent(new ExecutionEvent(ExecutionEventCode.Completed, {}))
  }

  getContinuationInfoFromEvents(txReceipt: ContractReceipt): ContinuationInfo | null {
    const iface = BridgeBase__factory.createInterface()
    const eventTopic = iface.getEventTopic(iface.events['WorkflowBridged(string,uint256,uint256)'])
    for (const log of txReceipt.logs) {
      if (log.topics[0] === eventTopic) {
        try {
          const event = iface.parseLog(log)
          const { bridgeName, nonce, targetChainId } = event.args
          const targetChain = WorkflowRunner.getChainFromCode(targetChainId.toNumber())
          return { bridgeName, nonce, targetChain }
        } catch (e) {
          // ignore error
        }
      }
    }
    return null
  }

  private sendEvent(event: ExecutionEvent) {
    for (const handler of this.eventHandlers) {
      handler(event)
    }
  }

  private async doErc20Approvals(signer: Signer) {
    const symbols = [] as string[]
    for (const [symbol, amounts] of this.addAssetInfo.erc20s) {
      if (amounts.currentAllowance.lt(amounts.requiredAllowance)) {
        symbols.push(symbol)
      }
    }
    if (symbols.length === 0) {
      return
    }

    this.sendEvent(new ExecutionEvent(ExecutionEventCode.Erc20ApprovalsSubmittingAll, { symbols }))

    const promises: Promise<ContractReceipt>[] = []
    for (const symbol of symbols) {
      const amounts = this.addAssetInfo.erc20s.get(symbol)
      assert(amounts)
      const amount = amounts.requiredAllowance
      this.sendEvent(new ExecutionEvent(ExecutionEventCode.Erc20ApprovalsSubmitting, { symbol, amount }))
      promises.push(this.doErc20Approval(signer, symbol, amount))
    }
    const results = await Promise.all(promises)
    for (let i = 0; i < results.length; ++i) {
      const symbol = symbols[i]
      const txReceipt = results[i]
      this.sendEvent(new ExecutionEvent(ExecutionEventCode.Erc20ApprovalsConfirmed, { symbol }, txReceipt.transactionHash))
    }
    this.sendEvent(new ExecutionEvent(ExecutionEventCode.Erc20ApprovalsConfirmedAll, {}))
  }

  private async doErc20Approval(signer: Signer, symbol: string, amount: Big) {
    const frontDoorAddress = await this.instance.getFrontDoorAddressForChain(this.startChain)
    const fungi = await this.instance.getFungibleToken(symbol)
    assert(fungi)
    const addr = fungi.chains[this.startChain]?.address
    assert(addr)
    const erc20 = IERC20__factory.connect(addr, signer)
    const response = await erc20.approve(frontDoorAddress, amount.toFixed(0))
    return await response.wait(1)
  }

  private static getChainFromCode(chainId: number): Chain {
    switch (chainId) {
      case 101:
        return 'ethereum'
      case 102:
        return 'binance'
      case 106:
        return 'avalanche'
      case 109:
        return 'polygon'
      case 110:
        return 'arbitrum'
      case 111:
        return 'optimism'
      case 112:
        return 'fantom'
      // testnets
      case 10121:
        return 'ethereum'
      case 10143:
        return 'arbitrum'
      case 10132:
        return 'optimism'
      case 10102:
        return 'binance'
      case 10106:
        return 'avalanche'
      case 10109:
        return 'polygon'
      case 10112:
        return 'fantom'

      default:
        throw new Error('unknown chainId ' + chainId)
    }
  }

  waitForContinuation(continuationInfo: ContinuationInfo): Promise<WaitForContinuationResult> {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise<WaitForContinuationResult>(async (resolve, reject) => {
      try {
        const { nonce, targetChain } = continuationInfo
        const frontDoorAddr = await this.instance.getFrontDoorAddressForChain(targetChain)

        const ethersProvider = getEthersProvider(this.instance.getProvider(targetChain))
        const runner = WorkflowRunner__factory.connect(frontDoorAddr, ethersProvider)
        const expectedNonce = BigNumber.from(nonce)
        const filter = runner.filters.WorkflowContinuation(null, null, null)

        const { bridgeTimeoutSeconds } = getFreeMarketConfig()

        const timeout = setTimeout(() => {
          log.warn(`did not see WorkflowContinuation event after ${bridgeTimeoutSeconds} seconds, timing out`)
          runner.removeAllListeners() // cancels the subscription
          reject('timeout')
        }, bridgeTimeoutSeconds * 1000)

        log.debug(`watching for nonce ${nonce}`)
        runner.on(filter, async (nonce, _userAddress, startingAsset, event) => {
          log.debug('got WorkflowContinuation')
          if (nonce.eq(expectedNonce)) {
            log.debug(`saw expected nonce ${nonce}`)
            runner.removeAllListeners()
            clearTimeout(timeout)
            const txReceipt = await event.getTransactionReceipt()
            resolve({
              transaction: { hash: txReceipt.transactionHash },
              assetAmount: startingAsset.amount.toString(),
            })
          }
        })
      } catch (e) {
        reject(e)
      }
    })
  }
}
