import type { EIP1193Provider } from 'eip1193-provider'
import type { IStepHelper } from '@freemarket/core'
import { ChainBranchHelper } from './ChainBranchHelper'

import type { ISDKWorkflowInstance } from '../runner/ISDKWorkflowInstance'
import { AaveSupplyHelper } from '@freemarket/aave'
import { AddAssetHelper } from '@freemarket/add-asset'
import { StargateBridgeHelper } from '@freemarket/stargate-bridge'

interface StepHelperConstructor {
  new (runner: ISDKWorkflowInstance, provider?: EIP1193Provider): IStepHelper<any>
}

const stepHelpersConstructors: Record<string, StepHelperConstructor> = {
  'aave-supply': AaveSupplyHelper,
  'add-asset': AddAssetHelper,
  'chain-branch': ChainBranchHelper,
  'stargate-bridge': StargateBridgeHelper,
}

export function createStepHelper(type: string, runner: ISDKWorkflowInstance) {
  const ctor = stepHelpersConstructors[type]
  if (ctor) {
    return new ctor(runner)
  }
  throw new Error('no helper for type: ' + type)
}