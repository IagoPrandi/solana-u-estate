// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

library ProtocolTypes {
    uint256 internal constant TOTAL_VALUE_UNITS = 1_000_000;
    uint16 internal constant BPS_DENOMINATOR = 10_000;

    enum PropertyStatus {
        None,
        PendingMockVerification,
        MockVerified,
        Tokenized,
        ActiveSale,
        SoldOut
    }

    enum SaleStatus {
        None,
        Active,
        Filled,
        Cancelled
    }

    struct PropertyRecord {
        uint256 propertyId;
        address owner;
        uint256 marketValueWei;
        uint16 linkedValueBps;
        uint256 linkedValueUnits;
        uint256 freeValueUnits;
        bytes32 metadataHash;
        bytes32 locationHash;
        bytes32 documentsHash;
        address valueToken;
        PropertyStatus status;
    }

    struct UsufructPosition {
        uint256 propertyId;
        uint256 tokenId;
        address holder;
        uint256 linkedValueUnits;
        uint16 linkedValueBps;
        bool active;
    }

    struct PrimarySaleListing {
        uint256 listingId;
        uint256 propertyId;
        address seller;
        uint256 amount;
        uint256 priceWei;
        SaleStatus status;
    }
}
