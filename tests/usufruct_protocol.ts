import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccount,
  createMint,
  getAccount,
  getAssociatedTokenAddressSync,
  getMint,
  mintTo,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
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
  valueMint: PublicKey;
  usufructPosition: PublicKey;
  activeListingsCount: BN;
  totalFreeValueSold: BN;
  activeEscrowedAmount: BN;
  status: unknown;
};
type DecodedUsufructPosition = {
  property: PublicKey;
  propertyId: BN;
  holder: PublicKey;
  linkedValueUnits: BN;
  linkedValueBps: number;
  active: boolean;
};
type DecodedListingAccount = {
  listingId: BN;
  property: PublicKey;
  propertyId: BN;
  seller: PublicKey;
  valueMint: PublicKey;
  sellerTokenAccount: PublicKey;
  escrowTokenAccount: PublicKey;
  escrowAuthority: PublicKey;
  amount: BN;
  priceLamports: BN;
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
    usufructPosition: AnchorAccountFetcher<DecodedUsufructPosition>;
    listingAccount: AnchorAccountFetcher<DecodedListingAccount>;
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

  async function registerValidProperty(
    propertyId: bigint,
    signer = owner,
    marketValueLamports = 200_000_000,
  ) {
    const [property] = derive([Buffer.from("property"), u64Le(propertyId)]);
    await program.methods
      .registerProperty(
        new BN(marketValueLamports),
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

  async function registerAndMockVerifyNextProperty(signer = owner) {
    const state = await accounts.protocolState.fetch(
      derive([Buffer.from("protocol_state")])[0],
    );
    const propertyId = BigInt(state.nextPropertyId.toString());
    const property = await registerValidProperty(propertyId, signer);
    await program.methods
      .mockVerifyProperty()
      .accounts({
        protocolState: derive([Buffer.from("protocol_state")])[0],
        property,
        verifier: signer.publicKey,
      })
      .signers([signer])
      .rpc();
    return { property, propertyId };
  }

  async function tokenizeProperty(property: PublicKey, signer = owner) {
    const valueMint = Keypair.generate();
    const ownerTokenAccount = getAssociatedTokenAddressSync(
      valueMint.publicKey,
      signer.publicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );
    const [usufructPosition] = derive([
      Buffer.from("usufruct_position"),
      property.toBuffer(),
    ]);
    const [valueMintAuthority] = derive([
      Buffer.from("value_mint_authority"),
      property.toBuffer(),
    ]);

    await program.methods
      .tokenizeProperty()
      .accounts({
        property,
        usufructPosition,
        valueMint: valueMint.publicKey,
        valueMintAuthority,
        ownerTokenAccount,
        owner: signer.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([signer, valueMint])
      .rpc();

    return {
      valueMint: valueMint.publicKey,
      ownerTokenAccount,
      usufructPosition,
      valueMintAuthority,
    };
  }

  async function createPrimarySaleListing(
    property: PublicKey,
    tokenized: { valueMint: PublicKey; ownerTokenAccount: PublicKey },
    amount: number | bigint,
    signer = owner,
  ) {
    const state = await accounts.protocolState.fetch(
      derive([Buffer.from("protocol_state")])[0],
    );
    const listingId = BigInt(state.nextListingId.toString());
    const [listing] = derive([
      Buffer.from("listing"),
      property.toBuffer(),
      u64Le(listingId),
    ]);
    const [escrowAuthority] = derive([
      Buffer.from("escrow_authority"),
      listing.toBuffer(),
    ]);
    const escrowTokenAccount = getAssociatedTokenAddressSync(
      tokenized.valueMint,
      escrowAuthority,
      true,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );

    await program.methods
      .createPrimarySaleListing(new BN(amount.toString()))
      .accounts({
        protocolState: derive([Buffer.from("protocol_state")])[0],
        property,
        listing,
        valueMint: tokenized.valueMint,
        ownerTokenAccount: tokenized.ownerTokenAccount,
        escrowAuthority,
        escrowTokenAccount,
        owner: signer.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([signer])
      .rpc();

    return { listing, listingId, escrowAuthority, escrowTokenAccount };
  }

  async function setupActiveListing(amount = 300_000) {
    const { property } = await registerAndMockVerifyNextProperty();
    const tokenized = await tokenizeProperty(property);
    const created = await createPrimarySaleListing(property, tokenized, amount);
    const listing = await accounts.listingAccount.fetch(created.listing);
    return { property, tokenized, created, listing };
  }

  async function createBuyerTokenAccount(buyer: Keypair, valueMint: PublicKey) {
    await fund(buyer);
    return createAssociatedTokenAccount(
      provider.connection,
      buyer,
      valueMint,
      buyer.publicKey,
      undefined,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );
  }

  async function buyPrimarySaleListing(
    property: PublicKey,
    tokenized: { valueMint: PublicKey },
    created: { listing: PublicKey; escrowAuthority: PublicKey; escrowTokenAccount: PublicKey },
    buyer: Keypair,
    buyerTokenAccount: PublicKey,
    expectedAmount: number | bigint,
    expectedPriceLamports: number | bigint,
    overrides = {},
    signers = [buyer],
  ) {
    await program.methods
      .buyPrimarySaleListing(
        new BN(expectedAmount.toString()),
        new BN(expectedPriceLamports.toString()),
      )
      .accounts({
        listing: created.listing,
        property,
        buyer: buyer.publicKey,
        seller: owner.publicKey,
        valueMint: tokenized.valueMint,
        escrowAuthority: created.escrowAuthority,
        escrowTokenAccount: created.escrowTokenAccount,
        buyerTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        ...overrides,
      })
      .signers(signers)
      .rpc();
  }

  async function cancelPrimarySaleListing(
    property: PublicKey,
    tokenized: { valueMint: PublicKey; ownerTokenAccount: PublicKey },
    created: { listing: PublicKey; escrowAuthority: PublicKey; escrowTokenAccount: PublicKey },
    overrides = {},
    signers = [owner],
  ) {
    await program.methods
      .cancelPrimarySaleListing()
      .accounts({
        listing: created.listing,
        property,
        seller: owner.publicKey,
        valueMint: tokenized.valueMint,
        escrowAuthority: created.escrowAuthority,
        escrowTokenAccount: created.escrowTokenAccount,
        sellerTokenAccount: tokenized.ownerTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        ...overrides,
      })
      .signers(signers)
      .rpc();
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

  it("tokenizes a mock verified property into an SPL mint and usufruct position", async () => {
    const { property } = await registerAndMockVerifyNextProperty();
    const tokenized = await tokenizeProperty(property);

    const propertyAccount = await accounts.propertyAccount.fetch(property);
    assert.deepEqual(propertyAccount.status, { tokenized: {} });
    assert.equal(propertyAccount.valueMint.toBase58(), tokenized.valueMint.toBase58());
    assert.equal(
      propertyAccount.usufructPosition.toBase58(),
      tokenized.usufructPosition.toBase58(),
    );

    const mint = await getMint(provider.connection, tokenized.valueMint);
    assert.equal(mint.decimals, 0);
    assert.equal(mint.supply, 800_000n);
    assert.equal(mint.mintAuthority, null);
    assert.equal(mint.freezeAuthority, null);

    const ownerToken = await getAccount(
      provider.connection,
      tokenized.ownerTokenAccount,
    );
    assert.equal(ownerToken.mint.toBase58(), tokenized.valueMint.toBase58());
    assert.equal(ownerToken.owner.toBase58(), owner.publicKey.toBase58());
    assert.equal(ownerToken.amount, 800_000n);

    const usufruct = await accounts.usufructPosition.fetch(
      tokenized.usufructPosition,
    );
    assert.equal(usufruct.property.toBase58(), property.toBase58());
    assert.equal(usufruct.holder.toBase58(), owner.publicKey.toBase58());
    assert.equal(usufruct.linkedValueUnits.toString(), "200000");
    assert.equal(usufruct.linkedValueBps, 2_000);
    assert.equal(usufruct.active, true);
  });

  it("rejects tokenization before validation and rejects duplicate tokenization", async () => {
    const state = await accounts.protocolState.fetch(
      derive([Buffer.from("protocol_state")])[0],
    );
    const pendingProperty = await registerValidProperty(
      BigInt(state.nextPropertyId.toString()),
    );

    await expectAnchorError(
      () => tokenizeProperty(pendingProperty),
      "PropertyNotMockVerified",
    );

    const { property } = await registerAndMockVerifyNextProperty();
    await tokenizeProperty(property);
    await expectAnchorError(
      () => tokenizeProperty(property),
      "already in use",
    );
  });

  it("rejects false tokenization accounts and programs", async () => {
    const { property } = await registerAndMockVerifyNextProperty();
    const valueMint = Keypair.generate();
    const [usufructPosition] = derive([
      Buffer.from("usufruct_position"),
      property.toBuffer(),
    ]);
    const [valueMintAuthority] = derive([
      Buffer.from("value_mint_authority"),
      property.toBuffer(),
    ]);
    const ownerTokenAccount = getAssociatedTokenAddressSync(
      valueMint.publicKey,
      owner.publicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );

    async function attempt(overrides = {}, signers = [owner, valueMint]) {
      await program.methods
        .tokenizeProperty()
        .accounts({
          property,
          usufructPosition,
          valueMint: valueMint.publicKey,
          valueMintAuthority,
          ownerTokenAccount,
          owner: owner.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          ...overrides,
        })
        .signers(signers)
        .rpc();
    }

    await expectAnchorError(
      () => attempt({ valueMintAuthority: Keypair.generate().publicKey }),
      "ConstraintSeeds",
    );
    await expectAnchorError(
      () => attempt({ ownerTokenAccount: Keypair.generate().publicKey }),
      "account required by the instruction is missing",
    );
    await expectAnchorError(
      () => attempt({ tokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID }),
      "InvalidProgramId",
    );
    await expectAnchorError(
      () => attempt({ associatedTokenProgram: TOKEN_PROGRAM_ID }),
      "InvalidProgramId",
    );
  });

  it("rejects pre-existing false mints and unauthorized additional minting", async () => {
    const fakeMint = Keypair.generate();
    await createMint(
      provider.connection,
      owner,
      owner.publicKey,
      owner.publicKey,
      1,
      fakeMint,
      undefined,
      TOKEN_PROGRAM_ID,
    );

    const { property } = await registerAndMockVerifyNextProperty();
    const fakeOwnerTokenAccount = getAssociatedTokenAddressSync(
      fakeMint.publicKey,
      owner.publicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );
    await expectAnchorError(
      () =>
        program.methods
          .tokenizeProperty()
          .accounts({
            property,
            usufructPosition: derive([
              Buffer.from("usufruct_position"),
              property.toBuffer(),
            ])[0],
            valueMint: fakeMint.publicKey,
            valueMintAuthority: derive([
              Buffer.from("value_mint_authority"),
              property.toBuffer(),
            ])[0],
            ownerTokenAccount: fakeOwnerTokenAccount,
            owner: owner.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([owner, fakeMint])
          .rpc(),
      "already in use",
    );

    const valid = await tokenizeProperty(property);
    await expectAnchorError(
      () =>
        mintTo(
          provider.connection,
          owner,
          valid.valueMint,
          valid.ownerTokenAccount,
          owner,
          1,
          [],
          undefined,
          TOKEN_PROGRAM_ID,
        ),
      "fixed",
    );
  });

  it("creates a primary sale listing and moves tokens into escrow", async () => {
    const { property } = await registerAndMockVerifyNextProperty();
    const tokenized = await tokenizeProperty(property);
    const created = await createPrimarySaleListing(property, tokenized, 300_000);

    const listing = await accounts.listingAccount.fetch(created.listing);
    assert.equal(listing.listingId.toString(), created.listingId.toString());
    assert.equal(listing.property.toBase58(), property.toBase58());
    assert.equal(listing.seller.toBase58(), owner.publicKey.toBase58());
    assert.equal(listing.valueMint.toBase58(), tokenized.valueMint.toBase58());
    assert.equal(
      listing.sellerTokenAccount.toBase58(),
      tokenized.ownerTokenAccount.toBase58(),
    );
    assert.equal(
      listing.escrowTokenAccount.toBase58(),
      created.escrowTokenAccount.toBase58(),
    );
    assert.equal(
      listing.escrowAuthority.toBase58(),
      created.escrowAuthority.toBase58(),
    );
    assert.equal(listing.amount.toString(), "300000");
    assert.equal(listing.priceLamports.toString(), "60000000");
    assert.deepEqual(listing.status, { active: {} });

    const ownerToken = await getAccount(
      provider.connection,
      tokenized.ownerTokenAccount,
    );
    const escrowToken = await getAccount(
      provider.connection,
      created.escrowTokenAccount,
    );
    assert.equal(ownerToken.amount, 500_000n);
    assert.equal(escrowToken.amount, 300_000n);
    assert.equal(escrowToken.owner.toBase58(), created.escrowAuthority.toBase58());

    const propertyAccount = await accounts.propertyAccount.fetch(property);
    assert.deepEqual(propertyAccount.status, { activeSale: {} });
    assert.equal(propertyAccount.activeListingsCount.toString(), "1");
    assert.equal(propertyAccount.activeEscrowedAmount.toString(), "300000");
    assert.equal(propertyAccount.totalFreeValueSold.toString(), "0");
  });

  it("rejects invalid listing amounts and insufficient free value balance", async () => {
    const { property } = await registerAndMockVerifyNextProperty();
    const tokenized = await tokenizeProperty(property);

    await expectAnchorError(
      () => createPrimarySaleListing(property, tokenized, 0),
      "InvalidAmount",
    );
    await expectAnchorError(
      () => createPrimarySaleListing(property, tokenized, 900_000),
      "InsufficientFreeValueBalance",
    );
  });

  it("supports multiple active listings while free value is available", async () => {
    const { property } = await registerAndMockVerifyNextProperty();
    const tokenized = await tokenizeProperty(property);

    const first = await createPrimarySaleListing(property, tokenized, 300_000);
    const second = await createPrimarySaleListing(property, tokenized, 200_000);

    const firstEscrow = await getAccount(provider.connection, first.escrowTokenAccount);
    const secondEscrow = await getAccount(
      provider.connection,
      second.escrowTokenAccount,
    );
    const ownerToken = await getAccount(
      provider.connection,
      tokenized.ownerTokenAccount,
    );
    assert.equal(firstEscrow.amount, 300_000n);
    assert.equal(secondEscrow.amount, 200_000n);
    assert.equal(ownerToken.amount, 300_000n);

    const propertyAccount = await accounts.propertyAccount.fetch(property);
    assert.equal(propertyAccount.activeListingsCount.toString(), "2");
    assert.equal(propertyAccount.activeEscrowedAmount.toString(), "500000");

    await expectAnchorError(
      () => createPrimarySaleListing(property, tokenized, 400_000),
      "InsufficientFreeValueBalance",
    );
  });

  it("rejects false listing accounts and programs", async () => {
    const { property } = await registerAndMockVerifyNextProperty();
    const tokenized = await tokenizeProperty(property);
    const state = await accounts.protocolState.fetch(
      derive([Buffer.from("protocol_state")])[0],
    );
    const listingId = BigInt(state.nextListingId.toString());
    const [listing] = derive([
      Buffer.from("listing"),
      property.toBuffer(),
      u64Le(listingId),
    ]);
    const [escrowAuthority] = derive([
      Buffer.from("escrow_authority"),
      listing.toBuffer(),
    ]);
    const escrowTokenAccount = getAssociatedTokenAddressSync(
      tokenized.valueMint,
      escrowAuthority,
      true,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );

    async function attempt(overrides = {}, signers = [owner]) {
      await program.methods
        .createPrimarySaleListing(new BN(300_000))
        .accounts({
          protocolState: derive([Buffer.from("protocol_state")])[0],
          property,
          listing,
          valueMint: tokenized.valueMint,
          ownerTokenAccount: tokenized.ownerTokenAccount,
          escrowAuthority,
          escrowTokenAccount,
          owner: owner.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          ...overrides,
        })
        .signers(signers)
        .rpc();
    }

    await expectAnchorError(
      () => attempt({ owner: stranger.publicKey }, [stranger]),
      "ConstraintHasOne",
    );
    await expectAnchorError(
      () => attempt({ ownerTokenAccount: Keypair.generate().publicKey }),
      "AccountNotInitialized",
    );
    await expectAnchorError(
      () => attempt({ valueMint: Keypair.generate().publicKey }),
      "AccountNotInitialized",
    );
    await expectAnchorError(
      () => attempt({ escrowAuthority: Keypair.generate().publicKey }),
      "account required by the instruction is missing",
    );
    await expectAnchorError(
      () => attempt({ escrowTokenAccount: Keypair.generate().publicKey }),
      "account required by the instruction is missing",
    );
    await expectAnchorError(
      () => attempt({ tokenProgram: TOKEN_2022_PROGRAM_ID }),
      "InvalidProgramId",
    );
    await expectAnchorError(
      () => attempt({ associatedTokenProgram: TOKEN_PROGRAM_ID }),
      "InvalidProgramId",
    );
  });

  it("rejects listing for non-tokenized property and price zero", async () => {
    const state = await accounts.protocolState.fetch(
      derive([Buffer.from("protocol_state")])[0],
    );
    const nonTokenizedProperty = await registerValidProperty(
      BigInt(state.nextPropertyId.toString()),
    );
    const fakeMint = await createMint(
      provider.connection,
      owner,
      owner.publicKey,
      null,
      0,
      undefined,
      undefined,
      TOKEN_PROGRAM_ID,
    );
    const fakeOwnerTokenAccount = await createAssociatedTokenAccount(
      provider.connection,
      owner,
      fakeMint,
      owner.publicKey,
      undefined,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );
    await expectAnchorError(
      () =>
        createPrimarySaleListing(
          nonTokenizedProperty,
          { valueMint: fakeMint, ownerTokenAccount: fakeOwnerTokenAccount },
          1,
        ),
      "PropertyNotTokenized",
    );

    const latestState = await accounts.protocolState.fetch(
      derive([Buffer.from("protocol_state")])[0],
    );
    const lowValueProperty = await registerValidProperty(
      BigInt(latestState.nextPropertyId.toString()),
      owner,
      1,
    );
    await program.methods
      .mockVerifyProperty()
      .accounts({
        protocolState: derive([Buffer.from("protocol_state")])[0],
        property: lowValueProperty,
        verifier: owner.publicKey,
      })
      .signers([owner])
      .rpc();
    const tokenized = await tokenizeProperty(lowValueProperty);
    await expectAnchorError(
      () => createPrimarySaleListing(lowValueProperty, tokenized, 1),
      "PriceZero",
    );
  });

  it("buys a primary sale listing, pays seller, transfers tokens, and closes escrow", async () => {
    const { property, tokenized, created } = await setupActiveListing(300_000);
    const buyer = Keypair.generate();
    const buyerTokenAccount = await createBuyerTokenAccount(buyer, tokenized.valueMint);
    const sellerBefore = await provider.connection.getBalance(owner.publicKey);

    await buyPrimarySaleListing(
      property,
      tokenized,
      created,
      buyer,
      buyerTokenAccount,
      300_000,
      60_000_000,
    );

    const listing = await accounts.listingAccount.fetch(created.listing);
    assert.deepEqual(listing.status, { filled: {} });

    const propertyAccount = await accounts.propertyAccount.fetch(property);
    assert.deepEqual(propertyAccount.status, { tokenized: {} });
    assert.equal(propertyAccount.activeListingsCount.toString(), "0");
    assert.equal(propertyAccount.activeEscrowedAmount.toString(), "0");
    assert.equal(propertyAccount.totalFreeValueSold.toString(), "300000");

    const buyerToken = await getAccount(provider.connection, buyerTokenAccount);
    assert.equal(buyerToken.amount, 300_000n);

    const escrowAccountInfo = await provider.connection.getAccountInfo(
      created.escrowTokenAccount,
    );
    assert.equal(escrowAccountInfo, null);

    const sellerAfter = await provider.connection.getBalance(owner.publicKey);
    assert.ok(sellerAfter > sellerBefore + 60_000_000);
  });

  it("buys a selected amount, keeps the remaining listing active, then fills it", async () => {
    const { property, tokenized, created } = await setupActiveListing(300_000);
    const buyer = Keypair.generate();
    const buyerTokenAccount = await createBuyerTokenAccount(buyer, tokenized.valueMint);

    await buyPrimarySaleListing(
      property,
      tokenized,
      created,
      buyer,
      buyerTokenAccount,
      100_000,
      20_000_000,
    );

    const partialListing = await accounts.listingAccount.fetch(created.listing);
    assert.deepEqual(partialListing.status, { active: {} });
    assert.equal(partialListing.amount.toString(), "200000");
    assert.equal(partialListing.priceLamports.toString(), "40000000");

    const partialProperty = await accounts.propertyAccount.fetch(property);
    assert.deepEqual(partialProperty.status, { activeSale: {} });
    assert.equal(partialProperty.activeListingsCount.toString(), "1");
    assert.equal(partialProperty.activeEscrowedAmount.toString(), "200000");
    assert.equal(partialProperty.totalFreeValueSold.toString(), "100000");

    const partialBuyerToken = await getAccount(provider.connection, buyerTokenAccount);
    assert.equal(partialBuyerToken.amount, 100_000n);
    const partialEscrow = await getAccount(
      provider.connection,
      created.escrowTokenAccount,
    );
    assert.equal(partialEscrow.amount, 200_000n);

    await buyPrimarySaleListing(
      property,
      tokenized,
      created,
      buyer,
      buyerTokenAccount,
      200_000,
      40_000_000,
    );

    const filledListing = await accounts.listingAccount.fetch(created.listing);
    assert.deepEqual(filledListing.status, { filled: {} });
    assert.equal(filledListing.amount.toString(), "0");
    assert.equal(filledListing.priceLamports.toString(), "0");

    const filledProperty = await accounts.propertyAccount.fetch(property);
    assert.deepEqual(filledProperty.status, { tokenized: {} });
    assert.equal(filledProperty.activeListingsCount.toString(), "0");
    assert.equal(filledProperty.activeEscrowedAmount.toString(), "0");
    assert.equal(filledProperty.totalFreeValueSold.toString(), "300000");

    const filledBuyerToken = await getAccount(provider.connection, buyerTokenAccount);
    assert.equal(filledBuyerToken.amount, 300_000n);
    const escrowAccountInfo = await provider.connection.getAccountInfo(
      created.escrowTokenAccount,
    );
    assert.equal(escrowAccountInfo, null);
  });

  it("rejects buyer equal to seller and stale expected values", async () => {
    const { property, tokenized, created } = await setupActiveListing(300_000);
    const buyer = Keypair.generate();
    const buyerTokenAccount = await createBuyerTokenAccount(buyer, tokenized.valueMint);

    await expectAnchorError(
      () =>
        buyPrimarySaleListing(
          property,
          tokenized,
          created,
          owner,
          tokenized.ownerTokenAccount,
          300_000,
          60_000_000,
          { buyer: owner.publicKey },
          [owner],
        ),
      "BuyerCannotBeSeller",
    );
    await expectAnchorError(
      () =>
        buyPrimarySaleListing(
          property,
          tokenized,
          created,
          buyer,
          buyerTokenAccount,
          300_001,
          60_000_000,
        ),
      "UnexpectedAmount",
    );
    await expectAnchorError(
      () =>
        buyPrimarySaleListing(
          property,
          tokenized,
          created,
          buyer,
          buyerTokenAccount,
          300_000,
          60_000_001,
        ),
      "UnexpectedPrice",
    );
  });

  it("rejects buying a filled listing", async () => {
    const { property, tokenized, created } = await setupActiveListing(300_000);
    const buyer = Keypair.generate();
    const buyerTokenAccount = await createBuyerTokenAccount(buyer, tokenized.valueMint);
    await buyPrimarySaleListing(
      property,
      tokenized,
      created,
      buyer,
      buyerTokenAccount,
      300_000,
      60_000_000,
    );

    const secondBuyer = Keypair.generate();
    const secondBuyerTokenAccount = await createBuyerTokenAccount(
      secondBuyer,
      tokenized.valueMint,
    );
    await expectAnchorError(
      () =>
        buyPrimarySaleListing(
          property,
          tokenized,
          created,
          secondBuyer,
          secondBuyerTokenAccount,
          300_000,
          60_000_000,
          { escrowTokenAccount: tokenized.ownerTokenAccount },
        ),
      "ListingNotActive",
    );
  });

  it("requires the UI-created canonical buyer ATA before purchase", async () => {
    const { property, tokenized, created } = await setupActiveListing(300_000);
    const buyer = Keypair.generate();
    await fund(buyer);
    const missingBuyerTokenAccount = getAssociatedTokenAddressSync(
      tokenized.valueMint,
      buyer.publicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );

    await expectAnchorError(
      () =>
        buyPrimarySaleListing(
          property,
          tokenized,
          created,
          buyer,
          missingBuyerTokenAccount,
          300_000,
          60_000_000,
        ),
      "AccountNotInitialized",
    );

    const buyerTokenAccount = await createAssociatedTokenAccount(
      provider.connection,
      buyer,
      tokenized.valueMint,
      buyer.publicKey,
      undefined,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );
    await buyPrimarySaleListing(
      property,
      tokenized,
      created,
      buyer,
      buyerTokenAccount,
      300_000,
      60_000_000,
    );

    const buyerToken = await getAccount(provider.connection, buyerTokenAccount);
    assert.equal(buyerToken.amount, 300_000n);
  });

  it("rejects false buyer, mint, seller, escrow, property, and programs on purchase", async () => {
    const { property, tokenized, created } = await setupActiveListing(300_000);
    const buyer = Keypair.generate();
    const buyerTokenAccount = await createBuyerTokenAccount(buyer, tokenized.valueMint);
    const falseProperty = Keypair.generate().publicKey;

    await expectAnchorError(
      () =>
        buyPrimarySaleListing(
          property,
          tokenized,
          created,
          buyer,
          Keypair.generate().publicKey,
          300_000,
          60_000_000,
        ),
      "AccountNotInitialized",
    );
    await expectAnchorError(
      () =>
        buyPrimarySaleListing(
          property,
          tokenized,
          created,
          buyer,
          buyerTokenAccount,
          300_000,
          60_000_000,
          { valueMint: Keypair.generate().publicKey },
        ),
      "AccountNotInitialized",
    );
    await expectAnchorError(
      () =>
        buyPrimarySaleListing(
          property,
          tokenized,
          created,
          buyer,
          buyerTokenAccount,
          300_000,
          60_000_000,
          { seller: stranger.publicKey },
        ),
      "InvalidSeller",
    );
    await expectAnchorError(
      () =>
        buyPrimarySaleListing(
          property,
          tokenized,
          created,
          buyer,
          buyerTokenAccount,
          300_000,
          60_000_000,
          { escrowTokenAccount: tokenized.ownerTokenAccount },
        ),
      "InvalidEscrowTokenAccount",
    );
    await expectAnchorError(
      () =>
        buyPrimarySaleListing(
          property,
          tokenized,
          created,
          buyer,
          buyerTokenAccount,
          300_000,
          60_000_000,
          { escrowAuthority: Keypair.generate().publicKey },
        ),
      "ConstraintSeeds",
    );
    await expectAnchorError(
      () =>
        buyPrimarySaleListing(
          falseProperty,
          tokenized,
          created,
          buyer,
          buyerTokenAccount,
          300_000,
          60_000_000,
        ),
      "AccountNotInitialized",
    );
    await expectAnchorError(
      () =>
        buyPrimarySaleListing(
          property,
          tokenized,
          created,
          buyer,
          buyerTokenAccount,
          300_000,
          60_000_000,
          { tokenProgram: TOKEN_2022_PROGRAM_ID },
        ),
      "InvalidProgramId",
    );
    await expectAnchorError(
      () =>
        buyPrimarySaleListing(
          property,
          tokenized,
          created,
          buyer,
          buyerTokenAccount,
          300_000,
          60_000_000,
          { associatedTokenProgram: TOKEN_PROGRAM_ID },
        ),
      "InvalidProgramId",
    );
  });

  it("marks property as sold out after buying all free value", async () => {
    const { property, tokenized, created } = await setupActiveListing(800_000);
    const buyer = Keypair.generate();
    const buyerTokenAccount = await createBuyerTokenAccount(buyer, tokenized.valueMint);

    await buyPrimarySaleListing(
      property,
      tokenized,
      created,
      buyer,
      buyerTokenAccount,
      800_000,
      160_000_000,
    );

    const propertyAccount = await accounts.propertyAccount.fetch(property);
    assert.deepEqual(propertyAccount.status, { soldOut: {} });
    assert.equal(propertyAccount.activeListingsCount.toString(), "0");
    assert.equal(propertyAccount.activeEscrowedAmount.toString(), "0");
    assert.equal(propertyAccount.totalFreeValueSold.toString(), "800000");
  });

  it("cancels a primary sale listing, returns tokens, closes escrow, and keeps listing history", async () => {
    const { property, tokenized, created } = await setupActiveListing(300_000);
    const sellerBefore = await provider.connection.getBalance(owner.publicKey);

    await cancelPrimarySaleListing(property, tokenized, created);

    const listing = await accounts.listingAccount.fetch(created.listing);
    assert.deepEqual(listing.status, { cancelled: {} });

    const propertyAccount = await accounts.propertyAccount.fetch(property);
    assert.deepEqual(propertyAccount.status, { tokenized: {} });
    assert.equal(propertyAccount.activeListingsCount.toString(), "0");
    assert.equal(propertyAccount.activeEscrowedAmount.toString(), "0");
    assert.equal(propertyAccount.totalFreeValueSold.toString(), "0");

    const sellerToken = await getAccount(
      provider.connection,
      tokenized.ownerTokenAccount,
    );
    assert.equal(sellerToken.amount, 800_000n);

    const escrowAccountInfo = await provider.connection.getAccountInfo(
      created.escrowTokenAccount,
    );
    assert.equal(escrowAccountInfo, null);

    const sellerAfter = await provider.connection.getBalance(owner.publicKey);
    assert.ok(sellerAfter > sellerBefore);
  });

  it("rejects cancellation by non-seller", async () => {
    const { property, tokenized, created } = await setupActiveListing(300_000);

    await expectAnchorError(
      () =>
        cancelPrimarySaleListing(
          property,
          tokenized,
          created,
          { seller: stranger.publicKey },
          [stranger],
        ),
      "InvalidSeller",
    );
  });

  it("rejects cancelling filled and cancelled listings", async () => {
    const bought = await setupActiveListing(300_000);
    const buyer = Keypair.generate();
    const buyerTokenAccount = await createBuyerTokenAccount(
      buyer,
      bought.tokenized.valueMint,
    );
    await buyPrimarySaleListing(
      bought.property,
      bought.tokenized,
      bought.created,
      buyer,
      buyerTokenAccount,
      300_000,
      60_000_000,
    );
    await expectAnchorError(
      () =>
        cancelPrimarySaleListing(
          bought.property,
          bought.tokenized,
          bought.created,
          { escrowTokenAccount: bought.tokenized.ownerTokenAccount },
        ),
      "ListingNotActive",
    );

    const cancelled = await setupActiveListing(300_000);
    await cancelPrimarySaleListing(
      cancelled.property,
      cancelled.tokenized,
      cancelled.created,
    );
    await expectAnchorError(
      () =>
        cancelPrimarySaleListing(
          cancelled.property,
          cancelled.tokenized,
          cancelled.created,
          { escrowTokenAccount: cancelled.tokenized.ownerTokenAccount },
        ),
      "ListingNotActive",
    );
  });

  it("rejects false cancellation accounts and programs", async () => {
    const { property, tokenized, created } = await setupActiveListing(300_000);

    await expectAnchorError(
      () =>
        cancelPrimarySaleListing(property, tokenized, created, {
          sellerTokenAccount: Keypair.generate().publicKey,
        }),
      "AccountNotInitialized",
    );
    await expectAnchorError(
      () =>
        cancelPrimarySaleListing(property, tokenized, created, {
          valueMint: Keypair.generate().publicKey,
        }),
      "AccountNotInitialized",
    );
    await expectAnchorError(
      () =>
        cancelPrimarySaleListing(property, tokenized, created, {
          escrowTokenAccount: tokenized.ownerTokenAccount,
        }),
      "InvalidEscrowTokenAccount",
    );
    await expectAnchorError(
      () =>
        cancelPrimarySaleListing(property, tokenized, created, {
          escrowAuthority: Keypair.generate().publicKey,
        }),
      "ConstraintSeeds",
    );
    await expectAnchorError(
      () =>
        cancelPrimarySaleListing(property, tokenized, created, {
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        }),
      "InvalidProgramId",
    );
    await expectAnchorError(
      () =>
        cancelPrimarySaleListing(property, tokenized, created, {
          associatedTokenProgram: TOKEN_PROGRAM_ID,
        }),
      "InvalidProgramId",
    );
  });
});
