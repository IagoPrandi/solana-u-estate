"use client";

export const primaryValueSaleAbi = [
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "createPrimarySaleListing",
    inputs: [
      { name: "propertyId", type: "uint256" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "listingId", type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "payable",
    name: "buyPrimarySaleListing",
    inputs: [
      { name: "listingId", type: "uint256" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "listingExists",
    inputs: [{ name: "listingId", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "listings",
    inputs: [{ name: "listingId", type: "uint256" }],
    outputs: [
      { name: "listingId", type: "uint256" },
      { name: "propertyId", type: "uint256" },
      { name: "seller", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "priceWei", type: "uint256" },
      { name: "status", type: "uint8" },
    ],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "cancelPrimarySaleListing",
    inputs: [{ name: "listingId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "event",
    anonymous: false,
    name: "PrimarySaleListed",
    inputs: [
      { indexed: true, name: "listingId", type: "uint256" },
      { indexed: true, name: "propertyId", type: "uint256" },
      { indexed: true, name: "seller", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: false, name: "priceWei", type: "uint256" },
    ],
  },
  {
    type: "event",
    anonymous: false,
    name: "TokensEscrowed",
    inputs: [
      { indexed: true, name: "listingId", type: "uint256" },
      { indexed: true, name: "seller", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
    ],
  },
  {
    type: "event",
    anonymous: false,
    name: "ListingStatusUpdated",
    inputs: [
      { indexed: true, name: "listingId", type: "uint256" },
      { indexed: false, name: "previousStatus", type: "uint8" },
      { indexed: false, name: "newStatus", type: "uint8" },
    ],
  },
  {
    type: "event",
    anonymous: false,
    name: "PrimarySalePurchased",
    inputs: [
      { indexed: true, name: "listingId", type: "uint256" },
      { indexed: true, name: "propertyId", type: "uint256" },
      { indexed: true, name: "buyer", type: "address" },
      { indexed: false, name: "seller", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: false, name: "priceWei", type: "uint256" },
    ],
  },
  {
    type: "event",
    anonymous: false,
    name: "SellerPaid",
    inputs: [
      { indexed: true, name: "listingId", type: "uint256" },
      { indexed: true, name: "seller", type: "address" },
      { indexed: false, name: "amountWei", type: "uint256" },
    ],
  },
  {
    type: "event",
    anonymous: false,
    name: "PrimarySaleCancelled",
    inputs: [
      { indexed: true, name: "listingId", type: "uint256" },
      { indexed: true, name: "propertyId", type: "uint256" },
      { indexed: true, name: "seller", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
    ],
  },
] as const;
