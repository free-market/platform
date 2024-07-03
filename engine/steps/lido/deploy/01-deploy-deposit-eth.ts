import { DeployFunction } from 'hardhat-deploy/types'
import { deployStep } from '@freemarket/step-sdk/tslib/deploy-step'
import { STEP_TYPE_ID_LIDO_ETH_TO_STETH, MAINNET_STETH_ADDRESS } from '../tslib'

const func: DeployFunction = async function (hardhatRuntimeEnv) {
  return deployStep('DepositEthForStEthAction', STEP_TYPE_ID_LIDO_ETH_TO_STETH, hardhatRuntimeEnv, [MAINNET_STETH_ADDRESS])
}

func.tags = ['DepositEthForStEthAction']
func.dependencies = ['ConfigManager']

export default func
