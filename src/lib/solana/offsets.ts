export const ANCHOR_DISCRIMINATOR_SIZE = 8;

export const ACCOUNT_SPACE = {
  protocolState: 121,
  property: 300,
  usufructPosition: 124,
  listing: 266,
} as const;

export const PROPERTY_OFFSETS = {
  propertyId: 8,
  owner: 16,
  marketValueLamports: 48,
  totalValueUnits: 56,
  linkedValueUnits: 64,
  freeValueUnits: 72,
  linkedValueBps: 80,
  metadataHash: 82,
  documentsHash: 114,
  locationHash: 146,
  valueMint: 178,
  usufructPosition: 210,
  activeListingsCount: 242,
  totalFreeValueSold: 250,
  activeEscrowedAmount: 258,
  status: 266,
  bump: 267,
  reserved: 268,
} as const;

export const LISTING_OFFSETS = {
  listingId: 8,
  property: 16,
  propertyId: 48,
  seller: 56,
  valueMint: 88,
  sellerTokenAccount: 120,
  escrowTokenAccount: 152,
  escrowAuthority: 184,
  amount: 216,
  priceLamports: 224,
  status: 232,
  bump: 233,
  reserved: 234,
} as const;

export const USUFRUCT_POSITION_OFFSETS = {
  property: 8,
  propertyId: 40,
  holder: 48,
  linkedValueUnits: 80,
  linkedValueBps: 88,
  active: 90,
  bump: 91,
  reserved: 92,
} as const;

export const PROTOCOL_STATE_OFFSETS = {
  admin: 8,
  mockVerifier: 40,
  nextPropertyId: 72,
  nextListingId: 80,
  bump: 88,
  reserved: 89,
} as const;
