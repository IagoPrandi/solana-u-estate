import { Buffer } from "buffer";
import { PublicKey } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import {
  decodeUsufructPositionAccount,
  listingSellerMemcmp,
  propertyOwnerMemcmp,
  usufructHolderMemcmp,
} from "./accounts";
import {
  ACCOUNT_SPACE,
  LISTING_OFFSETS,
  PROPERTY_OFFSETS,
  USUFRUCT_POSITION_OFFSETS,
} from "./offsets";

const property = new PublicKey("11111111111111111111111111111113");
const holder = new PublicKey("11111111111111111111111111111114");

describe("Solana account helpers", () => {
  it("decodes UsufructPosition accounts from the shared offsets", () => {
    const data = Buffer.alloc(ACCOUNT_SPACE.usufructPosition);
    property.toBuffer().copy(data, USUFRUCT_POSITION_OFFSETS.property);
    data.writeBigUInt64LE(7n, USUFRUCT_POSITION_OFFSETS.propertyId);
    holder.toBuffer().copy(data, USUFRUCT_POSITION_OFFSETS.holder);
    data.writeBigUInt64LE(200_000n, USUFRUCT_POSITION_OFFSETS.linkedValueUnits);
    data.writeUInt16LE(2000, USUFRUCT_POSITION_OFFSETS.linkedValueBps);
    data[USUFRUCT_POSITION_OFFSETS.active] = 1;
    data[USUFRUCT_POSITION_OFFSETS.bump] = 255;

    const decoded = decodeUsufructPositionAccount(holder, data);

    expect(decoded.property.toBase58()).toBe(property.toBase58());
    expect(decoded.propertyId).toBe(7n);
    expect(decoded.holder.toBase58()).toBe(holder.toBase58());
    expect(decoded.linkedValueUnits).toBe(200_000n);
    expect(decoded.linkedValueBps).toBe(2000);
    expect(decoded.active).toBe(true);
    expect(decoded.bump).toBe(255);
  });

  it("builds memcmp filters from the same frontend offsets", () => {
    expect(propertyOwnerMemcmp(holder).memcmp.offset).toBe(PROPERTY_OFFSETS.owner);
    expect(listingSellerMemcmp(holder).memcmp.offset).toBe(LISTING_OFFSETS.seller);
    expect(usufructHolderMemcmp(holder).memcmp.offset).toBe(
      USUFRUCT_POSITION_OFFSETS.holder,
    );
  });
});
