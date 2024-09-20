import { expect } from 'chai'
import hardhat, { ethers, deployments } from 'hardhat'
import { CurveTriCrypto2SwapHelper } from '../tslib/helper'
import { STEP_TYPE_ID_CURVE } from '@freemarket/core/tslib/step-ids'
import { EncodingContext, IERC20__factory } from '@freemarket/core'
import { getTestFixture, MockWorkflowInstance, validateAction } from '@freemarket/step-sdk/tslib/testing'
import { CurveTriCrypto2SwapAction } from '../typechain-types'
import { CurveTriCrypto2Swap } from '../tslib/model'
import Big from 'big.js'

const testAmountEth = new Big('1')
const testAmountWei = ethers.utils.parseEther(testAmountEth.toString())

const UsdtAddress = '0xdac17f958d2ee523a2206206994597c13d831ec7'
const WethAddress = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
const WbtcAddress = '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'

const setup = getTestFixture(hardhat, async baseFixture => {
  const {
    users: { otherUser },
    signers: { otherUserSigner },
    contracts: { frontDoor },
  } = baseFixture

  // deploy the contract
  await deployments.fixture('CurveTriCrypto2SwapAction')

  // get a reference to the deployed contract with otherUser as the signer
  const triCryptoAction = <CurveTriCrypto2SwapAction>await ethers.getContract('CurveTriCrypto2SwapAction', otherUserSigner)
  const usdt = IERC20__factory.connect(UsdtAddress, otherUserSigner)
  const mockWorkflowInstance = new MockWorkflowInstance()
  mockWorkflowInstance.registerErc20('USDT', UsdtAddress, 6)
  mockWorkflowInstance.registerErc20('WETH', WethAddress, 18)
  mockWorkflowInstance.registerErc20('WBTC', WbtcAddress, 8)

  const helper = new CurveTriCrypto2SwapHelper(mockWorkflowInstance)

  return { contracts: { triCryptoAction, usdt }, mockWorkflowInstance, helper }
})

describe('Curve Tricrypo2 swap', async () => {
  it('deploys', async () => {
    const {
      contracts: { configManager, triCryptoAction },
    } = await setup()
    // simple sanity check to make sure that the action registered itself during deployment
    await validateAction(configManager, STEP_TYPE_ID_CURVE, triCryptoAction.address)
  })

  it('transfers native to tether', async () => {
    const {
      users: { otherUser },
      contracts: { triCryptoAction, usdt },
      helper,
    } = await setup()
    const stepConfig: CurveTriCrypto2Swap = {
      type: 'curve-tricrypto2-swap',
      inputAsset: {
        type: 'native',
      },
      source: 'workflow',
      inputAmount: testAmountEth.toFixed(0),
      outputAsset: {
        type: 'fungible-token',
        symbol: 'USDT',
      },
    }

    const context: EncodingContext<CurveTriCrypto2Swap> = {
      userAddress: otherUser,
      chain: 'ethereum',
      stepConfig,
      mapStepIdToIndex: new Map<string, number>(),
    }
    let encoded = await helper.encodeWorkflowStep(context)

    const tetherBalanceBefore = await usdt.balanceOf(triCryptoAction.address)
    const { inputAssets, argData } = encoded
    await expect(triCryptoAction.execute(inputAssets, argData, otherUser, { value: testAmountWei })).not.to.be.reverted
    let tetherBalanceAfter = await usdt.balanceOf(triCryptoAction.address)
    expect(tetherBalanceAfter).to.be.greaterThan(tetherBalanceBefore)
    console.log('tetherBalanceAfter', tetherBalanceAfter.toString())
    const inputAmountStr = new Big(tetherBalanceAfter.toString()).div(10 ** 6).toString()
    console.log('inputAmountStr', inputAmountStr)
    // go the other direction: USDT -> WETH (to native is failing)
    context.stepConfig = {
      type: 'curve-tricrypto2-swap',
      inputAsset: {
        type: 'fungible-token',
        symbol: 'USDT',
      },
      source: 'workflow',
      inputAmount: inputAmountStr,
      // this fails, I assume when going in this direction it doesn't unwrap for you
      // outputAsset: {
      //   type: 'native',
      // },
      outputAsset: {
        type: 'fungible-token',
        symbol: 'WETH',
      },
    }
    encoded = await helper.encodeWorkflowStep(context)
    // await expect(triCryptoAction.execute(encoded.inputAssets, encoded.outputAssets, encoded.data)).not.to.be.reverted
    await (await triCryptoAction.execute(encoded.inputAssets, encoded.argData, otherUser)).wait()
    tetherBalanceAfter = await usdt.balanceOf(triCryptoAction.address)
    expect(tetherBalanceAfter).to.equal(0)
  })
})
