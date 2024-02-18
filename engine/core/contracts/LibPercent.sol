// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

library LibPercent {
  /// Percents have 3 decimals of precision, so:
  /// 100% is represented as 100000 (100.000%)
  /// 1% is represented as 1000 (1.000%)
  /// 1 basis point (1/100th of a percent or 0.010% ) is 10
  /// the smallest possible percentage is 1/10th of a basis point, or 1 'decibip'
  /// @param value the value to take a percentage of
  /// @param percent the percentage in decibips
  function percentageOf(uint256 value, uint256 percent) internal pure returns (uint256) {
    require(0 <= percent && percent <= 100000, 'percent must be between 0 and 100000');
    uint256 x = value * percent;
    return x / 100000;
  }
}
