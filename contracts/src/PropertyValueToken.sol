// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

contract PropertyValueToken {
    string public name;
    string public symbol;

    uint8 public constant decimals = 0;

    uint256 public immutable propertyId;
    address public immutable registry;
    address public immutable authorizedOperator;

    uint256 public totalSupply;

    mapping(address => uint256) private balances;

    error Unauthorized();
    error ZeroAddress();
    error TransfersDisabled();
    error ApprovalsDisabled();
    error InsufficientBalance();

    event Transfer(address indexed from, address indexed to, uint256 value);

    constructor(
        uint256 propertyId_,
        address registry_,
        address authorizedOperator_,
        address initialHolder_,
        uint256 initialSupply_,
        string memory name_,
        string memory symbol_
    ) {
        if (
            registry_ == address(0) ||
            authorizedOperator_ == address(0) ||
            initialHolder_ == address(0)
        ) {
            revert ZeroAddress();
        }

        propertyId = propertyId_;
        registry = registry_;
        authorizedOperator = authorizedOperator_;
        name = name_;
        symbol = symbol_;
        totalSupply = initialSupply_;
        balances[initialHolder_] = initialSupply_;

        emit Transfer(address(0), initialHolder_, initialSupply_);
    }

    modifier onlyAuthorizedOperator() {
        if (msg.sender != authorizedOperator) {
            revert Unauthorized();
        }

        _;
    }

    function balanceOf(address account) external view returns (uint256) {
        return balances[account];
    }

    function allowance(address, address) external pure returns (uint256) {
        return 0;
    }

    function transfer(address, uint256) external pure returns (bool) {
        revert TransfersDisabled();
    }

    function transferFrom(address, address, uint256) external pure returns (bool) {
        revert TransfersDisabled();
    }

    function approve(address, uint256) external pure returns (bool) {
        revert ApprovalsDisabled();
    }

    function operatorTransfer(
        address from,
        address to,
        uint256 amount
    ) external onlyAuthorizedOperator returns (bool) {
        if (from == address(0) || to == address(0)) {
            revert ZeroAddress();
        }

        uint256 fromBalance = balances[from];
        if (fromBalance < amount) {
            revert InsufficientBalance();
        }

        unchecked {
            balances[from] = fromBalance - amount;
        }
        balances[to] += amount;

        emit Transfer(from, to, amount);
        return true;
    }
}
