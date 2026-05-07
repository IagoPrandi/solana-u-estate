// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {PrimaryValueSale} from "../src/PrimaryValueSale.sol";
import {PropertyRegistry} from "../src/PropertyRegistry.sol";
import {PropertyValueTokenFactory} from "../src/PropertyValueTokenFactory.sol";
import {UsufructRightNFT} from "../src/UsufructRightNFT.sol";

interface Vm {
    function envString(string calldata name) external returns (string memory);
    function startBroadcast() external;
    function stopBroadcast() external;
}

contract Deploy {
    Vm internal constant vm =
        Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    struct DeploymentResult {
        address propertyRegistry;
        address usufructRightNft;
        address propertyValueTokenFactory;
        address primaryValueSale;
    }

    function run() external returns (DeploymentResult memory result) {
        vm.envString("SEPOLIA_RPC_URL");
        vm.envString("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast();

        PropertyRegistry registry = new PropertyRegistry();
        PrimaryValueSale sale = new PrimaryValueSale(address(registry));
        UsufructRightNFT usufructRightNft = new UsufructRightNFT(
            address(registry)
        );
        PropertyValueTokenFactory factory = new PropertyValueTokenFactory(
            address(registry),
            address(sale)
        );

        registry.configureExternalContracts(
            address(usufructRightNft),
            address(factory),
            address(sale)
        );

        vm.stopBroadcast();

        result = DeploymentResult({
            propertyRegistry: address(registry),
            usufructRightNft: address(usufructRightNft),
            propertyValueTokenFactory: address(factory),
            primaryValueSale: address(sale)
        });
    }
}
