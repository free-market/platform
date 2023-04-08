/* eslint-disable no-console */
import { expect } from 'chai'
import hardhat from 'hardhat'
import {
  ConfigManager,
  ConfigManager__factory,
  FrontDoor,
  FrontDoor__factory,
  WorkflowRunner,
  WorkflowRunner__factory,
} from '../typechain-types'
const { ethers, deployments, getNamedAccounts } = hardhat

const setup = deployments.createFixture(async () => {
  const deploymentResult = await deployments.fixture('ConfigManager')
  const users = await getNamedAccounts()
  const frontDoor = <FrontDoor>await ethers.getContract('FrontDoor')
  const signer = await ethers.getSigner(users.deployer)
  const configManager = ConfigManager__factory.connect(deploymentResult.ConfigManager.address, signer)
  const contracts = {
    frontDoor,
    configManager,
  }
  return {
    contracts,
    users,
    provider: contracts.frontDoor.provider,
  }
})

describe('WorkflowRunner', async () => {
  it('deploys', async () => {
    const {
      contracts: { frontDoor, configManager },
    } = await setup()
    const frontDoorStorageAddress = await frontDoor.eternalStorageAddress()
    const configManagerStorageAddress = await configManager.eternalStorageAddress()
    expect(configManagerStorageAddress).is.eq(frontDoorStorageAddress)
  })

  it('manages step addresses', async () => {
    const {
      contracts: { frontDoor, configManager },
    } = await setup()
    let count = await configManager.getStepCount()
    expect(count).to.eq(0)
    const someAddress = '0x9ef1dcd8af14ed2bdd16fef0ae2775e2ee8ff604'
    const response = await configManager.setStepAddress(1000, someAddress)
    await response.wait()
    count = await configManager.getStepCount()
    expect(count).to.eq(1)
    const stepInfo = await configManager.getStepInfoAt(0)
    expect(stepInfo.stepTypeId).to.eq(1000)
    expect(stepInfo.latest.toLowerCase()).to.eq(someAddress)
  })
})