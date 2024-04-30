import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import sinon, { SinonStubbedInstance } from 'sinon'

import { Context } from 'fabric-contract-api'
import { ChaincodeStub, ClientIdentity } from 'fabric-shim'
import stringify from 'json-stringify-deterministic'
import sortKeys from 'sort-keys-recursive'

import { AssetTransfer } from './asset-transfer'
import { Asset } from './asset'

chai.use(chaiAsPromised)

class ContextMock implements Context {
  stub: SinonStubbedInstance<ChaincodeStub>
  clientIdentity: SinonStubbedInstance<ClientIdentity>
  logging: {
    setLevel: (level: string) => void
    getLogger: (name?: string) => any
  }

  constructor() {
    this.stub = sinon.createStubInstance(ChaincodeStub)
    this.clientIdentity = sinon.createStubInstance(ClientIdentity)
    this.logging = {
      setLevel: sinon.stub(),
      getLogger: sinon.stub(),
    }
  }
}

const testAsset: Asset = {
  ID: 'asset1',
  Color: 'red',
  Size: 10,
  Owner: 'John',
  AppraisedValue: 1000
}

const existsError = 'Asset asset1 already exists'
const doesNotExistError = 'Asset asset1 does not exist'

describe('AssetTransfer', () => {
  let contract: AssetTransfer
  let ctx: ContextMock
  
  beforeEach(() => {
    contract = new AssetTransfer()
    ctx = new ContextMock()
  })

  describe('CreateAsset', () => {
    it('should create a new asset', async () => {
      await contract.CreateAsset(
        ctx,
        testAsset.ID,
        testAsset.Color,
        testAsset.Size,
        testAsset.Owner,
        testAsset.AppraisedValue
      )
  
      expect(ctx.stub.putState.calledOnceWithExactly(
        testAsset.ID,
        Buffer.from(stringify(sortKeys(testAsset))))
      ).to.be.true
    })

    it('should throw an error if the asset already exists', async () => {
      ctx.stub.getState.callsFake(async () => Promise.resolve(
        Buffer.from(stringify(sortKeys(testAsset)))
      ))

      const fail = () => contract.CreateAsset(
        ctx,
        testAsset.ID,
        testAsset.Color,
        testAsset.Size,
        testAsset.Owner,
        testAsset.AppraisedValue
      )

      await expect(fail()).to.eventually.be.rejectedWith(existsError)
    })
  })

  describe('ReadAsset', () => {
    it('should return existing asset', async () => {
      ctx.stub.getState.callsFake(async () => Promise.resolve(
        Buffer.from(stringify(sortKeys(testAsset)))
      ))
  
      const resp: Asset = await contract.ReadAsset(ctx, testAsset.ID)
  
      expect(stringify(sortKeys(resp))).to.be.eq(stringify(sortKeys(testAsset)))
    })

    it('should throw an error if the asset does not exist', async () => {
      const fail = () => contract.ReadAsset(ctx, testAsset.ID)

      await expect(fail()).to.eventually.be.rejectedWith(doesNotExistError)
    })
  })

  describe('UpdateAsset', () => {
    it('should return updated asset and write ledger', async () => {
      ctx.stub.getState.callsFake(async () => Promise.resolve(
        Buffer.from(stringify(sortKeys(testAsset)))
      ))
      const updatedAsset: Asset = {
        ...testAsset,
        AppraisedValue: testAsset.AppraisedValue + 100
      }
  
      const resp: Asset = await contract.UpdateAsset(
        ctx,
        updatedAsset.ID,
        updatedAsset.Color,
        updatedAsset.Size,
        updatedAsset.Owner,
        updatedAsset.AppraisedValue
      )

      expect(ctx.stub.putState.calledOnceWithExactly(
        updatedAsset.ID,
        Buffer.from(stringify(sortKeys(updatedAsset))))
      ).to.be.true
      expect(stringify(sortKeys(resp))).to.be.eq(stringify(sortKeys(updatedAsset)))
    })

    it('should throw an error if the asset does not exist', async () => {
      const fail = () => contract.UpdateAsset(
        ctx,
        testAsset.ID,
        testAsset.Color,
        testAsset.Size,
        testAsset.Owner,
        testAsset.AppraisedValue + 100
      )

      await expect(fail()).to.eventually.be.rejectedWith(doesNotExistError)
    })
  })

  describe('DeleteAsset', () => {
    it('should remove key from ledger and return ID', async () => {
      ctx.stub.getState.callsFake(async () => Promise.resolve(
        Buffer.from(stringify(sortKeys(testAsset)))
      ))
  
      const resp: string = await contract.DeleteAsset(ctx, testAsset.ID)
  
      expect(ctx.stub.deleteState.calledOnceWithExactly(
        testAsset.ID,
      )).to.be.true
      expect(resp).to.be.eq(testAsset.ID)
    })

    it('should throw an error if the asset does not exist', async () => {
      const fail = () => contract.DeleteAsset(ctx, testAsset.ID)

      await expect(fail()).to.eventually.be.rejectedWith(doesNotExistError)
    })
  })

  describe('TransferAsset', () => {
    it('should update ledger and return old owner', async () => {
      ctx.stub.getState.callsFake(async () => Promise.resolve(
        Buffer.from(stringify(sortKeys(testAsset)))
      ))
      const transferredAsset: Asset = {
        ...testAsset,
        Owner: 'Emily'
      }
  
      const resp: string = await contract.TransferAsset(
        ctx,
        transferredAsset.ID,
        transferredAsset.Owner
      )
  
      expect(ctx.stub.putState.calledOnceWithExactly(
        testAsset.ID,
        Buffer.from(stringify(sortKeys(transferredAsset)))
      )).to.be.true
      expect(resp).to.be.eq(testAsset.Owner)
    })

    it('should throw an error if the asset does not exist', async () => {
      const fail = () => contract.TransferAsset(
        ctx,
        testAsset.ID,
        'Emily',
      )

      await expect(fail()).to.eventually.be.rejectedWith(doesNotExistError)
    })
  })
})
