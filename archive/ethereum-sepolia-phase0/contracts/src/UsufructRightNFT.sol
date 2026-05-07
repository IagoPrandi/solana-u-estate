// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

contract UsufructRightNFT {
    string public constant name = "Usufruct Right";
    string public constant symbol = "USR";

    address public immutable registry;

    mapping(uint256 => address) private owners;
    mapping(address => uint256) private balances;

    error Unauthorized();
    error ZeroAddress();
    error TokenAlreadyMinted();
    error TokenDoesNotExist();
    error TransfersDisabled();
    error ApprovalsDisabled();

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

    constructor(address registry_) {
        if (registry_ == address(0)) {
            revert ZeroAddress();
        }

        registry = registry_;
    }

    modifier onlyRegistry() {
        if (msg.sender != registry) {
            revert Unauthorized();
        }

        _;
    }

    function mintFromRegistry(address to, uint256 tokenId) external onlyRegistry {
        if (to == address(0)) {
            revert ZeroAddress();
        }

        if (owners[tokenId] != address(0)) {
            revert TokenAlreadyMinted();
        }

        owners[tokenId] = to;
        balances[to] += 1;

        emit Transfer(address(0), to, tokenId);
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        address tokenOwner = owners[tokenId];
        if (tokenOwner == address(0)) {
            revert TokenDoesNotExist();
        }

        return tokenOwner;
    }

    function balanceOf(address account) external view returns (uint256) {
        if (account == address(0)) {
            revert ZeroAddress();
        }

        return balances[account];
    }

    function transferFrom(address, address, uint256) external pure {
        revert TransfersDisabled();
    }

    function safeTransferFrom(address, address, uint256) external pure {
        revert TransfersDisabled();
    }

    function safeTransferFrom(address, address, uint256, bytes calldata) external pure {
        revert TransfersDisabled();
    }

    function approve(address, uint256) external pure {
        revert ApprovalsDisabled();
    }

    function setApprovalForAll(address, bool) external pure {
        revert ApprovalsDisabled();
    }
}
