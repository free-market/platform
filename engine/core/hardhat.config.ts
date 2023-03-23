import { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'
import 'hardhat-deploy'
import '@nomiclabs/hardhat-ethers'
import '@nomicfoundation/hardhat-chai-matchers'
// import 'hardhat-deploy-ethers'
import os from 'os'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: path.join(os.homedir(), '.env') })

const config: HardhatUserConfig = {
  solidity: '0.8.18',

  networks: {
    ethereumGoerli: {
      chainId: 5,
      url: 'https://rpc.ankr.com/eth_goerli',
      accounts: {
        mnemonic: process.env.WALLET_MNEMONIC,
      },
    },
  },

  // for hardhat-deployer
  namedAccounts: {
    deployer: 0,
    otherUser: 1,
  },
}

export default config