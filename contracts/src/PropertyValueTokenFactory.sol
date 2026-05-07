// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {PropertyValueToken} from "./PropertyValueToken.sol";

contract PropertyValueTokenFactory {
    address public immutable registry;
    address public immutable primaryValueSale;

    mapping(uint256 => address) public valueTokenByPropertyId;

    error Unauthorized();
    error ZeroAddress();
    error TokenAlreadyCreated();

    event PropertyValueTokenCreated(
        uint256 indexed propertyId,
        address indexed valueToken,
        address indexed initialHolder,
        uint256 initialSupply,
        address authorizedOperator
    );

    constructor(address registry_, address primaryValueSale_) {
        if (registry_ == address(0) || primaryValueSale_ == address(0)) {
            revert ZeroAddress();
        }

        registry = registry_;
        primaryValueSale = primaryValueSale_;
    }

    function createValueToken(
        uint256 propertyId,
        address initialHolder,
        uint256 initialSupply
    ) external returns (address valueToken) {
        if (msg.sender != registry) {
            revert Unauthorized();
        }

        if (initialHolder == address(0)) {
            revert ZeroAddress();
        }

        if (valueTokenByPropertyId[propertyId] != address(0)) {
            revert TokenAlreadyCreated();
        }

        PropertyValueToken token = new PropertyValueToken(
            propertyId,
            registry,
            primaryValueSale,
            initialHolder,
            initialSupply,
            "Property Value Token",
            "PVT"
        );

        valueToken = address(token);
        valueTokenByPropertyId[propertyId] = valueToken;

        emit PropertyValueTokenCreated(
            propertyId,
            valueToken,
            initialHolder,
            initialSupply,
            primaryValueSale
        );
    }
}
