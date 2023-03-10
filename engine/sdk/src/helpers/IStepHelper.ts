import type { EIP1193Provider } from 'eip1193-provider'
import type { EncodedWorkflowStep } from '../EncodedWorkflow'
import type { AssetAmount, Chain, StepBase, Workflow } from '../model'
import type { IWorkflowRunner } from '../runner/IWorkflowRunner'
// import WorkflowRunner from './runner/WorkflowRunner'

export interface BridgeTarget {
  chain: Chain
  firstStepId: string
}

export interface NextSteps {
  sameChain: string[]
  differentChains?: [
    {
      chain: Chain
      stepId: string
    }
  ]
}

export interface IStepHelper<T extends StepBase> {
  getRemittance(stepConfig: T): Promise<AssetAmount | null>
  getBridgeTarget(stepConfig: T): BridgeTarget | null
  encodeWorkflowStep(chain: Chain, stepConfig: T): Promise<EncodedWorkflowStep>
  getPossibleNextSteps(stepConfig: T): NextSteps | null
  setProvider(provider: EIP1193Provider): void
}
