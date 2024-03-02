import assert from '../utils/assert'
import cloneDeep from 'lodash.clonedeep'
import { AssetNotFoundError, AssetNotFoundProblem } from './AssetNotFoundError'
import { createStepHelper } from './createStepHelper'
import { MapWithDefault } from '../utils/MapWithDefault'
import { WORKFLOW_END_STEP_ID } from './constants'
import { WorkflowArgumentError, WorkflowArgumentProblem, WorkflowArgumentProblemType } from './WorkflowArgumentError'
import { WorkflowRunner } from './WorkflowRunner'
import { WorkflowValidationError, WorkflowValidationProblem, WorkflowValidationProblemType } from './WorkflowValidationError'
import type { EIP1193Provider } from 'eip1193-provider'
import { Arguments, Step, stepSchema, Workflow, workflowSchema } from '../model'
import type { StepNode } from './StepNode'
import type { ZodObject, ZodType } from 'zod'
import type { ReadonlyDeep } from 'type-fest'
import type { WorkflowSegment } from './WorkflowSegment'
import type { IWorkflowInstance } from './IWorkflowInstance'
import type { IWorkflowRunner } from './IWorkflowRunner'
import Big from 'big.js'
import type { Provider } from '@ethersproject/providers'
import type { AddAssetInfo, Erc20Info } from './AddAssetInfo'
import {
  AssetAmount,
  getParameterSchema,
  PARAMETER_REFERENCE_REGEXP,
  getChainFromProvider,
  getEthersProvider,
  AssetReference,
  assetReferenceSchema,
  type ChainOrStart,
  type IStepHelper,
  type Chain,
  type Amount,
  type NextSteps,
  type EncodedWorkflow,
  type StepBase,
  EvmWorkflowStep,
  IERC20__factory,
  ParameterType,
  ADDRESS_ZERO,
  RemittanceInfo,
  TEN_BIG,
  Memoize,
  EvmBeforeAfter,
  MultiStepEncodingContext,
  translateChain,
  BeforeAfterResult,
  AssetInfoService,
  Asset,
  FungibleToken,
  getLogger,
} from '@freemarket/core'

const logger = getLogger('WorkflowInstance')

import frontDoorAddressesJson from '@freemarket/runner/deployments/front-doors.json'
import { EvmTransactionExecutor } from './EvmTransactionExecutor'

const frontDoorAddresses: Record<string, string> = frontDoorAddressesJson

type ParameterPath = string[]
type VisitStepCallback = (stepObject: any, path: string[]) => void

interface WorkflowInstanceConstructorOptions {
  skipValidation?: boolean
}

export class WorkflowInstance implements IWorkflowInstance {
  private workflow: Workflow
  private providers = new Map<ChainOrStart, EIP1193Provider>()
  private executors = new Map<ChainOrStart, EvmTransactionExecutor>()
  // need for uniswap which doesn't support routing on forked chains
  private nonForkedProviders = new Map<ChainOrStart, EIP1193Provider>()
  private stepHelpers = new MapWithDefault<ChainOrStart, Map<string, IStepHelper<any>>>(() => new Map())
  private steps: StepNode[]

  // determined

  constructor(workflow: Workflow | string, options?: WorkflowInstanceConstructorOptions) {
    const unparsedWorkflow = typeof workflow === 'string' ? JSON.parse(workflow) : workflow
    const parsedWorkflow = workflowSchema.parse(unparsedWorkflow)
    this.workflow = parsedWorkflow
    this.steps = this.addMissingStepIds(parsedWorkflow.steps)
    if (!options?.skipValidation) {
      this.validateWorkflowSteps()
      this.validateParameters()
    }
    // TODO validateAssetRefs -- but may need to skip unresolved parameters
  }
  getFungibleToken(symbol: string): Promise<FungibleToken | undefined> {
    return AssetInfoService.getFungibleToken(symbol, this.workflow.fungibleTokens || [])
  }
  getFungibleTokenByChainAndAddress(chain: Chain, address: string): Promise<FungibleToken | undefined> {
    return AssetInfoService.getFungibleTokenByChainAndAddress(chain, address, this.workflow.fungibleTokens || [])
  }
  dereferenceAsset(assetRef: AssetReference, chain: Chain): Promise<Asset> {
    return AssetInfoService.dereferenceAsset(assetRef, chain, this.workflow.fungibleTokens || [])
  }

