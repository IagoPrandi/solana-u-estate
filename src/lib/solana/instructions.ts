import { Buffer } from "buffer";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  escrowAuthorityPda,
  listingPda,
  propertyPda,
  protocolStatePda,
  requireUsufructProgramId,
  u16Le,
  u64Le,
  usufructPositionPda,
  valueMintAuthorityPda,
} from "@/lib/solana/accounts";

const IX = {
  initializeProtocol: Buffer.from([188, 233, 252, 106, 134, 146, 202, 91]),
  registerProperty: Buffer.from([25, 115, 131, 71, 59, 22, 25, 16]),
  mockVerifyProperty: Buffer.from([135, 175, 216, 248, 39, 48, 207, 122]),
  tokenizeProperty: Buffer.from([198, 15, 211, 188, 57, 7, 82, 199]),
  createPrimarySaleListing: Buffer.from([63, 105, 63, 42, 135, 212, 171, 139]),
  buyPrimarySaleListing: Buffer.from([56, 14, 32, 92, 246, 217, 7, 225]),
  cancelPrimarySaleListing: Buffer.from([182, 1, 166, 231, 181, 106, 162, 173]),
} as const;

export function hexHashToBytes32(hex: string) {
  const clean = hex.trim().replace(/^0x/i, "");
  if (!/^[0-9a-fA-F]{64}$/.test(clean)) {
    throw new Error("Hash must be 32 bytes encoded as hex.");
  }
  return Buffer.from(clean, "hex");
}

export function solDecimalToLamports(value: string) {
  const [wholePart, fractionPart = ""] = value.trim().split(".");
  if (!/^\d+$/.test(wholePart || "0") || !/^\d*$/.test(fractionPart)) {
    throw new Error("Invalid SOL amount.");
  }
  if (fractionPart.length > 9) {
    throw new Error("SOL amount has more than 9 decimal places.");
  }
  return BigInt(wholePart || "0") * 1_000_000_000n +
    BigInt(fractionPart.padEnd(9, "0") || "0");
}

