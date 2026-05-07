// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {PrimaryValueSale} from "../src/PrimaryValueSale.sol";
import {PropertyRegistry} from "../src/PropertyRegistry.sol";
import {PropertyValueToken} from "../src/PropertyValueToken.sol";
import {PropertyValueTokenFactory} from "../src/PropertyValueTokenFactory.sol";
import {ProtocolTypes} from "../src/libraries/ProtocolTypes.sol";
import {UsufructRightNFT} from "../src/UsufructRightNFT.sol";

interface Vm {
    function expectRevert(bytes calldata revertData) external;
    function prank(address caller) external;
    function deal(address who, uint256 newBalance) external;
}

contract PropertyRegistryTest {
    Vm internal constant vm =
        Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    PropertyRegistry internal registry;
    PrimaryValueSale internal sale;
    UsufructRightNFT internal usufructRightNft;
    PropertyValueTokenFactory internal factory;

    address internal constant ALICE = address(0xA11CE);
    address internal constant BOB = address(0xB0B);
    bytes32 internal constant METADATA_HASH = bytes32(uint256(1));
    bytes32 internal constant DOCUMENTS_HASH = bytes32(uint256(2));
    bytes32 internal constant LOCATION_HASH = bytes32(uint256(3));

    function setUp() public {
        registry = new PropertyRegistry();
        sale = new PrimaryValueSale(address(registry));
        usufructRightNft = new UsufructRightNFT(address(registry));
        factory = new PropertyValueTokenFactory(
            address(registry),
            address(sale)
        );

        registry.configureExternalContracts(
            address(usufructRightNft),
            address(factory),
            address(sale)
        );
    }

    function testRegisterPropertyStoresRecordAndIndexesOwner() external {
        vm.prank(ALICE);
        uint256 propertyId = registry.registerProperty(
            10 ether,
            2_000,
            METADATA_HASH,
            DOCUMENTS_HASH,
            LOCATION_HASH
        );

        require(propertyId == 1, "property id mismatch");
        require(registry.propertyExists(propertyId), "propertyExists false");
        require(registry.nextPropertyId() == 2, "nextPropertyId mismatch");

        (
            uint256 storedPropertyId,
            address storedOwner,
            uint256 marketValueWei,
            uint16 linkedValueBps,
            uint256 linkedValueUnits,
            uint256 freeValueUnits,
            bytes32 metadataHash,
            bytes32 locationHash,
            bytes32 documentsHash,
            address valueToken,
            ProtocolTypes.PropertyStatus status
        ) = registry.properties(propertyId);

        require(storedPropertyId == propertyId, "stored property id mismatch");
        require(storedOwner == ALICE, "stored owner mismatch");
        require(marketValueWei == 10 ether, "market value mismatch");
        require(linkedValueBps == 2_000, "linked bps mismatch");
        require(linkedValueUnits == 200_000, "linked units mismatch");
        require(freeValueUnits == 800_000, "free units mismatch");
        require(metadataHash == METADATA_HASH, "metadata hash mismatch");
        require(locationHash == LOCATION_HASH, "location hash mismatch");
        require(documentsHash == DOCUMENTS_HASH, "documents hash mismatch");
        require(valueToken == address(0), "value token should be empty");
        require(
            uint8(status) ==
                uint8(ProtocolTypes.PropertyStatus.PendingMockVerification),
            "status mismatch"
        );

        uint256[] memory ownerProperties = registry.getPropertiesByOwner(ALICE);
        require(ownerProperties.length == 1, "owner property count mismatch");
        require(ownerProperties[0] == propertyId, "owner property id mismatch");

        address[] memory propertyParticipants = registry.getParticipants(
            propertyId
        );
        require(
            propertyParticipants.length == 1,
            "participant count mismatch"
        );
        require(propertyParticipants[0] == ALICE, "participant mismatch");
        require(
            registry.isParticipantForProperty(propertyId, ALICE),
            "participant flag mismatch"
        );
    }

    function testRegisterPropertyTracksPropertiesPerOwner() external {
        vm.prank(ALICE);
        registry.registerProperty(
            10 ether,
            2_000,
            METADATA_HASH,
            DOCUMENTS_HASH,
            LOCATION_HASH
        );

        vm.prank(ALICE);
        registry.registerProperty(
            5 ether,
            1_500,
            bytes32(uint256(4)),
            bytes32(uint256(5)),
            bytes32(uint256(6))
        );

        vm.prank(BOB);
        registry.registerProperty(
            8 ether,
            2_500,
            bytes32(uint256(7)),
            bytes32(uint256(8)),
            bytes32(uint256(9))
        );

        uint256[] memory aliceProperties = registry.getPropertiesByOwner(ALICE);
        uint256[] memory bobProperties = registry.getPropertiesByOwner(BOB);

        require(aliceProperties.length == 2, "alice property count mismatch");
        require(aliceProperties[0] == 1, "alice property #1 mismatch");
        require(aliceProperties[1] == 2, "alice property #2 mismatch");
        require(bobProperties.length == 1, "bob property count mismatch");
        require(bobProperties[0] == 3, "bob property mismatch");
    }

    function testRegisterPropertyRejectsInvalidMarketValue() external {
        vm.prank(ALICE);
        vm.expectRevert(
            abi.encodeWithSelector(PropertyRegistry.InvalidMarketValueWei.selector)
        );

        registry.registerProperty(
            0,
            2_000,
            METADATA_HASH,
            DOCUMENTS_HASH,
            LOCATION_HASH
        );
    }

    function testRegisterPropertyRejectsInvalidLinkedValueBps() external {
        vm.prank(ALICE);
        vm.expectRevert(
            abi.encodeWithSelector(PropertyRegistry.InvalidLinkedValueBps.selector)
        );
        registry.registerProperty(
            10 ether,
            0,
            METADATA_HASH,
            DOCUMENTS_HASH,
            LOCATION_HASH
        );

        vm.prank(ALICE);
        vm.expectRevert(
            abi.encodeWithSelector(PropertyRegistry.InvalidLinkedValueBps.selector)
        );
        registry.registerProperty(
            10 ether,
            10_000,
            METADATA_HASH,
            DOCUMENTS_HASH,
            LOCATION_HASH
        );
    }

    function testRegisterPropertyRejectsZeroHashes() external {
        vm.prank(ALICE);
        vm.expectRevert(
            abi.encodeWithSelector(PropertyRegistry.InvalidMetadataHash.selector)
        );
        registry.registerProperty(
            10 ether,
            2_000,
            bytes32(0),
            DOCUMENTS_HASH,
            LOCATION_HASH
        );

        vm.prank(ALICE);
        vm.expectRevert(
            abi.encodeWithSelector(PropertyRegistry.InvalidDocumentsHash.selector)
        );
        registry.registerProperty(
            10 ether,
            2_000,
            METADATA_HASH,
            bytes32(0),
            LOCATION_HASH
        );

        vm.prank(ALICE);
        vm.expectRevert(
            abi.encodeWithSelector(PropertyRegistry.InvalidLocationHash.selector)
        );
        registry.registerProperty(
            10 ether,
            2_000,
            METADATA_HASH,
            DOCUMENTS_HASH,
            bytes32(0)
        );
    }

    function testConfigureExternalContractsOnlyOwner() external {
        vm.prank(ALICE);
        vm.expectRevert(
            abi.encodeWithSelector(PropertyRegistry.Unauthorized.selector)
        );
        registry.configureExternalContracts(ALICE, BOB, address(0xCAFE));
    }

    function testConfigureExternalContractsRejectsZeroAddress() external {
        vm.expectRevert(
            abi.encodeWithSelector(PropertyRegistry.ZeroAddress.selector)
        );
        registry.configureExternalContracts(address(0), BOB, address(0xCAFE));
    }

    function testOwnerCanMockVerifyOwnProperty() external {
        vm.prank(ALICE);
        uint256 propertyId = registry.registerProperty(
            10 ether,
            2_000,
            METADATA_HASH,
            DOCUMENTS_HASH,
            LOCATION_HASH
        );

        vm.prank(ALICE);
        registry.mockVerifyProperty(propertyId);

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
            ,
            ProtocolTypes.PropertyStatus status
        ) = registry.properties(propertyId);

        require(
            uint8(status) == uint8(ProtocolTypes.PropertyStatus.MockVerified),
            "mock verify status mismatch"
        );
    }

    function testMockVerifierRoleCanVerifyProperty() external {
        vm.prank(ALICE);
        uint256 propertyId = registry.registerProperty(
            10 ether,
            2_000,
            METADATA_HASH,
            DOCUMENTS_HASH,
            LOCATION_HASH
        );

        registry.grantRole(registry.MOCK_VERIFIER_ROLE(), BOB);

        vm.prank(BOB);
        registry.mockVerifyProperty(propertyId);

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
            ,
            ProtocolTypes.PropertyStatus status
        ) = registry.properties(propertyId);

        require(
            uint8(status) == uint8(ProtocolTypes.PropertyStatus.MockVerified),
            "role verify status mismatch"
        );
        require(
            registry.hasRole(registry.MOCK_VERIFIER_ROLE(), BOB),
            "mock verifier role missing"
        );
    }

    function testMockVerifyRejectsUnauthorizedCaller() external {
        vm.prank(ALICE);
        uint256 propertyId = registry.registerProperty(
            10 ether,
            2_000,
            METADATA_HASH,
            DOCUMENTS_HASH,
            LOCATION_HASH
        );

        vm.prank(BOB);
        vm.expectRevert(
            abi.encodeWithSelector(PropertyRegistry.Unauthorized.selector)
        );
        registry.mockVerifyProperty(propertyId);
    }

    function testMockVerifyRejectsMissingProperty() external {
        vm.prank(ALICE);
        vm.expectRevert(
            abi.encodeWithSelector(PropertyRegistry.PropertyNotFound.selector)
        );
        registry.mockVerifyProperty(999);
    }

    function testMockVerifyRejectsWrongStatus() external {
        vm.prank(ALICE);
        uint256 propertyId = registry.registerProperty(
            10 ether,
            2_000,
            METADATA_HASH,
            DOCUMENTS_HASH,
            LOCATION_HASH
        );

        vm.prank(ALICE);
        registry.mockVerifyProperty(propertyId);

        vm.prank(ALICE);
        vm.expectRevert(
            abi.encodeWithSelector(PropertyRegistry.InvalidPropertyStatus.selector)
        );
        registry.mockVerifyProperty(propertyId);
    }

    function testGrantRoleOnlyOwner() external {
        bytes32 mockVerifierRole = registry.MOCK_VERIFIER_ROLE();

        vm.prank(ALICE);
        vm.expectRevert(
            abi.encodeWithSelector(PropertyRegistry.Unauthorized.selector)
        );
        registry.grantRole(mockVerifierRole, BOB);
    }

    function testTokenizePropertyMintsUsufructAndFreeValueToken() external {
        uint256 propertyId = _registerAndVerifyProperty();

        vm.prank(ALICE);
        address valueTokenAddress = registry.tokenizeProperty(propertyId);

        {
            (
                uint256 storedPropertyId,
                address storedOwner,
                ,
                uint16 linkedValueBps,
                uint256 linkedValueUnits,
                uint256 freeValueUnits,
                ,
                ,
                ,
                address storedValueToken,
                ProtocolTypes.PropertyStatus status
            ) = registry.properties(propertyId);

            require(storedPropertyId == propertyId, "stored property id mismatch");
            require(storedOwner == ALICE, "stored owner mismatch");
            require(linkedValueBps == 2_000, "linked bps mismatch");
            require(linkedValueUnits == 200_000, "linked units mismatch");
            require(freeValueUnits == 800_000, "free units mismatch");
            require(storedValueToken == valueTokenAddress, "value token mismatch");
            require(
                uint8(status) == uint8(ProtocolTypes.PropertyStatus.Tokenized),
                "tokenized status mismatch"
            );
        }

        {
            (
                uint256 positionPropertyId,
                uint256 tokenId,
                address holder,
                uint256 positionLinkedValueUnits,
                uint16 positionLinkedValueBps,
                bool active
            ) = registry.usufructPositions(propertyId);

            require(positionPropertyId == propertyId, "position property mismatch");
            require(tokenId == propertyId, "usufruct token id mismatch");
            require(holder == ALICE, "usufruct holder mismatch");
            require(
                positionLinkedValueUnits == 200_000,
                "position linked units mismatch"
            );
            require(
                positionLinkedValueBps == 2_000,
                "position linked bps mismatch"
            );
            require(active, "usufruct position should be active");
        }

        require(
            usufructRightNft.ownerOf(propertyId) == ALICE,
            "nft owner mismatch"
        );
        require(usufructRightNft.balanceOf(ALICE) == 1, "nft balance mismatch");

        PropertyValueToken valueToken = PropertyValueToken(valueTokenAddress);
        require(
            factory.valueTokenByPropertyId(propertyId) == valueTokenAddress,
            "factory value token mismatch"
        );
        require(
            valueToken.authorizedOperator() == address(sale),
            "authorized operator mismatch"
        );
        require(valueToken.registry() == address(registry), "registry mismatch");
        require(valueToken.propertyId() == propertyId, "token property id mismatch");
        require(valueToken.decimals() == 0, "token decimals mismatch");
        require(valueToken.totalSupply() == 800_000, "token supply mismatch");
        require(
            valueToken.balanceOf(ALICE) == 800_000,
            "owner token balance mismatch"
        );
    }

    function testTokenizePropertyRejectsUnauthorizedCaller() external {
        uint256 propertyId = _registerAndVerifyProperty();

        vm.prank(BOB);
        vm.expectRevert(
            abi.encodeWithSelector(PropertyRegistry.Unauthorized.selector)
        );
        registry.tokenizeProperty(propertyId);
    }

    function testTokenizePropertyRejectsWrongStatus() external {
        vm.prank(ALICE);
        uint256 propertyId = registry.registerProperty(
            10 ether,
            2_000,
            METADATA_HASH,
            DOCUMENTS_HASH,
            LOCATION_HASH
        );

        vm.prank(ALICE);
        vm.expectRevert(
            abi.encodeWithSelector(PropertyRegistry.InvalidPropertyStatus.selector)
        );
        registry.tokenizeProperty(propertyId);
    }

    function testTokenizePropertyRejectsSecondTokenization() external {
        uint256 propertyId = _registerAndVerifyProperty();

        vm.prank(ALICE);
        registry.tokenizeProperty(propertyId);

        vm.prank(ALICE);
        vm.expectRevert(
            abi.encodeWithSelector(PropertyRegistry.InvalidPropertyStatus.selector)
        );
        registry.tokenizeProperty(propertyId);
    }

    function testTokenizePropertyRejectsMissingProperty() external {
        vm.prank(ALICE);
        vm.expectRevert(
            abi.encodeWithSelector(PropertyRegistry.PropertyNotFound.selector)
        );
        registry.tokenizeProperty(999);
    }

    function testFactoryOnlyAllowsRegistryToCreateTokens() external {
        vm.prank(ALICE);
        vm.expectRevert(
            abi.encodeWithSelector(PropertyValueTokenFactory.Unauthorized.selector)
        );
        factory.createValueToken(1, ALICE, 800_000);
    }

    function testUsufructRightNftBlocksDirectTransferAndApproval() external {
        uint256 propertyId = _registerAndVerifyProperty();

        vm.prank(ALICE);
        registry.tokenizeProperty(propertyId);

        vm.prank(ALICE);
        vm.expectRevert(
            abi.encodeWithSelector(UsufructRightNFT.TransfersDisabled.selector)
        );
        usufructRightNft.transferFrom(ALICE, BOB, propertyId);

        vm.prank(ALICE);
        vm.expectRevert(
            abi.encodeWithSelector(UsufructRightNFT.ApprovalsDisabled.selector)
        );
        usufructRightNft.approve(BOB, propertyId);

        vm.prank(ALICE);
        vm.expectRevert(
            abi.encodeWithSelector(UsufructRightNFT.TransfersDisabled.selector)
        );
        usufructRightNft.safeTransferFrom(ALICE, BOB, propertyId);

        vm.prank(ALICE);
        vm.expectRevert(
            abi.encodeWithSelector(UsufructRightNFT.ApprovalsDisabled.selector)
        );
        usufructRightNft.setApprovalForAll(BOB, true);
    }

    function testPropertyValueTokenBlocksDirectTransferAndApproval() external {
        uint256 propertyId = _registerAndVerifyProperty();

        vm.prank(ALICE);
        address valueTokenAddress = registry.tokenizeProperty(propertyId);
        PropertyValueToken valueToken = PropertyValueToken(valueTokenAddress);

        vm.prank(ALICE);
        vm.expectRevert(
            abi.encodeWithSelector(PropertyValueToken.TransfersDisabled.selector)
        );
        valueToken.transfer(BOB, 1);

        vm.prank(ALICE);
        vm.expectRevert(
            abi.encodeWithSelector(PropertyValueToken.ApprovalsDisabled.selector)
        );
        valueToken.approve(BOB, 1);

        vm.prank(ALICE);
        vm.expectRevert(
            abi.encodeWithSelector(PropertyValueToken.TransfersDisabled.selector)
        );
        valueToken.transferFrom(ALICE, BOB, 1);
    }

    function testAuthorizedOperatorCanMoveFreeValueToken() external {
        uint256 propertyId = _registerAndVerifyProperty();

        vm.prank(ALICE);
        address valueTokenAddress = registry.tokenizeProperty(propertyId);
        PropertyValueToken valueToken = PropertyValueToken(valueTokenAddress);

        vm.prank(address(sale));
        bool ok = valueToken.operatorTransfer(ALICE, BOB, 100_000);

        require(ok, "operator transfer failed");
        require(
            valueToken.balanceOf(ALICE) == 700_000,
            "owner balance mismatch"
        );
        require(valueToken.balanceOf(BOB) == 100_000, "buyer balance mismatch");
    }

    function testUnauthorizedOperatorCannotMoveFreeValueToken() external {
        uint256 propertyId = _registerAndVerifyProperty();

        vm.prank(ALICE);
        address valueTokenAddress = registry.tokenizeProperty(propertyId);
        PropertyValueToken valueToken = PropertyValueToken(valueTokenAddress);

        vm.prank(BOB);
        vm.expectRevert(
            abi.encodeWithSelector(PropertyValueToken.Unauthorized.selector)
        );
        valueToken.operatorTransfer(ALICE, BOB, 100_000);
    }

    function testCreatePrimarySaleListingEscrowsFreeValueAndMarksActiveSale()
        external
    {
        uint256 propertyId = _registerAndVerifyProperty();

        vm.prank(ALICE);
        address valueTokenAddress = registry.tokenizeProperty(propertyId);

        vm.prank(ALICE);
        uint256 listingId = sale.createPrimarySaleListing(propertyId, 300_000);

        require(listingId == 1, "listing id mismatch");
        require(sale.nextListingId() == 2, "next listing id mismatch");
        require(sale.listingExists(listingId), "listing exists mismatch");
        require(
            sale.activeListingsCountByProperty(propertyId) == 1,
            "active listing count mismatch"
        );
        require(
            sale.activeEscrowedAmountByProperty(propertyId) == 300_000,
            "active escrowed amount mismatch"
        );
        require(
            sale.totalFreeValueSoldByProperty(propertyId) == 0,
            "sold amount mismatch"
        );

        {
            (
                uint256 storedListingId,
                uint256 storedPropertyId,
                address seller,
                uint256 amount,
                uint256 priceWei,
                ProtocolTypes.SaleStatus saleStatus
            ) = sale.listings(listingId);

            require(storedListingId == listingId, "stored listing id mismatch");
            require(storedPropertyId == propertyId, "stored property mismatch");
            require(seller == ALICE, "seller mismatch");
            require(amount == 300_000, "listing amount mismatch");
            require(priceWei == 3 ether, "listing price mismatch");
            require(
                uint8(saleStatus) == uint8(ProtocolTypes.SaleStatus.Active),
                "listing status mismatch"
            );
        }

        uint256[] memory allListingIds = sale.getListingIds();
        uint256[] memory propertyListingIds = sale.getListingsByProperty(
            propertyId
        );
        require(allListingIds.length == 1, "global listing count mismatch");
        require(allListingIds[0] == listingId, "global listing id mismatch");
        require(
            propertyListingIds.length == 1,
            "property listing count mismatch"
        );
        require(
            propertyListingIds[0] == listingId,
            "property listing id mismatch"
        );

        PropertyValueToken valueToken = PropertyValueToken(valueTokenAddress);
        require(
            valueToken.balanceOf(ALICE) == 500_000,
            "seller liquid balance mismatch"
        );
        require(
            valueToken.balanceOf(address(sale)) == 300_000,
            "sale escrow balance mismatch"
        );

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
            ,
            ProtocolTypes.PropertyStatus status
        ) = registry.properties(propertyId);
        require(
            uint8(status) == uint8(ProtocolTypes.PropertyStatus.ActiveSale),
            "property status mismatch"
        );
    }

    function testCreatePrimarySaleListingRejectsUnauthorizedSeller() external {
        uint256 propertyId = _registerAndVerifyProperty();

        vm.prank(ALICE);
        registry.tokenizeProperty(propertyId);

        vm.prank(BOB);
        vm.expectRevert(
            abi.encodeWithSelector(PrimaryValueSale.Unauthorized.selector)
        );
        sale.createPrimarySaleListing(propertyId, 300_000);
    }

    function testCreatePrimarySaleListingRejectsWrongPropertyStatus() external {
        vm.prank(ALICE);
        uint256 propertyId = registry.registerProperty(
            10 ether,
            2_000,
            METADATA_HASH,
            DOCUMENTS_HASH,
            LOCATION_HASH
        );

        vm.prank(ALICE);
        vm.expectRevert(
            abi.encodeWithSelector(PrimaryValueSale.InvalidPropertyStatus.selector)
        );
        sale.createPrimarySaleListing(propertyId, 300_000);
    }

    function testCreatePrimarySaleListingRejectsZeroAmount() external {
        uint256 propertyId = _registerAndVerifyProperty();

        vm.prank(ALICE);
        registry.tokenizeProperty(propertyId);

        vm.prank(ALICE);
        vm.expectRevert(
            abi.encodeWithSelector(PrimaryValueSale.InvalidAmount.selector)
        );
        sale.createPrimarySaleListing(propertyId, 0);
    }

    function testCreatePrimarySaleListingRejectsInsufficientBalance() external {
        uint256 propertyId = _registerAndVerifyProperty();

        vm.prank(ALICE);
        registry.tokenizeProperty(propertyId);

        vm.prank(ALICE);
        vm.expectRevert(
            abi.encodeWithSelector(PrimaryValueSale.InsufficientBalance.selector)
        );
        sale.createPrimarySaleListing(propertyId, 900_000);
    }

    function testCreatePrimarySaleListingRejectsZeroPrice() external {
        vm.prank(ALICE);
        uint256 propertyId = registry.registerProperty(
            1,
            2_000,
            METADATA_HASH,
            DOCUMENTS_HASH,
            LOCATION_HASH
        );

        vm.prank(ALICE);
        registry.mockVerifyProperty(propertyId);

        vm.prank(ALICE);
        registry.tokenizeProperty(propertyId);

        vm.prank(ALICE);
        vm.expectRevert(
            abi.encodeWithSelector(PrimaryValueSale.PriceZero.selector)
        );
        sale.createPrimarySaleListing(propertyId, 1);
    }

    function testBuyPrimarySaleListingTransfersValueAndResetsStatus() external {
        uint256 propertyId = _registerAndVerifyProperty();

        vm.prank(ALICE);
        address valueTokenAddress = registry.tokenizeProperty(propertyId);

        vm.prank(ALICE);
        uint256 listingId = sale.createPrimarySaleListing(propertyId, 300_000);

        vm.deal(BOB, 10 ether);

        vm.prank(BOB);
        sale.buyPrimarySaleListing{value: 3 ether}(listingId, 300_000);

        {
            (
                uint256 storedListingId,
                uint256 storedPropertyId,
                address seller,
                uint256 amount,
                uint256 priceWei,
                ProtocolTypes.SaleStatus saleStatus
            ) = sale.listings(listingId);

            require(storedListingId == listingId, "stored listing id mismatch");
            require(storedPropertyId == propertyId, "stored property mismatch");
            require(seller == ALICE, "seller mismatch");
            require(amount == 0, "listing amount mismatch");
            require(priceWei == 0, "listing price mismatch");
            require(
                uint8(saleStatus) == uint8(ProtocolTypes.SaleStatus.Filled),
                "listing status mismatch"
            );
        }

        require(
            sale.activeListingsCountByProperty(propertyId) == 0,
            "active listing count mismatch"
        );
        require(
            sale.activeEscrowedAmountByProperty(propertyId) == 0,
            "active escrow amount mismatch"
        );
        require(
            sale.totalFreeValueSoldByProperty(propertyId) == 300_000,
            "sold amount mismatch"
        );

        {
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
                ,
                ProtocolTypes.PropertyStatus status
            ) = registry.properties(propertyId);

            require(
                uint8(status) == uint8(ProtocolTypes.PropertyStatus.Tokenized),
                "property status mismatch"
            );
        }

        PropertyValueToken valueToken = PropertyValueToken(valueTokenAddress);
        require(
            valueToken.balanceOf(address(sale)) == 0,
            "sale escrow balance mismatch"
        );
        require(
            valueToken.balanceOf(BOB) == 300_000,
            "buyer balance mismatch"
        );
        require(
            valueToken.balanceOf(ALICE) == 500_000,
            "seller free balance mismatch"
        );
        require(ALICE.balance == 3 ether, "seller eth balance mismatch");
        require(
            usufructRightNft.ownerOf(propertyId) == ALICE,
            "usufruct owner mismatch"
        );

        (
            ,
            ,
            address holder,
            uint256 linkedValueUnits,
            ,
            bool active
        ) = registry.usufructPositions(propertyId);
        require(holder == ALICE, "usufruct holder mismatch");
        require(linkedValueUnits == 200_000, "linked units mismatch");
        require(active, "usufruct position inactive");

        address[] memory propertyParticipants = registry.getParticipants(
            propertyId
        );
        require(
            propertyParticipants.length == 2,
            "participant count mismatch"
        );
        require(propertyParticipants[0] == ALICE, "owner participant mismatch");
        require(propertyParticipants[1] == BOB, "buyer participant mismatch");
        require(
            registry.isParticipantForProperty(propertyId, BOB),
            "buyer participant flag mismatch"
        );
    }

    function testBuyPrimarySaleListingMarksSoldOutWhenAllFreeUnitsSell() external {
        uint256 propertyId = _registerAndVerifyProperty();

        vm.prank(ALICE);
        registry.tokenizeProperty(propertyId);

        vm.prank(ALICE);
        uint256 listingId = sale.createPrimarySaleListing(propertyId, 800_000);

        vm.deal(BOB, 10 ether);

        vm.prank(BOB);
        sale.buyPrimarySaleListing{value: 8 ether}(listingId, 800_000);

        require(
            sale.totalFreeValueSoldByProperty(propertyId) == 800_000,
            "sold amount mismatch"
        );

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
            ,
            ProtocolTypes.PropertyStatus status
        ) = registry.properties(propertyId);
        require(
            uint8(status) == uint8(ProtocolTypes.PropertyStatus.SoldOut),
            "sold out status mismatch"
        );
    }

    function testBuyPrimarySaleListingRejectsMissingListing() external {
        vm.deal(BOB, 10 ether);

        vm.prank(BOB);
        vm.expectRevert(
            abi.encodeWithSelector(PrimaryValueSale.ListingNotFound.selector)
        );
        sale.buyPrimarySaleListing{value: 1 ether}(999, 1);
    }

    function testBuyPrimarySaleListingRejectsWrongPaymentAmount() external {
        uint256 propertyId = _registerAndVerifyProperty();

        vm.prank(ALICE);
        registry.tokenizeProperty(propertyId);

        vm.prank(ALICE);
        uint256 listingId = sale.createPrimarySaleListing(propertyId, 300_000);

        vm.deal(BOB, 10 ether);

        vm.prank(BOB);
        vm.expectRevert(
            abi.encodeWithSelector(PrimaryValueSale.InvalidPaymentAmount.selector)
        );
        sale.buyPrimarySaleListing{value: 2 ether}(listingId, 300_000);
    }

    function testBuyPrimarySaleListingRejectsSellerAsBuyer() external {
        uint256 propertyId = _registerAndVerifyProperty();

        vm.prank(ALICE);
        registry.tokenizeProperty(propertyId);

        vm.prank(ALICE);
        uint256 listingId = sale.createPrimarySaleListing(propertyId, 300_000);

        vm.deal(ALICE, 10 ether);

        vm.prank(ALICE);
        vm.expectRevert(
            abi.encodeWithSelector(
                PrimaryValueSale.SellerCannotBuyOwnListing.selector
            )
        );
        sale.buyPrimarySaleListing{value: 3 ether}(listingId, 300_000);
    }

    function testBuyPrimarySaleListingRejectsDuplicatePurchase() external {
        uint256 propertyId = _registerAndVerifyProperty();

        vm.prank(ALICE);
        registry.tokenizeProperty(propertyId);

        vm.prank(ALICE);
        uint256 listingId = sale.createPrimarySaleListing(propertyId, 300_000);

        vm.deal(BOB, 10 ether);
        vm.prank(BOB);
        sale.buyPrimarySaleListing{value: 3 ether}(listingId, 300_000);

        vm.deal(address(0xB0B2), 10 ether);
        vm.prank(address(0xB0B2));
        vm.expectRevert(
            abi.encodeWithSelector(PrimaryValueSale.ListingNotActive.selector)
        );
        sale.buyPrimarySaleListing{value: 3 ether}(listingId, 300_000);
    }

    function testBuyPrimarySaleListingRevertsWhenSellerEthTransferFails() external {
        RejectingSeller seller = new RejectingSeller(registry, sale);
        uint256 propertyId = seller.registerAndPrepareProperty(
            10 ether,
            2_000,
            METADATA_HASH,
            DOCUMENTS_HASH,
            LOCATION_HASH
        );
        uint256 listingId = seller.createListing(propertyId, 300_000);

        vm.deal(BOB, 10 ether);

        vm.prank(BOB);
        vm.expectRevert(
            abi.encodeWithSelector(PrimaryValueSale.EthTransferFailed.selector)
        );
        sale.buyPrimarySaleListing{value: 3 ether}(listingId, 300_000);

        {
            (
                ,
                ,
                ,
                uint256 amount,
                ,
                ProtocolTypes.SaleStatus saleStatus
            ) = sale.listings(listingId);
            require(amount == 300_000, "listing amount mismatch");
            require(
                uint8(saleStatus) == uint8(ProtocolTypes.SaleStatus.Active),
                "listing should stay active"
            );
        }

        require(
            sale.activeListingsCountByProperty(propertyId) == 1,
            "active listing count mismatch"
        );
        require(
            sale.activeEscrowedAmountByProperty(propertyId) == 300_000,
            "active escrow amount mismatch"
        );
        require(
            sale.totalFreeValueSoldByProperty(propertyId) == 0,
            "sold amount mismatch"
        );
    }

    function testBuyPrimarySaleListingSetsFilledBeforeSellerInteraction() external {
        ObservingSeller seller = new ObservingSeller(registry, sale);
        uint256 propertyId = seller.registerAndPrepareProperty(
            10 ether,
            2_000,
            METADATA_HASH,
            DOCUMENTS_HASH,
            LOCATION_HASH
        );
        uint256 listingId = seller.createListing(propertyId, 300_000);

        vm.deal(BOB, 10 ether);

        vm.prank(BOB);
        sale.buyPrimarySaleListing{value: 3 ether}(listingId, 300_000);

        require(seller.observedFilledBeforeEth(), "filled-before-eth check failed");
        require(
            address(seller).balance == 3 ether,
            "seller eth balance mismatch"
        );
    }

    function testCancelPrimarySaleListingReturnsEscrowAndResetsStatus() external {
        uint256 propertyId = _registerAndVerifyProperty();

        vm.prank(ALICE);
        address valueTokenAddress = registry.tokenizeProperty(propertyId);

        vm.prank(ALICE);
        uint256 listingId = sale.createPrimarySaleListing(propertyId, 300_000);

        vm.prank(ALICE);
        sale.cancelPrimarySaleListing(listingId);

        {
            (
                uint256 storedListingId,
                uint256 storedPropertyId,
                address seller,
                uint256 amount,
                uint256 priceWei,
                ProtocolTypes.SaleStatus saleStatus
            ) = sale.listings(listingId);

            require(storedListingId == listingId, "stored listing id mismatch");
            require(storedPropertyId == propertyId, "stored property mismatch");
            require(seller == ALICE, "seller mismatch");
            require(amount == 300_000, "listing amount mismatch");
            require(priceWei == 3 ether, "listing price mismatch");
            require(
                uint8(saleStatus) == uint8(ProtocolTypes.SaleStatus.Cancelled),
                "listing status mismatch"
            );
        }

        require(
            sale.activeListingsCountByProperty(propertyId) == 0,
            "active listing count mismatch"
        );
        require(
            sale.activeEscrowedAmountByProperty(propertyId) == 0,
            "active escrow amount mismatch"
        );
        require(
            sale.totalFreeValueSoldByProperty(propertyId) == 0,
            "sold amount mismatch"
        );

        {
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
                ,
                ProtocolTypes.PropertyStatus status
            ) = registry.properties(propertyId);
            require(
                uint8(status) == uint8(ProtocolTypes.PropertyStatus.Tokenized),
                "property status mismatch"
            );
        }

        PropertyValueToken valueToken = PropertyValueToken(valueTokenAddress);
        require(
            valueToken.balanceOf(ALICE) == 800_000,
            "seller free balance mismatch"
        );
        require(
            valueToken.balanceOf(address(sale)) == 0,
            "sale escrow balance mismatch"
        );
    }

    function testCancelPrimarySaleListingRejectsMissingListing() external {
        vm.prank(ALICE);
        vm.expectRevert(
            abi.encodeWithSelector(PrimaryValueSale.ListingNotFound.selector)
        );
        sale.cancelPrimarySaleListing(999);
    }

    function testCancelPrimarySaleListingRejectsNonSeller() external {
        uint256 propertyId = _registerAndVerifyProperty();

        vm.prank(ALICE);
        registry.tokenizeProperty(propertyId);

        vm.prank(ALICE);
        uint256 listingId = sale.createPrimarySaleListing(propertyId, 300_000);

        vm.prank(BOB);
        vm.expectRevert(
            abi.encodeWithSelector(PrimaryValueSale.SellerOnly.selector)
        );
        sale.cancelPrimarySaleListing(listingId);
    }

    function testCancelPrimarySaleListingRejectsInactiveListing() external {
        uint256 propertyId = _registerAndVerifyProperty();

        vm.prank(ALICE);
        registry.tokenizeProperty(propertyId);

        vm.prank(ALICE);
        uint256 listingId = sale.createPrimarySaleListing(propertyId, 300_000);

        vm.prank(ALICE);
        sale.cancelPrimarySaleListing(listingId);

        vm.prank(ALICE);
        vm.expectRevert(
            abi.encodeWithSelector(PrimaryValueSale.ListingNotActive.selector)
        );
        sale.cancelPrimarySaleListing(listingId);
    }

    function _registerAndVerifyProperty() internal returns (uint256 propertyId) {
        vm.prank(ALICE);
        propertyId = registry.registerProperty(
            10 ether,
            2_000,
            METADATA_HASH,
            DOCUMENTS_HASH,
            LOCATION_HASH
        );

        vm.prank(ALICE);
        registry.mockVerifyProperty(propertyId);
    }
}

