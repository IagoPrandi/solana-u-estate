import { Buffer } from "buffer";
import { Connection, PublicKey, type GetProgramAccountsFilter } from "@solana/web3.js";
import { usufructProgramId } from "@/lib/solana/config";
import {
  ACCOUNT_SPACE,
  LISTING_OFFSETS,
  PROPERTY_OFFSETS,
  PROTOCOL_STATE_OFFSETS,
  USUFRUCT_POSITION_OFFSETS,
} from "@/lib/solana/offsets";

export const TOTAL_VALUE_UNITS = 1_000_000n;
export const BPS_DENOMINATOR = 10_000n;

export const SEEDS = {
  protocolState: "protocol_state",
  property: "property",
  usufructPosition: "usufruct_position",
  listing: "listing",
  escrowAuthority: "escrow_authority",
  valueMintAuthority: "value_mint_authority",
} as const;

export const PROPERTY_STATUSES = [
  "PendingMockVerification",
  "MockVerified",
  "Tokenized",
  "ActiveSale",
  "SoldOut",
] as const;

export const SALE_STATUSES = ["Active", "Filled", "Cancelled"] as const;

export type SolanaPropertyStatus = (typeof PROPERTY_STATUSES)[number];
export type SolanaSaleStatus = (typeof SALE_STATUSES)[number];

export type DecodedProtocolState = {
  admin: PublicKey;
  mockVerifier: PublicKey;
  nextPropertyId: bigint;
  nextListingId: bigint;
  bump: number;
};

export type DecodedPropertyAccount = {
  address: PublicKey;
  propertyId: bigint;
  owner: PublicKey;
  marketValueLamports: bigint;
  totalValueUnits: bigint;
  linkedValueUnits: bigint;
  freeValueUnits: bigint;
  linkedValueBps: number;
  valueMint: PublicKey;
  usufructPosition: PublicKey;
  activeListingsCount: bigint;
  totalFreeValueSold: bigint;
  activeEscrowedAmount: bigint;
  status: SolanaPropertyStatus;
  bump: number;
};

export type DecodedListingAccount = {
  address: PublicKey;
  listingId: bigint;
  property: PublicKey;
  propertyId: bigint;
  seller: PublicKey;
  valueMint: PublicKey;
  sellerTokenAccount: PublicKey;
  escrowTokenAccount: PublicKey;
  escrowAuthority: PublicKey;
  amount: bigint;
  priceLamports: bigint;
  status: SolanaSaleStatus;
  bump: number;
};

export type DecodedUsufructPositionAccount = {
  address: PublicKey;
  property: PublicKey;
  propertyId: bigint;
  holder: PublicKey;
  linkedValueUnits: bigint;
  linkedValueBps: number;
  active: boolean;
  bump: number;
};

export function requireUsufructProgramId() {
  if (!usufructProgramId) {
    throw new Error("NEXT_PUBLIC_USUFRUCT_PROGRAM_ID is required.");
  }
  return usufructProgramId;
}

export function u64Le(value: bigint | number | string) {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64LE(BigInt(value));
  return buffer;
}

export function u16Le(value: number) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value);
  return buffer;
}

export function pubkeyAt(data: Buffer, offset: number) {
  return new PublicKey(data.subarray(offset, offset + 32));
}

export function u64At(data: Buffer, offset: number) {
  return data.readBigUInt64LE(offset);
}

export function protocolStatePda(programId = requireUsufructProgramId()) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.protocolState)],
    programId,
  )[0];
}

export function propertyPda(
  propertyId: bigint | number | string,
  programId = requireUsufructProgramId(),
) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.property), u64Le(propertyId)],
    programId,
  )[0];
}

export function usufructPositionPda(
  property: PublicKey,
  programId = requireUsufructProgramId(),
) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.usufructPosition), property.toBuffer()],
    programId,
  )[0];
}

export function valueMintAuthorityPda(
  property: PublicKey,
  programId = requireUsufructProgramId(),
) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.valueMintAuthority), property.toBuffer()],
    programId,
  )[0];
}

export function listingPda(
  property: PublicKey,
  listingId: bigint | number | string,
  programId = requireUsufructProgramId(),
) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.listing), property.toBuffer(), u64Le(listingId)],
    programId,
  )[0];
}

export function escrowAuthorityPda(
  listing: PublicKey,
  programId = requireUsufructProgramId(),
) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.escrowAuthority), listing.toBuffer()],
    programId,
  )[0];
}

export function decodeProtocolState(data: Buffer): DecodedProtocolState {
  return {
    admin: pubkeyAt(data, PROTOCOL_STATE_OFFSETS.admin),
    mockVerifier: pubkeyAt(data, PROTOCOL_STATE_OFFSETS.mockVerifier),
    nextPropertyId: u64At(data, PROTOCOL_STATE_OFFSETS.nextPropertyId),
    nextListingId: u64At(data, PROTOCOL_STATE_OFFSETS.nextListingId),
    bump: data[PROTOCOL_STATE_OFFSETS.bump],
  };
}

