// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import './IStargateComposer.sol';
import './IStargateReceiver.sol';
import './WorkflowContinuingStep.sol';
import 'hardhat/console.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@freemarket/core/contracts/model/Asset.sol';
import '@freemarket/core/contracts/model/AssetAmount.sol';
import '@freemarket/core/contracts/model/BridgePayload.sol';
import '@freemarket/core/contracts/IWorkflowRunner.sol';
import '@freemarket/step-sdk/contracts/LibErc20.sol';
import '@freemarket/step-sdk/contracts/LibStepResultBuilder.sol';

using LibStepResultBuilder for StepResultBuilder;
using LibErc20 for IERC20;

// StargateBridgeAction specific arguments
struct StargateBridgeActionArgs {
  //  addr of the StargateSwapAction on the target chain.
  address dstActionAddress;
  // addr of the user (caller on the source chain)
  address dstUserAddress;
  // stargate destination chain
  uint16 dstChainId;
  // stargate source pool (implies source asset)
  uint256 srcPoolId;
  // stargate destination pool (implies destination asset)
  uint256 dstPoolId;
  // gas to execute workflow continuation on destination chain
  uint256 dstGasForCall;
  // amount of native asset to send to dstUserAddress
  uint256 dstNativeAmount;
  // minimum amount of output asset (else the tx on the source chain will revert)
  uint256 minAmountOut;
  // if true, minAmountOut passed to stargate
  bool minAmountOutIsPercent;
  // the abi-encoded workflow that will execute on the destination chain
  bytes continuationWorkflow;
  // the value used to correlate the source chain transaction with the target chain transaction
  uint256 nonce;
  // whether the continuation workflow should be included in the event
  bool includeContinuationWorkflowInEvent;
}

