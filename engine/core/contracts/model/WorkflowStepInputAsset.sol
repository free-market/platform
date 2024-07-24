// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import './Asset.sol';

// an input asset to a WorkflowStep
struct WorkflowStepInputAsset {
  // if true, the source of the asset is the caller of the workflow, otherwise it is the output of some previous step
  bool sourceIsCaller;
  // if true 'amount' is treated as a percent, with 3 decimals of precision (100000 represents 100%)
  bool amountIsPercent;
  // the input asset
  Asset asset;
  // the amount of the input asset
  uint256 amount;
}
