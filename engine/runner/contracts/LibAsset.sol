// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import '@freemarket/core/contracts/model/Asset.sol';

library LibAsset {
  function encodeAsset(Asset memory asset) internal pure returns (uint256) {
    return encodeAsset(asset.assetType, asset.assetAddress);
  }

  function encodeAsset(AssetType assetType, address assetAddress) internal pure returns (uint256) {
    uint160 a1 = uint160(assetAddress);
    uint256 a2 = uint256(a1);
    uint256 a3 = a2 << 16;
    uint256 t1 = uint256(assetType);
    uint256 a4 = a3 | t1;
    return a4;
    // return (uint256(uint160(assetAddress)) << 16) & uint256(assetType);
  }

  function decodeAsset(uint256 assetInt) internal pure returns (Asset memory) {
    AssetType assetType = AssetType(uint16(assetInt));
    address addr = address(uint160(assetInt >> 16));
    return Asset(assetType, addr);
  }
}