contract RejectingSeller {
    PropertyRegistry internal immutable registry;
    PrimaryValueSale internal immutable sale;

    constructor(PropertyRegistry registry_, PrimaryValueSale sale_) {
        registry = registry_;
        sale = sale_;
    }

    function registerAndPrepareProperty(
        uint256 marketValueWei,
        uint16 linkedValueBps,
        bytes32 metadataHash,
        bytes32 documentsHash,
        bytes32 locationHash
    ) external returns (uint256 propertyId) {
        propertyId = registry.registerProperty(
            marketValueWei,
            linkedValueBps,
            metadataHash,
            documentsHash,
            locationHash
        );
        registry.mockVerifyProperty(propertyId);
        registry.tokenizeProperty(propertyId);
    }

    function createListing(
        uint256 propertyId,
        uint256 amount
    ) external returns (uint256 listingId) {
        listingId = sale.createPrimarySaleListing(propertyId, amount);
    }

    receive() external payable {
        revert("NO_ETH");
    }
}

contract ObservingSeller {
    PropertyRegistry internal immutable registry;
    PrimaryValueSale internal immutable sale;

    uint256 internal observedPropertyId;
    uint256 internal observedListingId;
    bool internal observedFilled;

    constructor(PropertyRegistry registry_, PrimaryValueSale sale_) {
        registry = registry_;
        sale = sale_;
    }

    function registerAndPrepareProperty(
        uint256 marketValueWei,
        uint16 linkedValueBps,
        bytes32 metadataHash,
        bytes32 documentsHash,
        bytes32 locationHash
    ) external returns (uint256 propertyId) {
        propertyId = registry.registerProperty(
            marketValueWei,
            linkedValueBps,
            metadataHash,
            documentsHash,
            locationHash
        );
        registry.mockVerifyProperty(propertyId);
        registry.tokenizeProperty(propertyId);
        observedPropertyId = propertyId;
    }

    function createListing(
        uint256 propertyId,
        uint256 amount
    ) external returns (uint256 listingId) {
        listingId = sale.createPrimarySaleListing(propertyId, amount);
        observedListingId = listingId;
    }

    function observedFilledBeforeEth() external view returns (bool) {
        return observedFilled;
    }

    receive() external payable {
        (
            ,
            ,
            ,
            ,
            ,
            ProtocolTypes.SaleStatus status
        ) = sale.listings(observedListingId);
        if (status != ProtocolTypes.SaleStatus.Filled) {
            revert("LISTING_NOT_FILLED");
        }
        if (sale.activeListingsCountByProperty(observedPropertyId) != 0) {
            revert("LISTING_COUNT_NOT_UPDATED");
        }
        observedFilled = true;
    }
}
