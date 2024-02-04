import test from 'ava'
import type { Workflow } from '../../model'
import { type AssetReference } from '@freemarket/core'
import { assert, throwsAsync } from '../../private/test-utils'
import { WorkflowInstance } from '../WorkflowInstance'
import { addAssetStep } from './common'

// any workflow will do
const workflow: Workflow = {
  steps: [addAssetStep],
}

test('resolves fungible token symbols from the default symbols list', async t => {
  const instance = new WorkflowInstance(workflow)
  const usdcAssetRef: AssetReference = {
    type: 'fungible-token',
    symbol: 'USDC',
  }
  const asset = await instance.dereferenceAsset(usdcAssetRef, 'ethereum')
  assert(t, asset.type === 'fungible-token')
  t.is(asset.symbol, 'USDC')
  const address = asset.chains['ethereum']?.address
  t.assert(address !== undefined)
})

const fakeTokenAddress = '0x1111111111111111111111111111111111111111'
const fakeTokenSymbol = 'ABCXYZ'
const workflowWithCustomToken: Workflow = {
  fungibleTokens: [
    {
      type: 'fungible-token',
      symbol: fakeTokenSymbol,
      chains: {
        ethereum: {
          type: 'erc20',
          address: fakeTokenAddress,
          decimals: 18,
        },
      },
    },
  ],
  steps: [addAssetStep],
}

test('resolves fungible token from workflow.fungibleTokens', async t => {
  const instance = new WorkflowInstance(workflowWithCustomToken)
  const fakeAssetRef: AssetReference = {
    type: 'fungible-token',
    symbol: fakeTokenSymbol,
  }
  const asset = await instance.dereferenceAsset(fakeAssetRef, 'ethereum')
  assert(t, asset.type === 'fungible-token')
  t.is(asset.symbol, fakeTokenSymbol)
  const address = asset.chains['ethereum']?.address
  t.is(address, fakeTokenAddress)
})

test("throws when it can't find a symbol", async t => {
  const instance = new WorkflowInstance(workflow)
  const fakeAssetRef: AssetReference = {
    type: 'fungible-token',
    symbol: fakeTokenSymbol,
  }
  await t.throwsAsync(() => instance.dereferenceAsset(fakeAssetRef, 'ethereum'))
})

test("throws when it can't find a symbol for a chain", async t => {
  const instance = new WorkflowInstance(workflowWithCustomToken)
  const fakeAssetRef: AssetReference = {
    type: 'fungible-token',
    symbol: fakeTokenSymbol,
  }
  await throwsAsync(t, async () => {
    await instance.dereferenceAsset(fakeAssetRef, 'fantom')
  })
})

test('dereferences a native', async t => {
  const instance = new WorkflowInstance(workflowWithCustomToken)
  const nativeAssetRef: AssetReference = {
    type: 'native',
  }
  const asset = await instance.dereferenceAsset(nativeAssetRef, 'ethereum')
  t.is(asset.type, 'native')
  t.is(asset.symbol, 'ETH')
})

test("validates a workflow's symbols", async t => {
  const runner = new WorkflowInstance(workflowWithCustomToken)
  void runner['validateAssetRefs']('ethereum')
  t.pass()
})

test('throws when a workflow has unknown symbols', async t => {
  const workflowWithBadAsset: Workflow = {
    steps: [
      {
        stepId: 'addAsset',
        type: 'add-asset',
        asset: {
          type: 'fungible-token',
          symbol: fakeTokenSymbol,
        },
        amount: 1,
      },
    ],
  }
  const runner = new WorkflowInstance(workflowWithBadAsset)
  await throwsAsync(t, async () => {
    await runner['validateAssetRefs']('fantom')
  })
})