  setProvider(chainOrStart: ChainOrStart, provider: EIP1193Provider, nonForkedProvider?: EIP1193Provider): void {
    this.providers.set(chainOrStart, provider)
    nonForkedProvider && this.nonForkedProviders.set(chainOrStart, nonForkedProvider)
    const chainMap = this.stepHelpers.get(chainOrStart)
    if (chainMap) {
      for (const helper of chainMap.values()) {
        helper.setProvider(provider)
      }
    }
  }
  getProvider(chainOrStart: ChainOrStart): EIP1193Provider {
    const rv = this.providers.get(chainOrStart)
    assert(rv)
    return rv
  }

  getNonForkedProvider(chainOrStart: ChainOrStart): EIP1193Provider | undefined {
    return this.nonForkedProviders.get(chainOrStart)
  }

  setTransactionExecutor(chainOrStart: ChainOrStart, executor: EvmTransactionExecutor): void {
    this.executors.set(chainOrStart, executor)
  }

  getTransactionExecutor(chainOrStart: ChainOrStart) {
    return this.executors.get(chainOrStart)
  }

  async getRunner(userAddress: string, args?: Arguments, isDebug?: boolean): Promise<IWorkflowRunner> {
    // TODO can this be parallelized?
    const startChainProvider = this.getProvider('start-chain')
    const startChain = await getChainFromProvider(startChainProvider)
    let appliedInstance = this.applyArguments(true, args)
    const remittances = await appliedInstance.getRemittances()
    appliedInstance = appliedInstance.applyArguments(false, remittances)
    const firstNodeStepId = this.getStartStepId()
    const sc = translateChain(startChain)
    const runnerAddress = appliedInstance.getWorkflow().runnerAddresses?.[sc as Chain] || ADDRESS_ZERO
    const encoded = await appliedInstance.encodeSegment(firstNodeStepId, 'start-chain', userAddress, runnerAddress, !!isDebug)
    const addAssetInfo = await appliedInstance.getAddAssetInfo(userAddress)
    return new WorkflowRunner(this, encoded, startChain, addAssetInfo, !!isDebug)
  }

  private getStartStepId() {
    return this.workflow.startStepId || this.steps[0].stepId
  }

  private async getAddAssetTokenInfo(userAddress: string, provider: EIP1193Provider): Promise<Map<string, Erc20Info>> {
    const symbols = new Set<string>()

    const startChainSegmentIds = new Set(this.getReachableSet(this.getStartStepId()))
    for (const step of this.steps as Step[]) {
      assert(step.stepId)
      if (startChainSegmentIds.has(step.stepId)) {
        if (step.type === 'add-asset') {
          assert(typeof step.asset !== 'string')
          if (step.asset.type !== 'native') {
            symbols.add(step.asset.symbol)
          }
        } else {
          const helper = this.getStepHelper('start-chain', step.type)
          const assetAmounts = await helper.getAddAssetInfo(step)
          for (const assetAmount of assetAmounts) {
            if (typeof assetAmount.asset !== 'string' && assetAmount.asset.type !== 'native') {
              symbols.add(assetAmount.asset.symbol)
            }
          }
        }
      }
    }
    const rv = new Map<string, Erc20Info>()
    if (symbols.size === 0) {
      return rv
    }
    const chain = await this.resolveChain('start-chain')
    const frontDoorAddress = await this.getFrontDoorAddressForChain(chain)
    const symbolsArray = Array.from(symbols)
    const c = translateChain(chain)
    const promises = symbolsArray.map(symbol => this.getErc20InfoForSymbol(userAddress, c, provider, frontDoorAddress, symbol))
    const results = await Promise.all(promises)
    for (let i = 0; i < symbolsArray.length; ++i) {
      rv.set(symbolsArray[i], results[i])
    }
    return rv
  }

  // get balance, allowance, and required allowance for an ERC20 token
  private async getErc20InfoForSymbol(
    userAddress: string,
    chain: Chain,
    provider: EIP1193Provider,
    frontDoorAddress: string,
    symbol: string
  ): Promise<Erc20Info> {
    const token = await AssetInfoService.getFungibleToken(symbol, this.workflow.fungibleTokens || [])
    const { address, decimals } = token?.chains[chain] || {}
    assert(address && decimals)
    const erc20 = IERC20__factory.connect(address, getEthersProvider(provider))
    const [allowance, balance] = await Promise.all([erc20.allowance(userAddress, frontDoorAddress), erc20.balanceOf(userAddress)])
    return {
      balance: new Big(balance.toString()),
      currentAllowance: new Big(allowance.toString()),
      requiredAllowance: new Big(0),
      decimals,
    }
  }