export function lamportsToSolDecimal(value: bigint, precision = 9) {
  const whole = value / 1_000_000_000n;
  const fraction = (value % 1_000_000_000n)
    .toString()
    .padStart(9, "0")
    .slice(0, precision)
    .replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

function ix(keys: TransactionInstruction["keys"], data: Buffer) {
  return new TransactionInstruction({
    programId: requireUsufructProgramId(),
    keys,
    data,
  });
}

export function initializeProtocolIx(admin: PublicKey, mockVerifier: PublicKey) {
  return ix(
    [
      { pubkey: protocolStatePda(), isSigner: false, isWritable: true },
      { pubkey: admin, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    Buffer.concat([IX.initializeProtocol, mockVerifier.toBuffer()]),
  );
}

export function registerPropertyIx(input: {
  owner: PublicKey;
  propertyId: bigint;
  marketValueLamports: bigint;
  linkedValueBps: number;
  metadataHash: string;
  documentsHash: string;
  locationHash: string;
}) {
  const property = propertyPda(input.propertyId);
  return {
    property,
    instruction: ix(
      [
        { pubkey: protocolStatePda(), isSigner: false, isWritable: true },
        { pubkey: property, isSigner: false, isWritable: true },
        { pubkey: input.owner, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      Buffer.concat([
        IX.registerProperty,
        u64Le(input.marketValueLamports),
        u16Le(input.linkedValueBps),
        hexHashToBytes32(input.metadataHash),
        hexHashToBytes32(input.documentsHash),
        hexHashToBytes32(input.locationHash),
      ]),
    ),
  };
}

export function mockVerifyPropertyIx(input: {
  propertyId: bigint;
  verifier: PublicKey;
}) {
  return ix(
    [
      { pubkey: protocolStatePda(), isSigner: false, isWritable: false },
      { pubkey: propertyPda(input.propertyId), isSigner: false, isWritable: true },
      { pubkey: input.verifier, isSigner: true, isWritable: false },
    ],
    IX.mockVerifyProperty,
  );
}

export function tokenizePropertyIx(input: {
  propertyId: bigint;
  owner: PublicKey;
  valueMint: PublicKey;
}) {
  const property = propertyPda(input.propertyId);
  const ownerTokenAccount = getAssociatedTokenAddressSync(
    input.valueMint,
    input.owner,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  return {
    property,
    ownerTokenAccount,
    usufructPosition: usufructPositionPda(property),
    valueMintAuthority: valueMintAuthorityPda(property),
    instruction: ix(
      [
        { pubkey: property, isSigner: false, isWritable: true },
        { pubkey: usufructPositionPda(property), isSigner: false, isWritable: true },
        { pubkey: input.valueMint, isSigner: true, isWritable: true },
        { pubkey: valueMintAuthorityPda(property), isSigner: false, isWritable: false },
        { pubkey: ownerTokenAccount, isSigner: false, isWritable: true },
        { pubkey: input.owner, isSigner: true, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      IX.tokenizeProperty,
    ),
  };
}

export function createPrimarySaleListingIx(input: {
  propertyId: bigint;
  listingId: bigint;
  owner: PublicKey;
  valueMint: PublicKey;
  ownerTokenAccount: PublicKey;
  amount: bigint;
}) {
  const property = propertyPda(input.propertyId);
  const listing = listingPda(property, input.listingId);
  const escrowAuthority = escrowAuthorityPda(listing);
  const escrowTokenAccount = getAssociatedTokenAddressSync(
    input.valueMint,
    escrowAuthority,
    true,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  return {
    property,
    listing,
    escrowAuthority,
    escrowTokenAccount,
    instruction: ix(
      [
        { pubkey: protocolStatePda(), isSigner: false, isWritable: true },
        { pubkey: property, isSigner: false, isWritable: true },
        { pubkey: listing, isSigner: false, isWritable: true },
        { pubkey: input.valueMint, isSigner: false, isWritable: true },
        { pubkey: input.ownerTokenAccount, isSigner: false, isWritable: true },
        { pubkey: escrowAuthority, isSigner: false, isWritable: false },
        { pubkey: escrowTokenAccount, isSigner: false, isWritable: true },
        { pubkey: input.owner, isSigner: true, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      Buffer.concat([IX.createPrimarySaleListing, u64Le(input.amount)]),
    ),
  };
}

export function buyPrimarySaleListingIxs(input: {
  propertyId: bigint;
  listingId: bigint;
  buyer: PublicKey;
  seller: PublicKey;
  valueMint: PublicKey;
  escrowTokenAccount: PublicKey;
  amount: bigint;
  priceLamports: bigint;
  buyerTokenAccountExists: boolean;
}) {
  const property = propertyPda(input.propertyId);
  const listing = listingPda(property, input.listingId);
  const escrowAuthority = escrowAuthorityPda(listing);
  const buyerTokenAccount = getAssociatedTokenAddressSync(
    input.valueMint,
    input.buyer,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  const createAtaIx = input.buyerTokenAccountExists
    ? []
    : [
        createAssociatedTokenAccountInstruction(
          input.buyer,
          buyerTokenAccount,
          input.buyer,
          input.valueMint,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID,
        ),
      ];
  return {
    buyerTokenAccount,
    instructions: [
      ...createAtaIx,
      ix(
        [
          { pubkey: listing, isSigner: false, isWritable: true },
          { pubkey: property, isSigner: false, isWritable: true },
          { pubkey: input.buyer, isSigner: true, isWritable: true },
          { pubkey: input.seller, isSigner: false, isWritable: true },
          { pubkey: input.valueMint, isSigner: false, isWritable: true },
          { pubkey: escrowAuthority, isSigner: false, isWritable: false },
          { pubkey: input.escrowTokenAccount, isSigner: false, isWritable: true },
          { pubkey: buyerTokenAccount, isSigner: false, isWritable: true },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        Buffer.concat([
          IX.buyPrimarySaleListing,
          u64Le(input.amount),
          u64Le(input.priceLamports),
        ]),
      ),
    ],
  };
}

export function cancelPrimarySaleListingIx(input: {
  propertyId: bigint;
  listingId: bigint;
  seller: PublicKey;
  valueMint: PublicKey;
  escrowTokenAccount: PublicKey;
  sellerTokenAccount: PublicKey;
}) {
  const property = propertyPda(input.propertyId);
  const listing = listingPda(property, input.listingId);
  const escrowAuthority = escrowAuthorityPda(listing);
  return ix(
    [
      { pubkey: listing, isSigner: false, isWritable: true },
      { pubkey: property, isSigner: false, isWritable: true },
      { pubkey: input.seller, isSigner: true, isWritable: true },
      { pubkey: input.valueMint, isSigner: false, isWritable: true },
      { pubkey: escrowAuthority, isSigner: false, isWritable: false },
      { pubkey: input.escrowTokenAccount, isSigner: false, isWritable: true },
      { pubkey: input.sellerTokenAccount, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    IX.cancelPrimarySaleListing,
  );
}
