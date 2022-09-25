import { getTokenAsset, getAccountAsset } from '../assetInfo'
import { MoneyAmount, WorkflowStep, WorkflowStepInfo } from '../types'

export type MangoTokenSymbol = 'SOL' | 'USDC'

export interface MangoStep extends WorkflowStep {
  // todo
}

const MANGO_EXCHANGE_NAME = 'mangno'

const MANGO_DEPOSIT_INFO: WorkflowStepInfo = {
  stepId: 'mango.deposit',
  name: 'Mango Decentralized Exchange',
  blockchains: ['Ethereum'],
  gasEstimate: '4',
  exchangeFee: '1',
  description: 'Automated market maker for swapping SPL Tokens.',
}

const MANGO_WITHDRAWAL_INFO: WorkflowStepInfo = {
  stepId: 'mango.withdrawal',
  name: 'Mango Decentralized Exchange',
  blockchains: ['Ethereum'],
  gasEstimate: '4',
  exchangeFee: '1',
  description: 'Automated market maker for swapping SPL Tokens.',
}

interface MangoBuilderArg {
  symbol: MangoTokenSymbol
  amount: MoneyAmount
}

export function mangoDeposit(arg: MangoBuilderArg): WorkflowStep {
  const rv: MangoStep = {
    stepId: 'mango.deposit',
    inputAmount: arg.amount,
    inputAsset: getTokenAsset('Solana', arg.symbol),
    outputAsset: getAccountAsset('Solana', MANGO_EXCHANGE_NAME, arg.symbol),
    info: MANGO_DEPOSIT_INFO,
  }
  return rv
}

export function mangoWithdrawal(arg: MangoBuilderArg): WorkflowStep {
  const rv: MangoStep = {
    stepId: 'mango.withdrawal',
    inputAmount: arg.amount,
    inputAsset: getAccountAsset('Solana', MANGO_EXCHANGE_NAME, arg.symbol),
    outputAsset: getTokenAsset('Solana', arg.symbol),
    info: MANGO_WITHDRAWAL_INFO,
  }
  return rv
}