  @Memoize()
  private getRemittanceInfoForStep(step: Step): Promise<RemittanceInfo | null> {
    const helper = this.getStepHelper('start-chain', step.type)
    return helper.getRemittance(step)
  }

  private async getAddAssetAmountsMap() {
    type Amounts = { absolute: Big; percent: number }
    const amountsMap = new MapWithDefault<string, Amounts>(() => ({ absolute: Big(0), percent: 0 }))
    const startChainSegmentIds = new Set(this.getReachableSet(this.getStartStepId()))

    for (const step of this.steps as Step[]) {
      assert(step.stepId)
      if (!startChainSegmentIds.has(step.stepId)) {
        continue
      }
      if (step.type === 'add-asset') {
        assert(typeof step.asset !== 'string')
        const key = step.asset.type === 'native' ? '__native__' : step.asset.symbol
        const amounts = amountsMap.getWithDefault(key)
        if (typeof step.amount === 'string' && step.amount.endsWith('%')) {
          amounts.percent += parseFloat(step.amount.slice(0, step.amount.length - 1))
        } else {
          amounts.absolute = amounts.absolute.plus(step.amount.toString())
        }
      } else {
        const helper = this.getStepHelper('start-chain', step.type)
        const assetAmounts = await helper.getAddAssetInfo(step)
        for (const assetAmount of assetAmounts) {
          if (typeof assetAmount.asset !== 'string') {
            const key = assetAmount.asset.type === 'native' ? '__native__' : assetAmount.asset.symbol
            const amounts = amountsMap.getWithDefault(key)
            if (typeof assetAmount.amount === 'string' && assetAmount.amount.endsWith('%')) {
              amounts.percent += parseFloat(assetAmount.amount.slice(0, assetAmount.amount.length - 1))
            } else {
              amounts.absolute = amounts.absolute.plus(assetAmount.amount.toString())
            }
          }
        }
      }
    }
    return amountsMap
  }

  private async getAddAssetInfo(userAddress: string): Promise<AddAssetInfo> {
    const startChainProvider = this.getProvider('start-chain')
    const erc20Info = await this.getAddAssetTokenInfo(userAddress, startChainProvider)

    const rv: AddAssetInfo = {
      native: new Big(0),
      erc20s: new Map<string, Erc20Info>(),
    }

    const amountsMap = await this.getAddAssetAmountsMap()

    for (const [symbol, amounts] of amountsMap) {
      if (amounts.percent > 100) {
        // TODO this needs to be a validation error
        const assetStr = symbol === '__native__' ? 'native' : symbol
        throw new Error(`add-asset steps for '${assetStr}' are > 100%`)
      }

      let totalRequired = amounts.absolute
      if (amounts.percent !== 0) {
        let balance = new Big(0)
        if (symbol === '__native__') {
          const b = await startChainProvider.request({
            method: 'eth_getBalance',
            params: [userAddress, 'latest'],
          })
          balance = new Big(b as string)
        } else {
          const x = erc20Info.get(symbol)
          assert(x)
          balance = x.balance
        }
        if (balance.lt(amounts.absolute)) {
          throw new Error('user does not have enough native for add-asset step(s)')
        }
        const remaining = balance.minus(amounts.absolute)
        const relativeAmount = remaining.mul(amounts.percent / 100)
        totalRequired = amounts.absolute.plus(relativeAmount)
      }
      if (symbol === '__native__') {
        rv.native = totalRequired.mul(TEN_BIG.pow(18))
      } else {
        const x = erc20Info.get(symbol)
        assert(x)
        x.requiredAllowance = totalRequired.mul(TEN_BIG.pow(x.decimals))
        rv.erc20s.set(symbol, x)
      }
    }

    return rv
  }

  getWorkflow(): ReadonlyDeep<Workflow> {
    return this.workflow
  }

  getChains(): ChainOrStart[] {
    const chains = new Set<ChainOrStart>()
    const segments = this.getWorkflowSegments()
    for (const segment of segments) {
      for (const chain of segment.chains) {
        chains.add(chain)
      }
    }
    return Array.from(chains)
  }

