async function getEth(addr) {
  s = await web3.eth.getBalance(addr)
  return web3.utils.fromWei(s)
}

module.exports = {
  getEth,
  WETH_ADDRESS: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  USDC_ADDRESS: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  USDT_ADDRESS: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  CURVE: {
    THREEPOOL_ADDRESS: '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7',
    TRICRYPTO_ADDRESS: '0x80466c64868E1ab14a1Ddf27A676C3fcBE638Fe5',
  },
}
