// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {ProtocolTypes} from "./libraries/ProtocolTypes.sol";
import {PropertyValueTokenFactory} from "./PropertyValueTokenFactory.sol";
import {UsufructRightNFT} from "./UsufructRightNFT.sol";

contract PropertyRegistry {
    bytes32 public constant MOCK_VERIFIER_ROLE =
        keccak256("MOCK_VERIFIER_ROLE");

    uint256 public nextPropertyId = 1;
    address public owner;
    address public usufructRightNft;
    address public propertyValueTokenFactory;
    address public primaryValueSale;

    mapping(uint256 => bool) public propertyExists;
    mapping(uint256 => ProtocolTypes.PropertyRecord) public properties;
    mapping(uint256 => ProtocolTypes.UsufructPosition) public usufructPositions;
    mapping(address => uint256[]) private propertiesByOwner;
    mapping(uint256 => address[]) private participants;
    mapping(uint256 => mapping(address => bool)) public isParticipantForProperty;
    mapping(bytes32 => mapping(address => bool)) private roles;

    error Unauthorized();
    error ZeroAddress();
    error PropertyNotFound();
    error InvalidPropertyStatus();
    error InvalidMarketValueWei();
    error InvalidLinkedValueBps();
    error InvalidMetadataHash();
    error InvalidDocumentsHash();
    error InvalidLocationHash();
    error ExternalContractsNotConfigured();

    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );
    event ExternalContractsConfigured(
        address usufructRightNft,
        address propertyValueTokenFactory,
        address primaryValueSale
    );
    event RoleGranted(
        bytes32 indexed role,
        address indexed account,
        address indexed sender
    );
    event RoleRevoked(
        bytes32 indexed role,
        address indexed account,
        address indexed sender
    );
    event PropertyRegistered(
        uint256 indexed propertyId,
        address indexed owner,
        uint256 marketValueWei,
        uint16 linkedValueBps,
        uint256 linkedValueUnits,
        uint256 freeValueUnits,
        bytes32 metadataHash,
        bytes32 documentsHash,
        bytes32 locationHash,
        ProtocolTypes.PropertyStatus status
    );
    event ParticipantAdded(uint256 indexed propertyId, address indexed participant);
    event PropertyMockVerified(
        uint256 indexed propertyId,
        address indexed verifier,
        address indexed owner
    );
    event PropertyStatusUpdated(
        uint256 indexed propertyId,
        ProtocolTypes.PropertyStatus previousStatus,
        ProtocolTypes.PropertyStatus newStatus
    );
    event PropertyTokenized(
        uint256 indexed propertyId,
        address indexed owner,
        uint256 indexed tokenId,
        uint256 linkedValueUnits,
        uint256 freeValueUnits
    );
    event PropertyValueTokenCreated(
        uint256 indexed propertyId,
        address indexed valueToken,
        address indexed owner,
        uint256 freeValueUnits,
        address authorizedOperator
    );

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    modifier onlyOwner() {
        if (msg.sender != owner) {
            revert Unauthorized();
        }

        _;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) {
            revert ZeroAddress();
        }

        address previousOwner = owner;
        owner = newOwner;

        emit OwnershipTransferred(previousOwner, newOwner);
    }

    function grantRole(bytes32 role, address account) external onlyOwner {
        if (account == address(0)) {
            revert ZeroAddress();
        }

        _grantRole(role, account);
    }

    function revokeRole(bytes32 role, address account) external onlyOwner {
        if (!roles[role][account]) {
            return;
        }

        roles[role][account] = false;
        emit RoleRevoked(role, account, msg.sender);
    }

    function hasRole(
        bytes32 role,
        address account
    ) public view returns (bool) {
        return roles[role][account];
    }

    function configureExternalContracts(
        address usufructRightNft_,
        address propertyValueTokenFactory_,
        address primaryValueSale_
    ) external onlyOwner {
        if (
            usufructRightNft_ == address(0) ||
            propertyValueTokenFactory_ == address(0) ||
            primaryValueSale_ == address(0)
        ) {
            revert ZeroAddress();
        }

        usufructRightNft = usufructRightNft_;
        propertyValueTokenFactory = propertyValueTokenFactory_;
        primaryValueSale = primaryValueSale_;

        emit ExternalContractsConfigured(
            usufructRightNft_,
            propertyValueTokenFactory_,
            primaryValueSale_
        );
    }

    function registerProperty(
        uint256 marketValueWei,
        uint16 linkedValueBps,
        bytes32 metadataHash,
        bytes32 documentsHash,
        bytes32 locationHash
    ) external returns (uint256 propertyId) {
        if (marketValueWei == 0) {
            revert InvalidMarketValueWei();
        }

        if (
            linkedValueBps == 0 || linkedValueBps >= ProtocolTypes.BPS_DENOMINATOR
        ) {
            revert InvalidLinkedValueBps();
        }

        if (metadataHash == bytes32(0)) {
            revert InvalidMetadataHash();
        }

        if (documentsHash == bytes32(0)) {
            revert InvalidDocumentsHash();
        }

        if (locationHash == bytes32(0)) {
            revert InvalidLocationHash();
        }

        propertyId = nextPropertyId;
        unchecked {
            nextPropertyId = propertyId + 1;
        }

        uint256 linkedValueUnits = (
            ProtocolTypes.TOTAL_VALUE_UNITS * linkedValueBps
        ) / ProtocolTypes.BPS_DENOMINATOR;
        uint256 freeValueUnits = ProtocolTypes.TOTAL_VALUE_UNITS - linkedValueUnits;

        properties[propertyId] = ProtocolTypes.PropertyRecord({
            propertyId: propertyId,
            owner: msg.sender,
            marketValueWei: marketValueWei,
            linkedValueBps: linkedValueBps,
            linkedValueUnits: linkedValueUnits,
            freeValueUnits: freeValueUnits,
            metadataHash: metadataHash,
            locationHash: locationHash,
            documentsHash: documentsHash,
            valueToken: address(0),
            status: ProtocolTypes.PropertyStatus.PendingMockVerification
        });

        propertyExists[propertyId] = true;
        propertiesByOwner[msg.sender].push(propertyId);
        _addParticipant(propertyId, msg.sender);

        emit PropertyRegistered(
            propertyId,
            msg.sender,
            marketValueWei,
            linkedValueBps,
            linkedValueUnits,
            freeValueUnits,
            metadataHash,
            documentsHash,
            locationHash,
            ProtocolTypes.PropertyStatus.PendingMockVerification
        );
    }

    function mockVerifyProperty(uint256 propertyId) external {
        if (!propertyExists[propertyId]) {
            revert PropertyNotFound();
        }

        ProtocolTypes.PropertyRecord storage property = properties[propertyId];
        if (
            property.status !=
            ProtocolTypes.PropertyStatus.PendingMockVerification
        ) {
            revert InvalidPropertyStatus();
        }

        if (
            msg.sender != property.owner &&
            !hasRole(MOCK_VERIFIER_ROLE, msg.sender)
        ) {
            revert Unauthorized();
        }

        ProtocolTypes.PropertyStatus previousStatus = property.status;
        property.status = ProtocolTypes.PropertyStatus.MockVerified;

        emit PropertyMockVerified(propertyId, msg.sender, property.owner);
        emit PropertyStatusUpdated(
            propertyId,
            previousStatus,
            ProtocolTypes.PropertyStatus.MockVerified
        );
    }

    function tokenizeProperty(
        uint256 propertyId
    ) external returns (address valueToken) {
        if (!propertyExists[propertyId]) {
            revert PropertyNotFound();
        }

        ProtocolTypes.PropertyRecord storage property = properties[propertyId];
        if (property.status != ProtocolTypes.PropertyStatus.MockVerified) {
            revert InvalidPropertyStatus();
        }

        if (msg.sender != property.owner) {
            revert Unauthorized();
        }

        if (
            usufructRightNft == address(0) ||
            propertyValueTokenFactory == address(0) ||
            primaryValueSale == address(0)
        ) {
            revert ExternalContractsNotConfigured();
        }

        UsufructRightNFT(usufructRightNft).mintFromRegistry(
            property.owner,
            propertyId
        );

        usufructPositions[propertyId] = ProtocolTypes.UsufructPosition({
            propertyId: propertyId,
            tokenId: propertyId,
            holder: property.owner,
            linkedValueUnits: property.linkedValueUnits,
            linkedValueBps: property.linkedValueBps,
            active: true
        });

        valueToken = PropertyValueTokenFactory(propertyValueTokenFactory)
            .createValueToken(
                propertyId,
                property.owner,
                property.freeValueUnits
            );

        property.valueToken = valueToken;

        ProtocolTypes.PropertyStatus previousStatus = property.status;
        property.status = ProtocolTypes.PropertyStatus.Tokenized;

        emit PropertyTokenized(
            propertyId,
            property.owner,
            propertyId,
            property.linkedValueUnits,
            property.freeValueUnits
        );
        emit PropertyValueTokenCreated(
            propertyId,
            valueToken,
            property.owner,
            property.freeValueUnits,
            primaryValueSale
        );
        emit PropertyStatusUpdated(
            propertyId,
            previousStatus,
            ProtocolTypes.PropertyStatus.Tokenized
        );
    }

    function syncPropertySaleStatus(
        uint256 propertyId,
        ProtocolTypes.PropertyStatus newStatus
    ) external {
        if (msg.sender != primaryValueSale) {
            revert Unauthorized();
        }

        if (!propertyExists[propertyId]) {
            revert PropertyNotFound();
        }

        ProtocolTypes.PropertyRecord storage property = properties[propertyId];
        ProtocolTypes.PropertyStatus currentStatus = property.status;

        if (newStatus == ProtocolTypes.PropertyStatus.ActiveSale) {
            if (
                currentStatus != ProtocolTypes.PropertyStatus.Tokenized &&
                currentStatus != ProtocolTypes.PropertyStatus.ActiveSale
            ) {
                revert InvalidPropertyStatus();
            }
        } else if (
            newStatus == ProtocolTypes.PropertyStatus.Tokenized ||
            newStatus == ProtocolTypes.PropertyStatus.SoldOut
        ) {
            if (
                currentStatus != ProtocolTypes.PropertyStatus.ActiveSale &&
                currentStatus != ProtocolTypes.PropertyStatus.Tokenized
            ) {
                revert InvalidPropertyStatus();
            }
        } else {
            revert InvalidPropertyStatus();
        }

        if (currentStatus == newStatus) {
            return;
        }

        property.status = newStatus;

        emit PropertyStatusUpdated(propertyId, currentStatus, newStatus);
    }

    function addParticipantFromSale(
        uint256 propertyId,
        address participant
    ) external {
        if (msg.sender != primaryValueSale) {
            revert Unauthorized();
        }

        if (!propertyExists[propertyId]) {
            revert PropertyNotFound();
        }

        if (participant == address(0)) {
            revert ZeroAddress();
        }

        _addParticipant(propertyId, participant);
    }

    function getPropertiesByOwner(
        address ownerAddress
    ) external view returns (uint256[] memory) {
        return propertiesByOwner[ownerAddress];
    }

    function getParticipants(
        uint256 propertyId
    ) external view returns (address[] memory) {
        return participants[propertyId];
    }

    function totalValueUnits() external pure returns (uint256) {
        return ProtocolTypes.TOTAL_VALUE_UNITS;
    }

    function bpsDenominator() external pure returns (uint16) {
        return ProtocolTypes.BPS_DENOMINATOR;
    }

    function _addParticipant(uint256 propertyId, address participant) internal {
        if (isParticipantForProperty[propertyId][participant]) {
            return;
        }

        isParticipantForProperty[propertyId][participant] = true;
        participants[propertyId].push(participant);

        emit ParticipantAdded(propertyId, participant);
    }

    function _grantRole(bytes32 role, address account) internal {
        if (roles[role][account]) {
            return;
        }

        roles[role][account] = true;
        emit RoleGranted(role, account, msg.sender);
    }
}