  validateArguments(args?: Arguments) {
    const params = this.workflow.parameters
    const problems = [] as WorkflowArgumentProblem[]
    const unseenParams = new Set<string>()
    const mapParamNameToSchema = new Map<string, ZodType<any>>()
    if (params) {
      for (const param of params) {
        mapParamNameToSchema.set(param.name, getParameterSchema(param.type))
        unseenParams.add(param.name)
      }
    }
    if (args) {
      for (const argName in args) {
        const arg = args[argName]
        unseenParams.delete(argName)
        const zodType = mapParamNameToSchema.get(argName)
        if (!zodType) {
          problems.push({
            type: WorkflowArgumentProblemType.MissingParameter,
            argumentName: argName,
            message: `Argument '${argName}' is not declared in workflow.parameters`,
          })
        } else {
          const parseResult = zodType.safeParse(arg)
          if (!parseResult.success) {
            problems.push({
              type: WorkflowArgumentProblemType.SchemaError,
              message: parseResult.error.message,
              argumentName: argName,
              parameterName: argName,
              zodError: parseResult.error,
            })
          }
        }
      }
    }
    unseenParams.forEach(unseenParamName =>
      problems.push({
        type: WorkflowArgumentProblemType.MissingArgument,
        parameterName: unseenParamName,
        message: `An argument was not provided for parameter '${unseenParamName}'`,
      })
    )
    if (problems.length) {
      throw new WorkflowArgumentError(problems)
    }
  }

  // TODO probably don't need to instantiate WorkflowInstance here
  private applyArguments(ignoreInternalParams: boolean, args: Arguments = {}): WorkflowInstance {
    // validation only works after setting providers
    try {
      const rv = new WorkflowInstance(cloneDeep(this.workflow), { skipValidation: true })
      rv.providers = new Map(this.providers)
      rv.nonForkedProviders = new Map(this.nonForkedProviders)
      this.validateWorkflowSteps()
      this.validateParameters()
      const allParams = rv.findAllParameterReferences()
      for (const [paramName, paths] of allParams) {
        if (ignoreInternalParams && paramName.startsWith('remittances.')) {
          continue
        }
        const argValue = args[paramName]
        if (argValue === undefined) {
          throw new Error(`Argument '${paramName}' is not provided`)
        }
        for (const path of paths) {
          assert(path.length > 0)
          const step = rv.getStep(path[0])
          let obj = step as Record<string, any>
          for (let i = 1; i < path.length - 1; ++i) {
            obj = obj[path[i]]
          }
          obj[path[path.length - 1]] = argValue
        }
      }
      delete rv.workflow.parameters
      return rv
    } catch (e) {
      logger.debug('applyArguments', e)
      throw e
    }
  }

  @Memoize()
  async getRemittances(): Promise<Record<string, AssetAmount | Amount | AssetReference>> {
    const rv: Record<string, AssetAmount | Amount | AssetReference> = {}
    const segments = this.getWorkflowSegments()
    for (const segment of segments) {
      for (const segmentChain of segment.chains) {
        for (const stepId of segment.stepIds) {
          const step = this.getStep(stepId)
          const helper = this.getStepHelper(segmentChain, step.type)
          const remittance = await helper.getRemittance(step)
          if (remittance) {
            rv[`remittances.${segmentChain}.${stepId}`] = remittance
            rv[`remittances.${stepId}`] = remittance
            rv[`remittances.${segmentChain}.${stepId}.amount`] = remittance.amount
            rv[`remittances.${stepId}.amount`] = remittance.amount
            rv[`remittances.${segmentChain}.${stepId}.asset`] = remittance.asset
            rv[`remittances.${stepId}.asset`] = remittance.asset
          }
        }
      }
    }
    return rv
  }

  findAllParameterReferences(includeRemittances = true): Map<string, ParameterPath[]> {
    const mapParamNameToPaths = new MapWithDefault<string, ParameterPath[]>(() => [])
    for (const step of this.steps) {
      this.visitStepValues(step, [step.stepId], (obj, path) => {
        if (typeof obj === 'string') {
          const matchResult = PARAMETER_REFERENCE_REGEXP.exec(obj)
          if (matchResult) {
            const paramName = matchResult[1]
            if (includeRemittances || !paramName.startsWith('remittances.')) {
              mapParamNameToPaths.getWithDefault(paramName).push(path)
            }
          }
        }
      })
    }
    return mapParamNameToPaths
  }

