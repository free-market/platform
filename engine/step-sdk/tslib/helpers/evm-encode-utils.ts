import { ethers } from 'ethers'
const abiCoder = ethers.utils.defaultAbiCoder
import createKeccakHash from 'keccak'
import type { EvmWorkflow } from '@freemarket/core'

export const AssetSchema = `
  tuple(
    uint8 assetType,
    address assetAddress
  )
`
// const AssetArrayAbi = `${AssetAbi}[]`
// // const x = abiCoder.encode([AssetArrayAbi], [[]])
export const InputAssetSchema = `
  tuple(
    bool sourceIsCaller,
    bool amountIsPercent,
    ${AssetSchema} asset,
    uint256 amount
  )`

const WorkflowStepSchema = `
  tuple(
    uint16 stepTypeId,
    address stepAddress,
    ${InputAssetSchema}[] inputAssets,
    bytes argData,
    int16 nextStepIndex
  )
`
const BeforeAfterSchema = `
  tuple(
    uint16 stepTypeId,
    address stepAddress,
    bytes argData
  )
`

const WorkflowSchema = `
  tuple(
    address workflowRunnerAddress,
    ${WorkflowStepSchema}[] steps,
    ${BeforeAfterSchema}[] beforeAll,
    ${BeforeAfterSchema}[] afterAll
  )
`

const BridgePayloadSchema = `
  tuple(
    address userAddress,
    uint256 nonce,
    ${WorkflowSchema} workflow
  )
`

export function toChecksumAddress(address: number | string) {
  let addr = typeof address === 'number' ? address.toString(16) : address.toLowerCase().replace('0x', '')
  addr = addr.padStart(40, '0')
  const hash = createKeccakHash('keccak256').update(addr).digest('hex')
  let ret = '0x'

  for (let i = 0; i < addr.length; i++) {
    if (parseInt(hash[i], 16) >= 8) {
      ret += addr[i].toUpperCase()
    } else {
      ret += addr[i]
    }
  }

  return ret
}

export function randomHex(length: number) {
  let output = '0x'
  for (let i = 0; i < length * 2; ++i) {
    output += Math.floor(Math.random() * 16).toString(16)
  }
  return output
}

export function getBridgePayload(userAddress: string, workflow: EvmWorkflow) {
  const nonce = randomHex(32)
  const encodedWorkflow = abiCoder.encode([BridgePayloadSchema], [{ userAddress, nonce, workflow }])
  return {
    encodedWorkflow,
    nonce,
  }
}
