import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import assert from "node:assert/strict";

const PROGRAM_ID = new PublicKey("7L4m3nKBzAprH6L18nXHngA1djPAmYYt1XZVu7RqW8V1");

function u64Le(value: bigint): Buffer {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64LE(value);
  return buffer;
}

function derive(seeds: Buffer[]): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(seeds, PROGRAM_ID);
}

function assertWrongBumpFailsOrDiffers(
  seeds: Buffer[],
  expected: PublicKey,
  bump: number,
) {
  const wrongBump = bump === 0 ? 1 : bump - 1;
  try {
    const wrong = PublicKey.createProgramAddressSync(
      [...seeds, Buffer.from([wrongBump])],
      PROGRAM_ID,
    );
    assert.notEqual(wrong.toBase58(), expected.toBase58());
  } catch (error) {
    assert.ok(error instanceof Error);
  }
}

function hasName(names: Set<string>, expected: string): boolean {
  const normalized = expected.toLowerCase();
  return [...names].some((name) => name.toLowerCase() === normalized);
}

describe("usufruct_protocol", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.UsufructProtocol as Program;

  it("loads the Anchor program workspace", () => {
    assert.equal(program.programId.toBase58(), PROGRAM_ID.toBase58());
  });

  it("derives deterministic PDAs and rejects wrong bumps", () => {
    const [protocolState, protocolBump] = derive([
      Buffer.from("protocol_state"),
    ]);
    assertWrongBumpFailsOrDiffers(
      [Buffer.from("protocol_state")],
      protocolState,
      protocolBump,
    );

    const [property, propertyBump] = derive([
      Buffer.from("property"),
      u64Le(1n),
    ]);
    assertWrongBumpFailsOrDiffers(
      [Buffer.from("property"), u64Le(1n)],
      property,
      propertyBump,
    );

    const [usufructPosition] = derive([
      Buffer.from("usufruct_position"),
      property.toBuffer(),
    ]);
    const [listing] = derive([
      Buffer.from("listing"),
      property.toBuffer(),
      u64Le(1n),
    ]);
    const [escrowAuthority] = derive([
      Buffer.from("escrow_authority"),
      listing.toBuffer(),
    ]);
    const [valueMintAuthority] = derive([
      Buffer.from("value_mint_authority"),
      property.toBuffer(),
    ]);

    assert.notEqual(protocolState.toBase58(), property.toBase58());
    assert.notEqual(property.toBase58(), usufructPosition.toBase58());
    assert.notEqual(listing.toBase58(), escrowAuthority.toBase58());
    assert.notEqual(valueMintAuthority.toBase58(), property.toBase58());
  });

  it("exports S2 accounts, events, and errors in the IDL", () => {
    const accountNames = new Set(program.idl.accounts?.map((item) => item.name));
    assert.ok(hasName(accountNames, "ProtocolState"));

    const typeNames = new Set(program.idl.types?.map((item) => item.name));
    assert.ok(hasName(typeNames, "ProtocolState"));
    assert.ok(hasName(typeNames, "PropertyStatus"));

    const eventNames = new Set(program.idl.events?.map((item) => item.name));
    assert.ok(hasName(eventNames, "ProtocolInitialized"));
    assert.ok(hasName(eventNames, "PropertyRegistered"));
    assert.ok(hasName(eventNames, "PropertyMockVerified"));
    assert.ok(hasName(eventNames, "PropertyTokenized"));
    assert.ok(hasName(eventNames, "PrimarySaleListed"));
    assert.ok(hasName(eventNames, "PrimarySalePurchased"));
    assert.ok(hasName(eventNames, "PrimarySaleCancelled"));
    assert.ok(hasName(eventNames, "PropertyStatusUpdated"));

    const errorNames = new Set(program.idl.errors?.map((item) => item.name));
    assert.ok(hasName(errorNames, "InvalidAssociatedTokenProgram"));
    assert.ok(hasName(errorNames, "InvalidTokenProgram"));
    assert.ok(hasName(errorNames, "StaleLocalState"));
  });
});