  private validateParameters() {
    const problems = [] as WorkflowValidationProblem[]

    const mapDeclaredParamNameToType = new Map<string, string>()
    if (this.workflow.parameters) {
      for (const param of this.workflow.parameters) {
        mapDeclaredParamNameToType.set(param.name, param.type)
      }
    }

    for (const key of this.getRemittanceKeys()) {
      if (key.endsWith('.amount')) {
        mapDeclaredParamNameToType.set(key, 'amount')
      } else if (key.endsWith('.asset')) {
        mapDeclaredParamNameToType.set(key, 'asset')
      } else {
        mapDeclaredParamNameToType.set(key, 'asset-amount')
      }
    }
    const remittances = this.getRemittanceKeys()

    // get all parameter references in the steps
    const mapNameToPaths = this.findAllParameterReferences()
    for (const [paramName, valuePaths] of mapNameToPaths) {
      if (remittances.has(paramName)) {
        continue
      }
      const declaredParamType = mapDeclaredParamNameToType.get(paramName)
      for (const valuePath of valuePaths) {
        const stepId = valuePath[0]
        const step = this.getStep(stepId)
        assert(step)
        if (!declaredParamType) {
          problems.push({
            type: WorkflowValidationProblemType.UndeclaredParameter,
            stepId,
            step,
            // prettier-ignore
            message: `Parameter '${paramName}' at path '${valuePath.join('.')}' was not declared in workflow.parameters`,
          })
          continue
        }
        const typeAtPath = this.getTypeAtPath(valuePath)

        if (declaredParamType !== typeAtPath) {
          problems.push({
            type: WorkflowValidationProblemType.ParameterTypeMismatch,
            stepId,
            step,
            // prettier-ignore
            message: `parameter type '${declaredParamType}' for parameter '${paramName}' does not match expected type '${typeAtPath}' at path '${valuePath.join('.')}'`,
          })
        }
      }
    }

    if (problems.length > 0) {
      throw new WorkflowValidationError(problems)
    }
  }

  getTypeAtPath(path: string[]): string {
    const step = this.getStep(path[0])
    assert(step)
    const schema = stepSchema._def.optionsMap.get(step.type)
    assert(schema)
    const property = WorkflowInstance.getZodChild(schema, path.slice(1)) as any
    assert(property._def._parameterTypeName)
    return property._def._parameterTypeName as ParameterType
  }

  private validateWorkflowSteps(): Map<string, StepNode> {
    const mapStepIdToStep = new Map<string, StepNode>()
    const problems = [] as WorkflowValidationProblem[]

    // ensure all stepIds are unique, and fill in missing stepIds
    for (let i = 0; i < this.steps.length; ++i) {
      const step = this.steps[i]
      if (mapStepIdToStep.has(step.stepId)) {
        problems.push({
          type: WorkflowValidationProblemType.NonUniqueStepId,
          stepId: step.stepId,
          step,
          message: `stepId '${step.stepId}' of stepId ${i} is not unique`,
        })
      }
      mapStepIdToStep.set(step.stepId, step as StepNode)
    }

    // validate  nextStepIds
    for (let i = 0; i < this.steps.length; ++i) {
      const step = this.steps[i]

      if (step.nextStepId !== WORKFLOW_END_STEP_ID && !mapStepIdToStep.has(step.nextStepId)) {
        problems.push({
          type: WorkflowValidationProblemType.NonExistentNextStepId,
          stepId: step.stepId,
          step,
          message: `nextStepId '${step.nextStepId}' of step '${step.stepId}' does not exist`,
        })
        problems.push()
      }
    }
    if (problems.length > 0) {
      throw new WorkflowValidationError(problems)
    }
    return mapStepIdToStep
  }

  // can be called before arguments are applied,
  // but may miss some if asset-refs are still not dereferenced

