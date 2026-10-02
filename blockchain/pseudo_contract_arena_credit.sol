// LEGACY illustration: this file does not implement annual series, wallet ACLs,
// or Jailtime holds. It is not a deployment artifact for the annual policy.
// The maintained off-chain reference is arenaCreditService.js / ANNUAL_POLICY.md.

pragma solidity ^0.8.0;

contract ArenaCredit {
    string public name = "Arena Credit";
    string public symbol = "ARC";
    uint256 public totalSupply;
    address public owner;
    mapping(address => uint256) public balanceOf;
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Mint(address indexed to, uint256 value);
    event Burn(address indexed from, uint256 value);

    constructor() {
        owner = msg.sender;
        totalSupply = 1000000 * 1e18; // 1,000,000 ARC
        balanceOf[owner] = totalSupply;
    }

    function transfer(address to, uint256 value) public returns (bool) {
        require(balanceOf[msg.sender] >= value, "Insufficient balance");
        balanceOf[msg.sender] -= value;
        balanceOf[to] += value;
        emit Transfer(msg.sender, to, value);
        return true;
    }

    function mint(address to, uint256 value) public onlyOwner {
        totalSupply += value;
        balanceOf[to] += value;
        emit Mint(to, value);
    }

    function burn(uint256 value) public {
        require(balanceOf[msg.sender] >= value, "Insufficient balance");
        totalSupply -= value;
        balanceOf[msg.sender] -= value;
        emit Burn(msg.sender, value);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
}
