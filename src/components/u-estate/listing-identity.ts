import type { Listing } from "./types";

export function listingIdentity(listing: Listing) {
  return [
    listing.localPropertyId ?? "external",
    listing.propertyId,
    listing.listingId,
    listing.txHash,
  ].join(":");
}

export function matchesListingIdentity(listing: Listing, id: string | undefined) {
  if (!id) return false;
  return listingIdentity(listing) === id || listing.listingId === id;
}