  private async validateAssetRefs(startChain: Chain): Promise<void> {
    // not sure if there is a better way to find all assetRefs in a workflow
    const assetRefs: { path: string[]; assetRef: AssetReference }[] = []
    const getAssetRefPaths = (path: string[], obj: any) => {
      for (const key in obj) {
        const childObj = obj[key]
        // not sure if this is necessary, but this is intended to be a lightweight pre-check before running it through the schema
        let looksLikeAssetRef =
          childObj['type'] === 'native' || (childObj['type'] === 'fungible-token' && typeof childObj['symbol'] === 'string')
        if (looksLikeAssetRef) {
          const parseResult = assetReferenceSchema.safeParse(childObj)
          if (parseResult.success) {
            assetRefs.push({ path: path.concat([key]), assetRef: parseResult.data })
          } else {
            looksLikeAssetRef = false
          }
        }
        if (!looksLikeAssetRef && typeof childObj === 'object') {
          getAssetRefPaths(path.concat(key), childObj)
        }
      }
      return assetRefs
    }

    const mapStepIdToStep = this.getStepMap()
    const segments = this.getWorkflowSegments()
    const problems: AssetNotFoundProblem[] = []
    for (const segment of segments) {
      for (const segmentChain of segment.chains) {
        const chain = segmentChain === 'start-chain' ? startChain : segmentChain
        for (const stepId of segment.stepIds) {
          const step = mapStepIdToStep.get(stepId)
          assert(step)
          assetRefs.splice(0, assetRefs.length)
          const assetRefPaths = getAssetRefPaths([], step)
          for (const ref of assetRefPaths) {
            try {
              await AssetInfoService.dereferenceAsset(ref.assetRef, chain, this.workflow.fungibleTokens || [])
            } catch (e) {
              if (e instanceof AssetNotFoundError) {
                const pathPrefix = [stepId]
                const currentProblems = e.problems.map(it => new AssetNotFoundProblem(it.symbol, it.chain, pathPrefix.concat(ref.path)))
                problems.splice(problems.length, 0, ...currentProblems)
              } else {
                throw e
              }
            }
          }
        }
      }
    }
    if (problems.length > 0) {
      throw new AssetNotFoundError(problems)
    }
  }

  @Memoize()
  private getReachableSet(stepId: string): string[] {
    const mapStepIdToNextStepInfo = this.getNextStepsMap()
    const seenIds = new Set<string>()
    const toVisitIds = new Set<string>()
    let currentStepId = stepId
    for (;;) {
      if (!seenIds.has(currentStepId)) {
        seenIds.add(currentStepId)
      }
      const nextInfo = mapStepIdToNextStepInfo.get(currentStepId)
      if (nextInfo) {
        for (const otherStepId of nextInfo.sameChain) {
          if (!seenIds.has(otherStepId)) {
            toVisitIds.add(otherStepId)
          }
        }
      }
      if (toVisitIds.size === 0) {
        break
      }
      // this looks hackish but just treating set also as a queue and dequeueing here
      for (const nextToVisit of toVisitIds) {
        currentStepId = nextToVisit
        break
      }
      toVisitIds.delete(currentStepId)
    }
    return Array.from(seenIds)
  }

  @Memoize()
  private getNextStepsMap() {
    const mapStepIdToNextStepInfo = new Map<string, NextSteps>()
    for (const step of this.steps) {
      const helper = createStepHelper(step.type, this)
      const result = helper.getPossibleNextSteps(step as any)
      if (result) {
        mapStepIdToNextStepInfo.set(step.stepId, result)
      }
    }
    return mapStepIdToNextStepInfo
  }

  // chains are valid candidates for parameters, so
  // if called before args are applied, args may show up instead of chains
  @Memoize()
  getWorkflowSegments(): WorkflowSegment[] {
    if (this.steps.length === 0) {
      return []
    }
    const mapStepIdToChains = new MapWithDefault<string, Set<ChainOrStart>>(() => new Set())
    const startStepIds = new Set<string>()
    mapStepIdToChains.getWithDefault(this.getStartStepId()).add('start-chain')
    startStepIds.add(this.getStartStepId())
    for (const step of this.steps) {
      const helper = createStepHelper(step.type, this)
      const result = helper.getPossibleNextSteps(step as any)
      if (result && result.differentChains) {
        for (const diffChain of result.differentChains) {
          startStepIds.add(diffChain.stepId)
          mapStepIdToChains.getWithDefault(diffChain.stepId).add(diffChain.chain)
        }
      }
    }

    const rv: WorkflowSegment[] = []
    for (const stepId of startStepIds) {
      rv.push({
        chains: Array.from(mapStepIdToChains.getWithDefault(stepId)),
        stepIds: this.getReachableSet(stepId),
      })
    }
    return rv
  }

