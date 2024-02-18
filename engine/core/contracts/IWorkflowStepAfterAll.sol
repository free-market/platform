// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

/// @title The interface between WorkflowRunner and each Step implementation when the step needs
/// to do something after the steps in the workflow are done executing.
/// @author Marty Saxton
/// @notice This interface is optional.
interface IWorkflowStepAfterAll {
  /// @notice called by WorkflowRunner to execute some logic after the workflow ends.
  /// @param argData Step specific arguments in ABI encoding
  /// @param userAddress The address of the user executing the workflow
  function afterAll(bytes calldata argData, address userAddress) external payable;
}