export function decodePropertyAccount(
  address: PublicKey,
  data: Buffer,
): DecodedPropertyAccount {
  return {
    address,
    propertyId: u64At(data, PROPERTY_OFFSETS.propertyId),
    owner: pubkeyAt(data, PROPERTY_OFFSETS.owner),
    marketValueLamports: u64At(data, PROPERTY_OFFSETS.marketValueLamports),
    totalValueUnits: u64At(data, PROPERTY_OFFSETS.totalValueUnits),
    linkedValueUnits: u64At(data, PROPERTY_OFFSETS.linkedValueUnits),
    freeValueUnits: u64At(data, PROPERTY_OFFSETS.freeValueUnits),
    linkedValueBps: data.readUInt16LE(PROPERTY_OFFSETS.linkedValueBps),
    valueMint: pubkeyAt(data, PROPERTY_OFFSETS.valueMint),
    usufructPosition: pubkeyAt(data, PROPERTY_OFFSETS.usufructPosition),
    activeListingsCount: u64At(data, PROPERTY_OFFSETS.activeListingsCount),
    totalFreeValueSold: u64At(data, PROPERTY_OFFSETS.totalFreeValueSold),
    activeEscrowedAmount: u64At(data, PROPERTY_OFFSETS.activeEscrowedAmount),
    status: PROPERTY_STATUSES[data[PROPERTY_OFFSETS.status]],
    bump: data[PROPERTY_OFFSETS.bump],
  };
}

export function decodeListingAccount(
  address: PublicKey,
  data: Buffer,
): DecodedListingAccount {
  return {
    address,
    listingId: u64At(data, LISTING_OFFSETS.listingId),
    property: pubkeyAt(data, LISTING_OFFSETS.property),
    propertyId: u64At(data, LISTING_OFFSETS.propertyId),
    seller: pubkeyAt(data, LISTING_OFFSETS.seller),
    valueMint: pubkeyAt(data, LISTING_OFFSETS.valueMint),
    sellerTokenAccount: pubkeyAt(data, LISTING_OFFSETS.sellerTokenAccount),
    escrowTokenAccount: pubkeyAt(data, LISTING_OFFSETS.escrowTokenAccount),
    escrowAuthority: pubkeyAt(data, LISTING_OFFSETS.escrowAuthority),
    amount: u64At(data, LISTING_OFFSETS.amount),
    priceLamports: u64At(data, LISTING_OFFSETS.priceLamports),
    status: SALE_STATUSES[data[LISTING_OFFSETS.status]],
    bump: data[LISTING_OFFSETS.bump],
  };
}

export function decodeUsufructPositionAccount(
  address: PublicKey,
  data: Buffer,
): DecodedUsufructPositionAccount {
  return {
    address,
    property: pubkeyAt(data, USUFRUCT_POSITION_OFFSETS.property),
    propertyId: u64At(data, USUFRUCT_POSITION_OFFSETS.propertyId),
    holder: pubkeyAt(data, USUFRUCT_POSITION_OFFSETS.holder),
    linkedValueUnits: u64At(data, USUFRUCT_POSITION_OFFSETS.linkedValueUnits),
    linkedValueBps: data.readUInt16LE(USUFRUCT_POSITION_OFFSETS.linkedValueBps),
    active: data[USUFRUCT_POSITION_OFFSETS.active] === 1,
    bump: data[USUFRUCT_POSITION_OFFSETS.bump],
  };
}

export async function fetchProtocolState(connection: Connection) {
  const address = protocolStatePda();
  const account = await connection.getAccountInfo(address, "confirmed");
  return account ? decodeProtocolState(Buffer.from(account.data)) : null;
}

export async function fetchPropertyAccount(
  connection: Connection,
  propertyId: bigint | number | string,
) {
  const address = propertyPda(propertyId);
  const account = await connection.getAccountInfo(address, "confirmed");
  return account ? decodePropertyAccount(address, Buffer.from(account.data)) : null;
}

export async function fetchListingAccount(
  connection: Connection,
  property: PublicKey,
  listingId: bigint | number | string,
) {
  const address = listingPda(property, listingId);
  const account = await connection.getAccountInfo(address, "confirmed");
  return account ? decodeListingAccount(address, Buffer.from(account.data)) : null;
}

export async function getProgramPropertyAccounts(
  connection: Connection,
  filters: GetProgramAccountsFilter[] = [],
) {
  const accounts = await connection.getProgramAccounts(requireUsufructProgramId(), {
    commitment: "confirmed",
    filters: [{ dataSize: ACCOUNT_SPACE.property }, ...filters],
  });
  return accounts.map((account) =>
    decodePropertyAccount(account.pubkey, Buffer.from(account.account.data)),
  );
}

export async function getProgramListingAccounts(
  connection: Connection,
  filters: GetProgramAccountsFilter[] = [],
) {
  const accounts = await connection.getProgramAccounts(requireUsufructProgramId(), {
    commitment: "confirmed",
    filters: [{ dataSize: ACCOUNT_SPACE.listing }, ...filters],
  });
  return accounts.map((account) =>
    decodeListingAccount(account.pubkey, Buffer.from(account.account.data)),
  );
}

export async function getProgramUsufructPositionAccounts(
  connection: Connection,
  filters: GetProgramAccountsFilter[] = [],
) {
  const accounts = await connection.getProgramAccounts(requireUsufructProgramId(), {
    commitment: "confirmed",
    filters: [{ dataSize: ACCOUNT_SPACE.usufructPosition }, ...filters],
  });
  return accounts.map((account) =>
    decodeUsufructPositionAccount(
      account.pubkey,
      Buffer.from(account.account.data),
    ),
  );
}

export function propertyOwnerMemcmp(owner: PublicKey) {
  return { memcmp: { offset: PROPERTY_OFFSETS.owner, bytes: owner.toBase58() } };
}

export function listingSellerMemcmp(seller: PublicKey) {
  return { memcmp: { offset: LISTING_OFFSETS.seller, bytes: seller.toBase58() } };
}

export function usufructHolderMemcmp(holder: PublicKey) {
  return {
    memcmp: {
      offset: USUFRUCT_POSITION_OFFSETS.holder,
      bytes: holder.toBase58(),
    },
  };
}
