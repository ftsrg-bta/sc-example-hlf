/* SPDX-License-Identifier: Apache-2.0 */

import { Context, Contract, Info, Param, Returns, Transaction } from 'fabric-contract-api'
import stringify from 'json-stringify-deterministic'
import sortKeys from 'sort-keys-recursive'

import { Asset } from './asset'

@Info({ title: 'AssetTransfer', description: 'Simple asset transfer chaincode' })
export class AssetTransfer extends Contract {
  constructor () {
    super('AssetTransfer')
  }

  @Transaction(false)
  async Ping (): Promise<string> {
    return 'pong'
  }

  @Transaction()
  async InitLedger (ctx: Context): Promise<void> {
    const assets: Asset[] = [
      {
        ID: 'asset1',
        Color: 'blue',
        Size: 5,
        Owner: 'Tomoko',
        AppraisedValue: 300
      },
      {
        ID: 'asset2',
        Color: 'red',
        Size: 5,
        Owner: 'Brad',
        AppraisedValue: 400
      },
      {
        ID: 'asset3',
        Color: 'green',
        Size: 10,
        Owner: 'Jin Soo',
        AppraisedValue: 500
      },
      {
        ID: 'asset4',
        Color: 'yellow',
        Size: 10,
        Owner: 'Max',
        AppraisedValue: 600
      },
      {
        ID: 'asset5',
        Color: 'black',
        Size: 15,
        Owner: 'Adriana',
        AppraisedValue: 700
      },
      {
        ID: 'asset6',
        Color: 'white',
        Size: 15,
        Owner: 'Michel',
        AppraisedValue: 800
      }
    ]

    for (const asset of assets) {
      await ctx.stub.putState(asset.ID, this.serialize(asset))
      console.info(`Asset ${asset.ID} initialized`)
    }
  }

  @Transaction()
  @Returns('Asset')
  async CreateAsset (ctx: Context, ID: string, Color: string, Size: number, Owner: string, AppraisedValue: number): Promise<Asset> {
    await this.assertNotExists(ctx, ID)

    const asset: Asset = { ID, Color, Size, Owner, AppraisedValue }
    await ctx.stub.putState(ID, this.serialize(asset))

    return asset
  }

  @Transaction(false)
  @Returns('Asset')
  @Param('ID', 'string')
  async ReadAsset (ctx: Context, ID: string): Promise<Asset> {
    await this.assertExists(ctx, ID)

    return this.deserialize(await ctx.stub.getState(ID))
  }

  @Transaction()
  @Returns('Asset')
  async UpdateAsset (ctx: Context, ID: string, Color: string, Size: number, Owner: string, AppraisedValue: number): Promise<Asset> {
    await this.assertExists(ctx, ID)

    const asset: Asset = { ID, Color, Size, Owner, AppraisedValue }
    await ctx.stub.putState(ID, this.serialize(asset))

    return asset
  }

  @Transaction()
  @Returns('string')
  async DeleteAsset (ctx: Context, ID: string): Promise<string> {
    await this.assertExists(ctx, ID)

    await ctx.stub.deleteState(ID)

    return ID
  }

  @Transaction()
  @Returns('string')
  async TransferAsset (ctx: Context, ID: string, NewOwner: string): Promise<string> {
    await this.assertExists(ctx, ID)

    const asset: Asset = await this.ReadAsset(ctx, ID)
    const oldOwner: string = asset.Owner
    asset.Owner = NewOwner

    await ctx.stub.putState(ID, this.serialize(asset))
    return oldOwner
  }

  @Transaction(false)
  @Returns('string')
  async GetAllAssets (ctx: Context): Promise<Asset[]> {
    const results: Asset[] = []

    const iterator = await ctx.stub.getStateByRange('', '')
    let result = await iterator.next()
    while (!result.done) {
      results.push(this.deserialize(result.value.value))
      result = await iterator.next()
    }

    return results
  }

  @Transaction(false)
  @Returns('boolean')
  async AssetExists (ctx: Context, id: string): Promise<boolean> {
    const data: Uint8Array = await ctx.stub.getState(id)
    return data !== undefined && data.length > 0
  }

  private async assertNotExists (ctx: Context, id: string): Promise<void> {
    if (await this.AssetExists(ctx, id)) {
      throw new Error(`Asset ${id} already exists`)
    }
  }

  private async assertExists (ctx: Context, id: string): Promise<void> {
    if (!(await this.AssetExists(ctx, id))) {
      throw new Error(`Asset ${id} does not exist`)
    }
  }

  private serialize (asset: Asset): Buffer {
    return Buffer.from(stringify(sortKeys(asset)))
  }

  private deserialize (data: Uint8Array): Asset {
    return JSON.parse(data.toString()) as Asset
  }
}
