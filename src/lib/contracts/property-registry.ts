"use client";

import { isAddress, type Address } from "viem";

const propertyRegistryAddressValue =
  process.env.NEXT_PUBLIC_PROPERTY_REGISTRY_ADDRESS?.trim();

if (
  propertyRegistryAddressValue &&
  !isAddress(propertyRegistryAddressValue)
) {
  throw new Error(
    "NEXT_PUBLIC_PROPERTY_REGISTRY_ADDRESS must be a valid EVM address.",
  );
}

export const propertyRegistryAddress = propertyRegistryAddressValue
  ? (propertyRegistryAddressValue as Address)
  : undefined;

export const propertyRegistryAbi = [
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "registerProperty",
    inputs: [
      { name: "marketValueWei", type: "uint256" },
      { name: "linkedValueBps", type: "uint16" },
      { name: "metadataHash", type: "bytes32" },
      { name: "documentsHash", type: "bytes32" },
      { name: "locationHash", type: "bytes32" },
    ],
    outputs: [{ name: "propertyId", type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "mockVerifyProperty",
    inputs: [{ name: "propertyId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "tokenizeProperty",
    inputs: [{ name: "propertyId", type: "uint256" }],
    outputs: [{ name: "valueToken", type: "address" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "primaryValueSale",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "properties",
    inputs: [{ name: "propertyId", type: "uint256" }],
    outputs: [
      { name: "propertyId", type: "uint256" },
      { name: "owner", type: "address" },
      { name: "marketValueWei", type: "uint256" },
      { name: "linkedValueBps", type: "uint16" },
      { name: "linkedValueUnits", type: "uint256" },
      { name: "freeValueUnits", type: "uint256" },
      { name: "metadataHash", type: "bytes32" },
      { name: "documentsHash", type: "bytes32" },
      { name: "locationHash", type: "bytes32" },
      { name: "valueToken", type: "address" },
      { name: "status", type: "uint8" },
    ],
  },
  {
    type: "event",
    anonymous: false,
    name: "PropertyRegistered",
    inputs: [
      { indexed: true, name: "propertyId", type: "uint256" },
      { indexed: true, name: "owner", type: "address" },
      { indexed: false, name: "marketValueWei", type: "uint256" },
      { indexed: false, name: "linkedValueBps", type: "uint16" },
      { indexed: false, name: "linkedValueUnits", type: "uint256" },
      { indexed: false, name: "freeValueUnits", type: "uint256" },
      { indexed: false, name: "metadataHash", type: "bytes32" },
      { indexed: false, name: "documentsHash", type: "bytes32" },
      { indexed: false, name: "locationHash", type: "bytes32" },
      { indexed: false, name: "status", type: "uint8" },
    ],
  },
  {
    type: "event",
    anonymous: false,
    name: "PropertyMockVerified",
    inputs: [
      { indexed: true, name: "propertyId", type: "uint256" },
      { indexed: true, name: "verifier", type: "address" },
      { indexed: true, name: "owner", type: "address" },
    ],
  },
  {
    type: "event",
    anonymous: false,
    name: "PropertyTokenized",
    inputs: [
      { indexed: true, name: "propertyId", type: "uint256" },
      { indexed: true, name: "owner", type: "address" },
      { indexed: true, name: "tokenId", type: "uint256" },
      { indexed: false, name: "linkedValueUnits", type: "uint256" },
      { indexed: false, name: "freeValueUnits", type: "uint256" },
    ],
  },
  {
    type: "event",
    anonymous: false,
    name: "PropertyValueTokenCreated",
    inputs: [
      { indexed: true, name: "propertyId", type: "uint256" },
      { indexed: true, name: "valueToken", type: "address" },
      { indexed: true, name: "owner", type: "address" },
      { indexed: false, name: "freeValueUnits", type: "uint256" },
      { indexed: false, name: "authorizedOperator", type: "address" },
    ],
  },
] as const;
