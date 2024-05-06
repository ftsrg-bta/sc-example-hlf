/* SPDX-License-Identifier: Apache-2.0 */
package hu.bme.mit.ftsrg.chaincode.assettransfer;

import static hu.bme.mit.ftsrg.chaincode.assettransfer.Serializer.*;

import java.util.ArrayList;
import java.util.List;
import org.hyperledger.fabric.contract.Context;
import org.hyperledger.fabric.contract.ContractInterface;
import org.hyperledger.fabric.contract.annotation.Contact;
import org.hyperledger.fabric.contract.annotation.Contract;
import org.hyperledger.fabric.contract.annotation.Default;
import org.hyperledger.fabric.contract.annotation.Info;
import org.hyperledger.fabric.contract.annotation.License;
import org.hyperledger.fabric.contract.annotation.Transaction;
import org.hyperledger.fabric.contract.annotation.Transaction.TYPE;
import org.hyperledger.fabric.shim.ChaincodeException;
import org.hyperledger.fabric.shim.ledger.KeyValue;
import org.hyperledger.fabric.shim.ledger.QueryResultsIterator;
import org.tinylog.Logger;

@Contract(
    name = "thesis-portal",
    info =
        @Info(
            title = "Thesis Portal",
            description = "Simple chaincode for a thesis portal",
            version = "0.1.0",
            license = @License(name = "Apache-2.0"),
            contact =
                @Contact(
                    email = "john.doe@example.com",
                    name = "John Doe",
                    url = "http://example.com")))
@Default
public final class AssetTransfer implements ContractInterface {

  @Transaction(name = "Ping")
  public String ping(Context ignoredCtx) {
    return "pong";
  }

  @Transaction(name = "InitLedger")
  public void initLedger(Context ctx) {
    var assets =
        List.of(
            Asset.builder()
                .ID("asset1")
                .Color("blue")
                .Size(5)
                .Owner("Tomoko")
                .AppraisedValue(300)
                .build(),
            Asset.builder()
                .ID("asset2")
                .Color("red")
                .Size(5)
                .Owner("Brad")
                .AppraisedValue(400)
                .build(),
            Asset.builder()
                .ID("asset3")
                .Color("green")
                .Size(10)
                .Owner("Jin Soo")
                .AppraisedValue(500)
                .build(),
            Asset.builder()
                .ID("asset4")
                .Color("yellow")
                .Size(10)
                .Owner("Max")
                .AppraisedValue(600)
                .build(),
            Asset.builder()
                .ID("asset5")
                .Color("black")
                .Size(15)
                .Owner("Adriana")
                .AppraisedValue(700)
                .build(),
            Asset.builder()
                .ID("asset6")
                .Color("white")
                .Size(15)
                .Owner("Michel")
                .AppraisedValue(800)
                .build());

    for (var asset : assets) {
      ctx.getStub().putStringState(asset.ID(), serialize(asset));
      Logger.info("Asset {} initialized", asset.ID());
    }
  }

  @Transaction(name = "CreateAsset")
  public String createAsset(
      Context ctx, String id, String color, int size, String owner, int appraisedValue) {
    assertNotExists(ctx, id);

    var asset =
        Asset.builder()
            .ID(id)
            .Color(color)
            .Size(size)
            .Owner(owner)
            .AppraisedValue(appraisedValue)
            .build();
    ctx.getStub().putStringState(asset.ID(), serialize(asset));

    return serialize(asset);
  }

  @Transaction(name = "ReadAsset", intent = TYPE.EVALUATE)
  public String readAsset(Context ctx, String id) {
    return serialize(assetByID(ctx, id));
  }

  @Transaction(name = "UpdateAsset")
  public String updateAsset(
      Context ctx, String id, String color, int size, String owner, int appraisedValue) {
    assertExists(ctx, id);

    var updatedAsset =
        Asset.builder()
            .ID(id)
            .Color(color)
            .Size(size)
            .Owner(owner)
            .AppraisedValue(appraisedValue)
            .build();
    ctx.getStub().putStringState(id, serialize(updatedAsset));

    return serialize(updatedAsset);
  }

  @Transaction(name = "DeleteAsset")
  public String deleteAsset(Context ctx, String id) {
    assertExists(ctx, id);

    ctx.getStub().delState(id);

    return id;
  }

  @Transaction(name = "TransferAsset")
  public String transferAsset(Context ctx, String id, String newOwner) {
    assertExists(ctx, id);

    Asset asset = assetByID(ctx, id);
    final String oldOwner = asset.Owner();
    asset = asset.toBuilder().Owner(newOwner).build();

    ctx.getStub().putStringState(id, serialize(asset));
    return oldOwner;
  }

  @Transaction(name = "GetAllAssets", intent = TYPE.EVALUATE)
  public String getAllAssets(Context ctx) {
    var answer = new ArrayList<Asset>();

    QueryResultsIterator<KeyValue> results = ctx.getStub().getStateByRange("", "");
    for (KeyValue result : results) {
      Asset asset = deserialize(result.getStringValue(), Asset.class);
      Logger.info(asset);
      answer.add(asset);
    }

    return serialize(answer);
  }

  @Transaction(name = "AssetExists", intent = TYPE.EVALUATE)
  public boolean assetExists(Context ctx, String id) {
    String assetJson = ctx.getStub().getStringState(id);
    return assetJson != null && !assetJson.isEmpty();
  }

  private void assertNotExists(Context ctx, String id) {
    if (assetExists(ctx, id)) {
      throw new ChaincodeException(String.format("The asset %s already exists", id));
    }
  }

  private void assertExists(Context ctx, String id) {
    if (!assetExists(ctx, id)) {
      throw new ChaincodeException(String.format("The asset %s does not exist", id));
    }
  }

  private Asset assetByID(Context ctx, String id) {
    assertExists(ctx, id);

    return deserialize(ctx.getStub().getStringState(id), Asset.class);
  }
}
