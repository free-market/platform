import * as React from 'react'
import { PlatformInfo, StepInfo } from '@freemarket/step-sdk'
import AaveIcon from './AaveIcon'
import AssetReferenceView from '@freemarket/step-sdk/build/tslib/helpers/AssetReferenceView'

function AaveSummary(props: any) {
  return (
    <span style={{ ...props.labelStyle }}>
      {props.operation}&nbsp;
      <span style={{ ...props.infoStyle }}>
        {props.step.amount.toString()}
        &nbsp;
        <AssetReferenceView assetRef={props.step.asset} />
      </span>
    </span>
  )
}

export const platformInfo: PlatformInfo = {
  name: 'Aave',
  description: "Web3's most popular lending protocol",
  icon: AaveIcon,
  categories: ['Lending', 'Yield'],

  stepInfos: [
    {
      stepType: 'aave-supply',
      nodeType: 'stepNode',
      name: 'Aave Supply',
      description: 'Deposit an asset into Aave',
      icon: AaveIcon,
      operation: 'Supply',
      summary: p => <AaveSummary {...p} operation="Supply" />,
      platformName: 'Aave',
    },
    {
      stepType: 'aave-withdrawal',
      nodeType: 'stepNode',
      name: 'Aave Withdrawal',
      description: 'Withdrawal an asset from Aave',
      icon: AaveIcon,
      operation: 'Withdrawal',
      comingSoon: true,
      summary: p => <AaveSummary {...p} operation="Withdrawal" />,
      platformName: 'Aave',
    },
    {
      stepType: 'aave-borrow',
      nodeType: 'stepNode',
      name: 'Aave Borrow',
      description: 'Borrow an asset from Aave',
      icon: AaveIcon,
      operation: 'Borrow',
      comingSoon: true,
      summary: p => <AaveSummary {...p} operation="Borrow" />,
      platformName: 'Aave',
    },
    {
      stepType: 'aave-repay',
      nodeType: 'stepNode',
      name: 'Aave Repay',
      description: 'Repay an asset borrowed from Aave',
      icon: AaveIcon,
      operation: 'Repay',
      comingSoon: true,
      summary: p => <AaveSummary {...p} operation="Repay" />,
      platformName: 'Aave',
    },
    {
      stepType: 'aave-flash-loan',
      nodeType: 'stepNode',
      name: 'Aave Flash Loan',
      description: 'Perform an Aave flash loan',
      icon: AaveIcon,
      operation: 'Flash Loan',
      comingSoon: true,
      summary: p => <AaveSummary {...p} operation="Flash Loan" />,
      platformName: 'Aave',
    },
  ],
}