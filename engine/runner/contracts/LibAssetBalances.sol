// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import '@openzeppelin/contracts/utils/Strings.sol';
import '@freemarket/core/contracts/model/AssetAmount.sol';
import './LibAsset.sol';

using Strings for uint256;

library LibAssetBalances {
  uint8 constant MAX_ENTRIES = 25;

  struct AssetEntry {
    uint256 asset;
    uint256 balance;
    uint256 previousCredit;
    uint256 previousDebit;
  }

  struct AssetBalances {
    AssetEntry[MAX_ENTRIES] entries;
    uint8 end;
  }

  function getAssetBalance(AssetBalances memory entrySet, Asset memory asset) internal pure returns (uint256) {
    return getAssetEntry(entrySet, asset).balance;
  }

  function getPreviousCredit(AssetBalances memory entrySet, Asset memory asset) internal pure returns (uint256) {
    return getAssetEntry(entrySet, asset).previousCredit;
  }

  function getPreviousDebit(AssetBalances memory entrySet, Asset memory asset) internal pure returns (uint256) {
    return getAssetEntry(entrySet, asset).previousDebit;
  }

  function getAssetEntry(AssetBalances memory entrySet, Asset memory asset) internal pure returns (AssetEntry memory) {
    AssetEntry[MAX_ENTRIES] memory entries = entrySet.entries;
    uint256 assetAsInt = LibAsset.encodeAsset(asset);
    for (uint16 i = 0; i < entrySet.end; ++i) {
      if (entries[i].asset == assetAsInt) {
        return entries[i];
      }
    }
    return AssetEntry(assetAsInt, 0, 0, 0);
  }

  function credit(AssetBalances memory entrySet, uint256 assetAsInt, uint256 amount) internal pure {
    if (amount > 0) {
      uint256 index = getAssetIndex(entrySet, assetAsInt);
      uint256 newBalance = entrySet.entries[index].balance + amount;
      // updateBalance(entrySet, index, newBalance);
      entrySet.entries[index].balance = newBalance;
      entrySet.entries[index].previousCredit = amount;
    }
  }

  function debit(AssetBalances memory entrySet, uint256 assetAsInt, uint256 amount) internal pure {
    if (amount > 0) {
      uint256 index = getAssetIndex(entrySet, assetAsInt);
      uint256 newBalance = entrySet.entries[index].balance - amount;
      // updateBalance(entrySet, index, newBalance);
      entrySet.entries[index].balance = newBalance;
      entrySet.entries[index].previousDebit = amount;
    }
  }

  function credit(AssetBalances memory entrySet, Asset memory asset, uint256 amount) internal pure {
    credit(entrySet, LibAsset.encodeAsset(asset), amount);
  }

  function debit(AssetBalances memory entrySet, Asset memory asset, uint256 amount) internal pure {
    debit(entrySet, LibAsset.encodeAsset(asset), amount);
  }

  function revertArithmetic(string memory op, uint256 assetAsInt, uint256 a, uint256 b) internal pure {
    Asset memory asset = LibAsset.decodeAsset(assetAsInt);
    revert(
      string.concat(
        op,
        ' assetType=',
        uint256(asset.assetType).toString(),
        ' assetAddress=',
        uint256(uint160(asset.assetAddress)).toHexString(),
        ' values ',
        a.toString(),
        ', ',
        b.toString()
      )
    );
  }

  function getAssetIndex(AssetBalances memory entrySet, Asset memory asset) internal pure returns (uint256) {
    uint256 assetAsInt = LibAsset.encodeAsset(asset);
    return getAssetIndex(entrySet, assetAsInt);
  }

  function getAssetIndex(AssetBalances memory entrySet, uint256 assetAsInt) internal pure returns (uint256) {
    for (uint256 i = 0; i < entrySet.end; ++i) {
      if (entrySet.entries[i].asset == assetAsInt) {
        return i;
      }
    }
    require(entrySet.end < MAX_ENTRIES, 'too many token balances');
    entrySet.entries[entrySet.end] = AssetEntry(assetAsInt, 0, 0, 0);
    return entrySet.end++;
  }

  function getAssetCount(AssetBalances memory entrySet) internal pure returns (uint8) {
    return entrySet.end;
  }

  function getAssetAt(AssetBalances memory entrySet, uint8 index) internal pure returns (AssetAmount memory) {
    require(index < entrySet.end, 'index out of bounds while accessing asset balances');
    Asset memory a = LibAsset.decodeAsset(entrySet.entries[index].asset);
    return AssetAmount(a, entrySet.entries[index].balance);
  }
}