  @Memoize()
  async resolveChain(chainOrStart: ChainOrStart): Promise<Chain> {
    if (chainOrStart === 'start-chain') {
      const startChainProvider = this.getProvider('start-chain')
      return getChainFromProvider(startChainProvider)
    }
    return chainOrStart
  }

  async encodeSegment(
    startStepId: string,
    chainOrStart: ChainOrStart,
    userAddress: string,
    runnerAddress: string,
    isDebug: boolean
  ): Promise<EncodedWorkflow> {
    const reachable = this.getReachableSet(startStepId)

    const mapStepIdToIndex = new Map<string, number>()
    for (let i = 0; i < reachable.length; ++i) {
      mapStepIdToIndex.set(reachable[i], i)
    }
    mapStepIdToIndex.set(WORKFLOW_END_STEP_ID, -1)

    const chain = await this.resolveChain(chainOrStart)
    if (chainOrStart === 'start-chain') {
      const startChainProvider = this.getProvider('start-chain')
      const startChainProviderNonForked = this.getNonForkedProvider('start-chain')
      this.setProvider(chain, startChainProvider, startChainProviderNonForked)
    }

    ////////////////////////////////

    const encodeStepPromises = reachable.map(async stepId => {
      const step = this.getStep(stepId)
      let nextStepIndex = step.nextStepId === WORKFLOW_END_STEP_ID ? -1 : mapStepIdToIndex.get(step.nextStepId)
      if (!nextStepIndex) {
        nextStepIndex = -1
      }
      const helper = this.getStepHelper(chainOrStart, step.type)
      helper.setProvider(this.getProvider(chain))
      const encoded = await helper.encodeWorkflowStep({ chain, stepConfig: step as any, userAddress, mapStepIdToIndex, isDebug })
      // if the step gave an index, use it
      if (encoded.nextStepIndex !== undefined) {
        return encoded as EvmWorkflowStep
      }
      return {
        ...encoded,
        nextStepIndex,
      }
    })
    const beforeAftersPromise = this.encodeBeforeAfter(chainOrStart, userAddress, mapStepIdToIndex, isDebug, reachable)
    const encodedSteps: EvmWorkflowStep[] = await Promise.all(encodeStepPromises)
    const { beforeAll, afterAll } = await beforeAftersPromise
    return {
      workflowRunnerAddress: runnerAddress,
      steps: encodedSteps,
      beforeAll,
      afterAll,
    }
  }

  async encodeBeforeAfter(
    chainOrStart: ChainOrStart,
    userAddress: string,
    mapStepIdToIndex: Map<string, number>,
    isDebug: boolean,
    reachable: string[]
  ) {
    // for each step type, build a list of all steps of that type
    const mapStepTypeIdToSteps = new MapWithDefault<string, StepNode[]>(() => [])
    for (const stepId of reachable) {
      const step = this.getStep(stepId)
      mapStepTypeIdToSteps.getWithDefault(step.type).push(step)
    }
    const chain = await this.resolveChain(chainOrStart)

    // for each step type, ask the helper to encode the before/after
    const promises = Array.from(mapStepTypeIdToSteps.entries()).map(async ([stepType, stepConfigs]) => {
      const helper = this.getStepHelper(chainOrStart, stepType)
      helper.setProvider(this.getProvider(chainOrStart))
      const encodingContext: MultiStepEncodingContext<any> = {
        chain,
        stepConfigs,
        userAddress,
        mapStepIdToIndex,
        isDebug,
      }
      return helper.getBeforeAfterAll(encodingContext)
    })
    const beforeAfterResults = await Promise.all(promises)

    // filter out nulls
    const beforeAfters = beforeAfterResults.filter(x => x !== null) as BeforeAfterResult[]

    // rearrange into beforeAll and afterAll, eliminating nulls
    const beforeAll = beforeAfters.map(x => x.beforeAll).filter(x => x !== null) as EvmBeforeAfter[]
    const afterAll = beforeAfters.map(x => x.afterAll).filter(x => x !== null) as EvmBeforeAfter[]
    return { beforeAll, afterAll }
  }

  static async getChainIdFromProvider(provider: Provider): Promise<number> {
    const network = await provider.getNetwork()
    return network.chainId
  }

