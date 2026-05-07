import { describe, expect, it } from "vitest";
import {
  ACCOUNT_SPACE,
  LISTING_OFFSETS,
  PROPERTY_OFFSETS,
  PROTOCOL_STATE_OFFSETS,
  USUFRUCT_POSITION_OFFSETS,
} from "./offsets";

describe("Solana account offsets", () => {
  it("matches the serialized Anchor account layouts used by getProgramAccounts", () => {
    expect(ACCOUNT_SPACE).toEqual({
      protocolState: 121,
      property: 300,
      usufructPosition: 124,
      listing: 266,
    });
    expect(PROTOCOL_STATE_OFFSETS.nextPropertyId).toBe(72);
    expect(PROPERTY_OFFSETS.owner).toBe(16);
    expect(PROPERTY_OFFSETS.status).toBe(266);
    expect(USUFRUCT_POSITION_OFFSETS.holder).toBe(48);
    expect(LISTING_OFFSETS.seller).toBe(56);
    expect(LISTING_OFFSETS.status).toBe(232);
  });
});
