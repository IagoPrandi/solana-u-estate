import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import assert from "node:assert/strict";

const PROGRAM_ID = new PublicKey("7L4m3nKBzAprH6L18nXHngA1djPAmYYt1XZVu7RqW8V1");
type AnchorAccountFetcher<T> = { fetch(address: PublicKey): Promise<T> };
type DecodedProtocolState = {
  admin: PublicKey;
  mockVerifier: PublicKey;
  nextPropertyId: BN;
  nextListingId: BN;
};
type DecodedPropertyAccount = {
  propertyId: BN;
  owner: PublicKey;
  marketValueLamports: BN;
  totalValueUnits: BN;
  linkedValueUnits: BN;
  freeValueUnits: BN;
  linkedValueBps: number;
  metadataHash: number[];
  documentsHash: number[];
  locationHash: number[];
  status: unknown;
};

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

async function expectAnchorError(action: () => Promise<unknown>, errorName: string) {
  try {
    await action();
    assert.fail(`Expected Anchor error ${errorName}`);
  } catch (error) {
    const message = String(error);
    assert.ok(
      message.includes(errorName),
      `Expected ${errorName}, got ${message}`,
    );
  }
}

describe("usufruct_protocol", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.UsufructProtocol as Program;
  const accounts = program.account as unknown as {
    protocolState: AnchorAccountFetcher<DecodedProtocolState>;
    propertyAccount: AnchorAccountFetcher<DecodedPropertyAccount>;
  };
  const admin = provider.wallet.publicKey;
  const mockVerifier = Keypair.generate();
  const owner = Keypair.generate();
  const stranger = Keypair.generate();
  const metadataHash = Array.from(Buffer.alloc(32, 1));
  const documentsHash = Array.from(Buffer.alloc(32, 2));
  const locationHash = Array.from(Buffer.alloc(32, 3));

  async function fund(keypair: Keypair) {
    const signature = await provider.connection.requestAirdrop(
      keypair.publicKey,
      2 * LAMPORTS_PER_SOL,
    );
    await provider.connection.confirmTransaction(signature, "confirmed");
  }

  async function registerValidProperty(propertyId: bigint, signer = owner) {
    const [property] = derive([Buffer.from("property"), u64Le(propertyId)]);
    await program.methods
      .registerProperty(
        new BN(200_000_000),
        2_000,
        metadataHash,
        documentsHash,
        locationHash,
      )
      .accounts({
        protocolState: derive([Buffer.from("protocol_state")])[0],
        property,
        owner: signer.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([signer])
      .rpc();
    return property;
  }

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

  it("initializes protocol state and rejects duplicate initialization", async () => {
    await fund(owner);
    await fund(stranger);

    const [protocolState] = derive([Buffer.from("protocol_state")]);
    await program.methods
      .initializeProtocol(mockVerifier.publicKey)
      .accounts({
        protocolState,
        admin,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const state = await accounts.protocolState.fetch(protocolState);
    assert.equal(state.admin.toBase58(), admin.toBase58());
    assert.equal(state.mockVerifier.toBase58(), mockVerifier.publicKey.toBase58());
    assert.equal(state.nextPropertyId.toString(), "1");
    assert.equal(state.nextListingId.toString(), "1");

    await expectAnchorError(
      () =>
        program.methods
          .initializeProtocol(mockVerifier.publicKey)
          .accounts({
            protocolState,
            admin,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .rpc(),
      "already in use",
    );
  });

  it("rejects invalid property registration inputs", async () => {
    const protocolState = derive([Buffer.from("protocol_state")])[0];
    const property = derive([Buffer.from("property"), u64Le(1n)])[0];

    async function attempt(
      marketValueLamports: number,
      linkedValueBps: number,
      metadata = metadataHash,
      documents = documentsHash,
      location = locationHash,
    ) {
      await program.methods
        .registerProperty(
          new BN(marketValueLamports),
          linkedValueBps,
          metadata,
          documents,
          location,
        )
        .accounts({
          protocolState,
          property,
          owner: owner.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([owner])
        .rpc();
    }

    await expectAnchorError(() => attempt(0, 2_000), "InvalidMarketValue");
    await expectAnchorError(() => attempt(1, 0), "InvalidLinkedValueBps");
    await expectAnchorError(() => attempt(1, 10_000), "InvalidLinkedValueBps");
    await expectAnchorError(
      () => attempt(1, 2_000, Array.from(Buffer.alloc(32))),
      "InvalidMetadataHash",
    );
    await expectAnchorError(
      () => attempt(1, 2_000, metadataHash, Array.from(Buffer.alloc(32))),
      "InvalidDocumentsHash",
    );
    await expectAnchorError(
      () =>
        attempt(
          1,
          2_000,
          metadataHash,
          documentsHash,
          Array.from(Buffer.alloc(32)),
        ),
      "InvalidLocationHash",
    );
  });

  it("registers a valid property", async () => {
    const property = await registerValidProperty(1n);
    const account = await accounts.propertyAccount.fetch(property);

    assert.equal(account.propertyId.toString(), "1");
    assert.equal(account.owner.toBase58(), owner.publicKey.toBase58());
    assert.equal(account.marketValueLamports.toString(), "200000000");
    assert.equal(account.totalValueUnits.toString(), "1000000");
    assert.equal(account.linkedValueUnits.toString(), "200000");
    assert.equal(account.freeValueUnits.toString(), "800000");
    assert.equal(account.linkedValueBps, 2_000);
    assert.deepEqual(account.metadataHash, metadataHash);
    assert.deepEqual(account.documentsHash, documentsHash);
    assert.deepEqual(account.locationHash, locationHash);
    assert.deepEqual(account.status, { pendingMockVerification: {} });

    const state = await accounts.protocolState.fetch(
      derive([Buffer.from("protocol_state")])[0],
    );
    assert.equal(state.nextPropertyId.toString(), "2");
  });

  it("mock verifies by owner, mock verifier, and admin; rejects unauthorized", async () => {
    const protocolState = derive([Buffer.from("protocol_state")])[0];
    const ownerVerifiedProperty = derive([Buffer.from("property"), u64Le(1n)])[0];

    await program.methods
      .mockVerifyProperty()
      .accounts({
        protocolState,
        property: ownerVerifiedProperty,
        verifier: owner.publicKey,
      })
      .signers([owner])
      .rpc();
    const ownerVerified = await accounts.propertyAccount.fetch(
      ownerVerifiedProperty,
    );
    assert.deepEqual(ownerVerified.status, { mockVerified: {} });

    const mockVerifiedProperty = await registerValidProperty(2n);
    await program.methods
      .mockVerifyProperty()
      .accounts({
        protocolState,
        property: mockVerifiedProperty,
        verifier: mockVerifier.publicKey,
      })
      .signers([mockVerifier])
      .rpc();
    const mockVerified = await accounts.propertyAccount.fetch(
      mockVerifiedProperty,
    );
    assert.deepEqual(mockVerified.status, { mockVerified: {} });

    const adminVerifiedProperty = await registerValidProperty(3n);
    await program.methods
      .mockVerifyProperty()
      .accounts({
        protocolState,
        property: adminVerifiedProperty,
        verifier: admin,
      })
      .rpc();
    const adminVerified = await accounts.propertyAccount.fetch(
      adminVerifiedProperty,
    );
    assert.deepEqual(adminVerified.status, { mockVerified: {} });

    const unauthorizedProperty = await registerValidProperty(4n);
    await expectAnchorError(
      () =>
        program.methods
          .mockVerifyProperty()
          .accounts({
            protocolState,
            property: unauthorizedProperty,
            verifier: stranger.publicKey,
          })
          .signers([stranger])
          .rpc(),
      "Unauthorized",
    );

    await expectAnchorError(
      () =>
        program.methods
          .mockVerifyProperty()
          .accounts({
            protocolState,
            property: ownerVerifiedProperty,
            verifier: owner.publicKey,
          })
          .signers([owner])
          .rpc(),
      "PropertyNotPendingMockVerification",
    );
  });

  it("rejects false property and protocol state accounts", async () => {
    const protocolState = derive([Buffer.from("protocol_state")])[0];
    const falseProperty = Keypair.generate().publicKey;

    await expectAnchorError(
      () =>
        program.methods
          .mockVerifyProperty()
          .accounts({
            protocolState,
            property: falseProperty,
            verifier: owner.publicKey,
          })
          .signers([owner])
          .rpc(),
      "AccountNotInitialized",
    );

    await expectAnchorError(
      () =>
        program.methods
          .registerProperty(
            new BN(200_000_000),
            2_000,
            metadataHash,
            documentsHash,
            locationHash,
          )
          .accounts({
            protocolState: Keypair.generate().publicKey,
            property: derive([Buffer.from("property"), u64Le(5n)])[0],
            owner: owner.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([owner])
          .rpc(),
      "AccountNotInitialized",
    );
  });
});