  @Memoize()
  async isTestNet(): Promise<boolean> {
    const provider = getEthersProvider(this.getProvider('start-chain'))
    const chainId = await WorkflowInstance.getChainIdFromProvider(provider)
    switch (chainId) {
      case 1:
      case 31337:
      case 56:
      case 42161:
      case 137:
      case 43114:
      case 10:
      case 250:
        return false
      case 5:
      case 97:
      case 421613:
      case 80001:
      case 43113:
      case 420:
      case 4002:
        return true

      default:
        throw new Error('unknown chainId: ' + chainId)
    }
  }

  @Memoize()
  async getFrontDoorAddressForChain(chain: Chain): Promise<string> {
    let address: string | undefined = undefined
    const isTestnet = await this.isTestNet()
    if (chain === 'hardhat' || chain === 'local') {
      address = frontDoorAddresses['local']
    } else {
      // if (isTestnet) {
      //   address = frontDoorAddresses[chain + 'Goerli']
      // } else {
      address = frontDoorAddresses[chain]
      // }
    }
    if (address === undefined) {
      throw new Error(`freemarket is not deployed on ${chain} ${isTestnet ? 'testnet' : 'mainnet'}`)
    }
    return address
  }

  private getRemittanceKeys(): Set<string> {
    const rv = new Set<string>()
    const segments = this.getWorkflowSegments()
    for (const segment of segments) {
      for (const segmentChain of segment.chains) {
        for (const stepId of segment.stepIds) {
          const step = this.getStep(stepId)
          const helper = this.getStepHelper(segmentChain, step.type)
          if (helper.requiresRemittance(step)) {
            rv.add(`remittances.${segmentChain}.${stepId}`)
            rv.add(`remittances.${stepId}`)
            rv.add(`remittances.${segmentChain}.${stepId}.amount`)
            rv.add(`remittances.${stepId}.amount`)
            rv.add(`remittances.${segmentChain}.${stepId}.asset`)
            rv.add(`remittances.${stepId}.asset`)
          }
        }
      }
    }
    return rv
  }

  private addMissingStepIds(steps: StepBase[]): StepNode[] {
    // add missing stepIds
    for (let i = 0; i < steps.length; ++i) {
      if (!steps[i].stepId) {
        steps[i].stepId = WorkflowInstance.formatStepId(i)
      }
    }

    // add missing nextStepIds
    for (let i = 0; i < steps.length; ++i) {
      if (!steps[i].nextStepId) {
        const isLastNode = i === steps.length - 1
        if (isLastNode) {
          steps[i].nextStepId = WORKFLOW_END_STEP_ID
        } else {
          steps[i].nextStepId = steps[i + 1].stepId
        }
      }
    }
    return steps as StepNode[]
  }

  private static formatStepId(stepIndex: number): string {
    return `__step_${stepIndex}__`
  }

  private visitStepValues(stepObject: any, parentPath: string[], callback: VisitStepCallback) {
    for (const attrName in stepObject) {
      const child = stepObject[attrName]
      const childPath = parentPath.concat([attrName])
      if (typeof child === 'object') {
        this.visitStepValues(child, childPath, callback)
      } else {
        callback(child, childPath)
      }
    }
  }

  @Memoize()
  private getStepMap(): Map<string, StepNode> {
    const mapStepIdToStep = new Map<string, StepNode>()
    for (const step of this.steps) {
      mapStepIdToStep.set(step.stepId, step)
    }
    return mapStepIdToStep
  }

  @Memoize()
  private getStep(stepId: string): StepNode {
    const step = this.getStepMap().get(stepId)
    assert(step)
    return step
  }

  private static getZodChild(obj: ZodObject<any>, path: string[]): ZodType<any> {
    assert(path.length > 0)
    const objAsAny = obj as any
    const isParameterizableType = !!objAsAny._def._parameterTypeName
    const def = isParameterizableType ? objAsAny._def.options[0]._def : objAsAny._def
    const shape = def.shape()
    let child = shape[path[0]]
    if (child._def.innerType) {
      child = child._def.innerType
    }
    if (path.length === 1) {
      return child
    }
    return this.getZodChild(child, path.slice(1))
  }

  getStepHelper(chainOrStart: ChainOrStart, type: string): IStepHelper<any> {
    const chainMap = this.stepHelpers.getWithDefault(chainOrStart)
    let helper = chainMap.get(type)
    if (!helper) {
      helper = createStepHelper(type, this)
      const provider = this.providers.get(chainOrStart)
      if (provider) {
        helper.setProvider(provider)
      }
      chainMap.set(type, helper)
    }
    return helper
  }
}
