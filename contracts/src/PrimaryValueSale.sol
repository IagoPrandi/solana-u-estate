// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {PropertyRegistry} from "./PropertyRegistry.sol";
import {PropertyValueToken} from "./PropertyValueToken.sol";
import {ProtocolTypes} from "./libraries/ProtocolTypes.sol";

contract PrimaryValueSale {
    address public immutable registry;
    uint256 private reentrancyLock;

    uint256 public nextListingId = 1;

    mapping(uint256 => bool) public listingExists;
    mapping(uint256 => ProtocolTypes.PrimarySaleListing) public listings;

    uint256[] private listingIds;
    mapping(uint256 => uint256[]) private listingsByProperty;
    mapping(uint256 => uint256) public activeListingsCountByProperty;
    mapping(uint256 => uint256) public totalFreeValueSoldByProperty;
    mapping(uint256 => uint256) public activeEscrowedAmountByProperty;

    error Unauthorized();
    error ZeroAddress();
    error PropertyNotFound();
    error InvalidPropertyStatus();
    error InvalidAmount();
    error InsufficientBalance();
    error PriceZero();
    error ListingNotFound();
    error ListingNotActive();
    error InvalidPaymentAmount();
    error SellerCannotBuyOwnListing();
    error EthTransferFailed();
    error Reentrancy();
    error SellerOnly();

    event PrimarySaleListed(
        uint256 indexed listingId,
        uint256 indexed propertyId,
        address indexed seller,
        uint256 amount,
        uint256 priceWei
    );
    event TokensEscrowed(
        uint256 indexed listingId,
        address indexed seller,
        uint256 amount
    );
    event ListingStatusUpdated(
        uint256 indexed listingId,
        ProtocolTypes.SaleStatus previousStatus,
        ProtocolTypes.SaleStatus newStatus
    );
    event PrimarySalePurchased(
        uint256 indexed listingId,
        uint256 indexed propertyId,
        address indexed buyer,
        address seller,
        uint256 amount,
        uint256 priceWei
    );
    event SellerPaid(
        uint256 indexed listingId,
        address indexed seller,
        uint256 amountWei
    );
    event PrimarySaleCancelled(
        uint256 indexed listingId,
        uint256 indexed propertyId,
        address indexed seller,
        uint256 amount
    );

    constructor(address registry_) {
        if (registry_ == address(0)) {
            revert ZeroAddress();
        }

        registry = registry_;
    }

    modifier nonReentrant() {
        if (reentrancyLock != 0) {
            revert Reentrancy();
        }

        reentrancyLock = 1;
        _;
        reentrancyLock = 0;
    }

    function createPrimarySaleListing(
        uint256 propertyId,
        uint256 amount
    ) external nonReentrant returns (uint256 listingId) {
        PropertyRegistry registryContract = PropertyRegistry(registry);

        if (!registryContract.propertyExists(propertyId)) {
            revert PropertyNotFound();
        }

        (
            ,
            address owner,
            uint256 marketValueWei,
            ,
            ,
            ,
            ,
            ,
            ,
            address valueTokenAddress,
            ProtocolTypes.PropertyStatus propertyStatus
        ) = registryContract.properties(propertyId);

        if (
            propertyStatus != ProtocolTypes.PropertyStatus.Tokenized &&
            propertyStatus != ProtocolTypes.PropertyStatus.ActiveSale
        ) {
            revert InvalidPropertyStatus();
        }

        if (msg.sender != owner) {
            revert Unauthorized();
        }

        if (amount == 0) {
            revert InvalidAmount();
        }

        PropertyValueToken valueToken = PropertyValueToken(valueTokenAddress);
        if (amount > valueToken.balanceOf(msg.sender)) {
            revert InsufficientBalance();
        }

        uint256 priceWei = (marketValueWei * amount) /
            ProtocolTypes.TOTAL_VALUE_UNITS;
        if (priceWei == 0) {
            revert PriceZero();
        }

        listingId = nextListingId;
        unchecked {
            nextListingId = listingId + 1;
        }

        listingExists[listingId] = true;
        valueToken.operatorTransfer(msg.sender, address(this), amount);

        activeEscrowedAmountByProperty[propertyId] += amount;
        activeListingsCountByProperty[propertyId] += 1;

        listings[listingId] = ProtocolTypes.PrimarySaleListing({
            listingId: listingId,
            propertyId: propertyId,
            seller: msg.sender,
            amount: amount,
            priceWei: priceWei,
            status: ProtocolTypes.SaleStatus.Active
        });

        listingIds.push(listingId);
        listingsByProperty[propertyId].push(listingId);

        registryContract.syncPropertySaleStatus(
            propertyId,
            ProtocolTypes.PropertyStatus.ActiveSale
        );

        emit PrimarySaleListed(
            listingId,
            propertyId,
            msg.sender,
            amount,
            priceWei
        );
        emit TokensEscrowed(listingId, msg.sender, amount);
    }

    function buyPrimarySaleListing(
        uint256 listingId,
        uint256 amount
    ) external payable nonReentrant {
        if (!listingExists[listingId]) {
            revert ListingNotFound();
        }

        ProtocolTypes.PrimarySaleListing storage listing = listings[listingId];
        if (listing.status != ProtocolTypes.SaleStatus.Active) {
            revert ListingNotActive();
        }

        if (msg.sender == listing.seller) {
            revert SellerCannotBuyOwnListing();
        }

        if (amount == 0 || amount > listing.amount) {
            revert InvalidAmount();
        }

        PropertyRegistry registryContract = PropertyRegistry(registry);
        if (!registryContract.propertyExists(listing.propertyId)) {
            revert PropertyNotFound();
        }

        (
            ,
            ,
            uint256 marketValueWei,
            ,
            ,
            uint256 freeValueUnits,
            ,
            ,
            ,
            address valueTokenAddress,
            ProtocolTypes.PropertyStatus propertyStatus
        ) = registryContract.properties(listing.propertyId);

        if (
            propertyStatus != ProtocolTypes.PropertyStatus.ActiveSale &&
            propertyStatus != ProtocolTypes.PropertyStatus.Tokenized
        ) {
            revert InvalidPropertyStatus();
        }

        uint256 payWei = (marketValueWei * amount) /
            ProtocolTypes.TOTAL_VALUE_UNITS;
        if (payWei == 0) {
            revert PriceZero();
        }
        if (msg.value != payWei) {
            revert InvalidPaymentAmount();
        }

        listing.amount -= amount;
        listing.priceWei = listing.priceWei > payWei
            ? listing.priceWei - payWei
            : 0;

        unchecked {
            activeEscrowedAmountByProperty[listing.propertyId] -= amount;
        }
        totalFreeValueSoldByProperty[listing.propertyId] += amount;

        bool listingFilled = listing.amount == 0;
        ProtocolTypes.SaleStatus previousStatus = listing.status;
        if (listingFilled) {
            listing.status = ProtocolTypes.SaleStatus.Filled;
            unchecked {
                activeListingsCountByProperty[listing.propertyId] -= 1;
            }
        }

        ProtocolTypes.PropertyStatus nextPropertyStatus;
        if (totalFreeValueSoldByProperty[listing.propertyId] == freeValueUnits) {
            nextPropertyStatus = ProtocolTypes.PropertyStatus.SoldOut;
        } else if (activeListingsCountByProperty[listing.propertyId] > 0) {
            nextPropertyStatus = ProtocolTypes.PropertyStatus.ActiveSale;
        } else {
            nextPropertyStatus = ProtocolTypes.PropertyStatus.Tokenized;
        }

        registryContract.syncPropertySaleStatus(listing.propertyId, nextPropertyStatus);
        registryContract.addParticipantFromSale(listing.propertyId, msg.sender);

        if (listingFilled) {
            emit ListingStatusUpdated(
                listingId,
                previousStatus,
                ProtocolTypes.SaleStatus.Filled
            );
        }

        PropertyValueToken(valueTokenAddress).operatorTransfer(
            address(this),
            msg.sender,
            amount
        );

        (bool ok, ) = listing.seller.call{value: payWei}("");
        if (!ok) {
            revert EthTransferFailed();
        }

        emit PrimarySalePurchased(
            listingId,
            listing.propertyId,
            msg.sender,
            listing.seller,
            amount,
            payWei
        );
        emit SellerPaid(listingId, listing.seller, payWei);
    }

    function cancelPrimarySaleListing(uint256 listingId) external nonReentrant {
        if (!listingExists[listingId]) {
            revert ListingNotFound();
        }

        ProtocolTypes.PrimarySaleListing storage listing = listings[listingId];
        if (listing.status != ProtocolTypes.SaleStatus.Active) {
            revert ListingNotActive();
        }

        if (msg.sender != listing.seller) {
            revert SellerOnly();
        }

        PropertyRegistry registryContract = PropertyRegistry(registry);
        if (!registryContract.propertyExists(listing.propertyId)) {
            revert PropertyNotFound();
        }

        (
            ,
            ,
            ,
            ,
            ,
            ,
            ,
            ,
            ,
            address valueTokenAddress,
            ProtocolTypes.PropertyStatus propertyStatus
        ) = registryContract.properties(listing.propertyId);

        if (
            propertyStatus != ProtocolTypes.PropertyStatus.ActiveSale &&
            propertyStatus != ProtocolTypes.PropertyStatus.Tokenized
        ) {
            revert InvalidPropertyStatus();
        }

        ProtocolTypes.SaleStatus previousStatus = listing.status;
        listing.status = ProtocolTypes.SaleStatus.Cancelled;

        unchecked {
            activeListingsCountByProperty[listing.propertyId] -= 1;
            activeEscrowedAmountByProperty[listing.propertyId] -= listing.amount;
        }

        ProtocolTypes.PropertyStatus nextPropertyStatus;
        if (activeListingsCountByProperty[listing.propertyId] > 0) {
            nextPropertyStatus = ProtocolTypes.PropertyStatus.ActiveSale;
        } else {
            nextPropertyStatus = ProtocolTypes.PropertyStatus.Tokenized;
        }

        registryContract.syncPropertySaleStatus(listing.propertyId, nextPropertyStatus);

        emit ListingStatusUpdated(
            listingId,
            previousStatus,
            ProtocolTypes.SaleStatus.Cancelled
        );

        PropertyValueToken(valueTokenAddress).operatorTransfer(
            address(this),
            listing.seller,
            listing.amount
        );

        emit PrimarySaleCancelled(
            listingId,
            listing.propertyId,
            listing.seller,
            listing.amount
        );
    }

    function getListingIds() external view returns (uint256[] memory) {
        return listingIds;
    }

    function getListingsByProperty(
        uint256 propertyId
    ) external view returns (uint256[] memory) {
        return listingsByProperty[propertyId];
    }
}