contract StargateBridgeAction is WorkflowContinuingStep, IStargateReceiver {
  address public immutable frontDoorAddress;
  address public immutable stargateComposerAddress;

  /// @notice This event is emitted on the destination chain when Stargate invokes our sgReceive method
  /// @param tokenAddress the address of the erc20 that was transfered from the source chain to this chain.abi
  /// @param bridgePayload the payload that was sent along with the erc20.
  event SgReceiveCalled(address tokenAddress, uint256 amount, BridgePayload bridgePayload);
  event StargateBridgeParamsEvent(
    uint256 nativeAmount,
    uint256 assetAmount,
    address dstActionAddress,
    uint16 dstChainId,
    uint256 srcPoolId,
    uint256 dstPoolId,
    uint256 dstGasForCall,
    uint256 dstNativeAmount,
    uint256 minAmountOut,
    bytes continuationWorkflow
  );

  constructor(address _frontDoorAddress, address _stargateComposerAddress) {
    frontDoorAddress = _frontDoorAddress;
    stargateComposerAddress = _stargateComposerAddress;
  }

  //  need to gather things up into a struct to prevent 'Stack too deep'
  struct Locals {
    uint256 lengthPrefix;
    StargateBridgeActionArgs args;
    bytes dstActionAddressEncoded;
    uint256 minAmountOut;
    AssetAmount nativeInputAsset;
    AssetAmount erc20InputAsset;
  }

  function execute(
    AssetAmount[] calldata inputAssetAmounts,
    bytes calldata argData,
    address userAddress
  ) public payable returns (WorkflowStepResult memory) {
    Locals memory locals;
    require(inputAssetAmounts.length == 2, 'there must be 2 input assets');
    if (inputAssetAmounts[0].asset.assetType == AssetType.Native) {
      require(inputAssetAmounts[1].asset.assetType == AssetType.ERC20, 'one input asset must be an ERC20');
      locals.nativeInputAsset = inputAssetAmounts[0];
      locals.erc20InputAsset = inputAssetAmounts[1];
    } else if (inputAssetAmounts[1].asset.assetType == AssetType.Native) {
      require(inputAssetAmounts[0].asset.assetType == AssetType.ERC20, 'one input asset must be an ERC20');
      locals.nativeInputAsset = inputAssetAmounts[1];
      locals.erc20InputAsset = inputAssetAmounts[0];
    } else {
      revert('one input asset must be native');
    }
    require(
      inputAssetAmounts[0].asset.assetType == AssetType.ERC20 || inputAssetAmounts[0].asset.assetType == AssetType.Native,
      'the input asset must be an ERC20 or Native'
    );

    // approve sg to take the token
    if (inputAssetAmounts[0].asset.assetType == AssetType.ERC20) {
      approveErc20(inputAssetAmounts[0].asset.assetAddress, inputAssetAmounts[0].amount);
    }

    console.log('decoding');
    locals.args = abi.decode(argData, (StargateBridgeActionArgs));
    console.log('decoded');

    locals.dstActionAddressEncoded = abi.encodePacked(locals.args.dstActionAddress);
    if (locals.args.minAmountOutIsPercent) {
      locals.minAmountOut = (inputAssetAmounts[0].amount * locals.args.minAmountOut) / 100_000;
    } else {
      locals.minAmountOut = locals.args.minAmountOut;
    }
    console.log('aaa');

    emit StargateBridgeParamsEvent(
      locals.nativeInputAsset.amount, // native amount
      locals.erc20InputAsset.amount, // token amount
      locals.args.dstActionAddress, // dest addr for money and sgReceive
      locals.args.dstChainId,
      locals.args.srcPoolId,
      locals.args.dstPoolId,
      locals.args.dstGasForCall,
      locals.args.dstNativeAmount,
      locals.minAmountOut,
      locals.args.continuationWorkflow
    );

    IStargateComposer(stargateComposerAddress).swap{value: locals.nativeInputAsset.amount}(
      locals.args.dstChainId,
      locals.args.srcPoolId,
      locals.args.dstPoolId,
      payable(userAddress), // refundAddreess
      locals.erc20InputAsset.amount,
      locals.minAmountOut,
      IStargateRouter.lzTxObj(locals.args.dstGasForCall, locals.args.dstNativeAmount, abi.encodePacked(locals.args.dstUserAddress)),
      locals.dstActionAddressEncoded,
      locals.args.continuationWorkflow
    );
    if (locals.args.continuationWorkflow.length > 0) {
      AssetAmount[] memory expectedAssets = new AssetAmount[](1);
      expectedAssets[0] = locals.erc20InputAsset;
      expectedAssets[0].amount = locals.minAmountOut;
      bytes memory continuationFlow = locals.args.includeContinuationWorkflowInEvent ? locals.args.continuationWorkflow : new bytes(0);
      emit WorkflowBridged('stargate-bridge', locals.args.dstChainId, locals.args.nonce, expectedAssets, continuationFlow);
    }

    return WorkflowStepResult(inputAssetAmounts, new AssetAmount[](0), new AssetAmount[](0), -2, -1);
  }

  function approveErc20(address tokenAddress, uint256 amount) internal {
    IERC20 inputToken = IERC20(tokenAddress);
    inputToken.safeApprove(stargateComposerAddress, amount);
  }

  function sgReceive(
    uint16, // the remote chainId sending the tokens
    bytes memory, // the remote Bridge address
    uint256, // stargate nonce, use unknown
    address tokenAddress, // the token contract on the local chain
    uint256 amount, // the qty of local token contract tokens
    bytes memory payload
  ) external {
    require(msg.sender == stargateComposerAddress, 'only Stargate is permitted to call sgReceive');
    BridgePayload memory bridgePayload = abi.decode(payload, (BridgePayload));
    emit SgReceiveCalled(tokenAddress, amount, bridgePayload);
    IERC20 startingToken = IERC20(tokenAddress);
    SafeERC20.safeIncreaseAllowance(startingToken, frontDoorAddress, amount);
    AssetAmount[] memory startingAssets = new AssetAmount[](1);
    startingAssets[0] = AssetAmount(Asset(AssetType.ERC20, tokenAddress), amount);
    IWorkflowRunner runner = IWorkflowRunner(frontDoorAddress);
    bool continuationSuccessful = false;
    // TODO set value when the bridged asset is native
    try runner.continueWorkflow(bridgePayload.userAddress, bridgePayload.nonce, bridgePayload.workflow, startingAssets) {
      // if the workflow succeeds, we're done
      emit ContinuationSuccess();
      continuationSuccessful = true;
    } catch Error(string memory reason) {
      emit ContinuationFailure(reason);
    } catch Panic(uint256 errorCode) {
      emit ContinuationFailure(errorCode);
    } catch (bytes memory reason) {
      emit ContinuationFailure(reason);
    }
    // if the workflow fails, we need to return the tokens to the user
    if (!continuationSuccessful) {
      SafeERC20.safeTransfer(startingToken, bridgePayload.userAddress, amount);
    }
  }
}
