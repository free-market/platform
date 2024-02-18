// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import '@freemarket/core/contracts/model/AssetType.sol';
import '@freemarket/core/contracts/model/WorkflowStepResult.sol';

struct StepResultBuilder {
  uint256 inputIndex;
  uint256 outputIndex;
  uint256 outputToCallerIndex;
  WorkflowStepResult result;
}

library LibStepResultBuilder {
  function create(uint256 inputAssetCount, uint256 outputAssetCount) internal pure returns (StepResultBuilder memory) {
    AssetAmount[] memory inputAssetAmounts = new AssetAmount[](inputAssetCount);
    AssetAmount[] memory ouputAssetAmounts = new AssetAmount[](outputAssetCount);
    AssetAmount[] memory ouputAssetAmountsToCaller = new AssetAmount[](0);

    return StepResultBuilder(0, 0, 0, WorkflowStepResult(inputAssetAmounts, ouputAssetAmounts, ouputAssetAmountsToCaller, -2, -1));
  }

  function create(
    uint256 inputAssetCount,
    uint256 outputAssetCount,
    uint256 outputAssetToCallerCount
  ) internal pure returns (StepResultBuilder memory) {
    AssetAmount[] memory inputAssetAmounts = new AssetAmount[](inputAssetCount);
    AssetAmount[] memory ouputAssetAmounts = new AssetAmount[](outputAssetCount);
    AssetAmount[] memory ouputAssetToCallerAmounts = new AssetAmount[](outputAssetToCallerCount);

    return StepResultBuilder(0, 0, 0, WorkflowStepResult(inputAssetAmounts, ouputAssetAmounts, ouputAssetToCallerAmounts, -2, -1));
  }

  function addInputToken(
    StepResultBuilder memory builder,
    address tokenAddress,
    uint256 amount
  ) internal pure returns (StepResultBuilder memory) {
    builder.result.inputAssetAmounts[builder.inputIndex++] = AssetAmount(Asset(AssetType.ERC20, tokenAddress), amount);
    return builder;
  }

  function addInputAssetAmount(
    StepResultBuilder memory builder,
    AssetAmount memory assetAmount
  ) internal pure returns (StepResultBuilder memory) {
    builder.result.inputAssetAmounts[builder.inputIndex++] = assetAmount;
    return builder;
  }

  function addOutputToken(
    StepResultBuilder memory builder,
    address tokenAddress,
    uint256 amount
  ) internal pure returns (StepResultBuilder memory) {
    builder.result.outputAssetAmounts[builder.outputIndex++] = AssetAmount(Asset(AssetType.ERC20, tokenAddress), amount);
    return builder;
  }

  function addInputNative(StepResultBuilder memory builder, uint256 amount) internal pure returns (StepResultBuilder memory) {
    builder.result.inputAssetAmounts[builder.inputIndex++] = AssetAmount(Asset(AssetType.Native, address(0)), amount);
    return builder;
  }

  function addOutputNative(StepResultBuilder memory builder, uint256 amount) internal pure returns (StepResultBuilder memory) {
    builder.result.outputAssetAmounts[builder.outputIndex++] = AssetAmount(Asset(AssetType.Native, address(0)), amount);
    return builder;
  }

  function addOutputAssetAmount(
    StepResultBuilder memory builder,
    AssetAmount memory assetAmount
  ) internal pure returns (StepResultBuilder memory) {
    builder.result.outputAssetAmounts[builder.outputIndex++] = assetAmount;
    return builder;
  }

  function addOutputAssetAmountToCaller(
    StepResultBuilder memory builder,
    AssetAmount memory assetAmount
  ) internal pure returns (StepResultBuilder memory) {
    builder.result.outputAssetAmountsToCaller[builder.outputToCallerIndex++] = assetAmount;
    return builder;
  }

  function setNextStepIndex(StepResultBuilder memory builder, int16 nextStepIndex) internal pure returns (StepResultBuilder memory) {
    builder.result.nextStepIndex = nextStepIndex;
    return builder;
  }

  function setFee(StepResultBuilder memory builder, int24 feeInDeciBips) internal pure returns (StepResultBuilder memory) {
    builder.result.fee = feeInDeciBips;
    return builder;
  }
}
