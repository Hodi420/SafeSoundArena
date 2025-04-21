// Arena Credit (ARC) – Smart Contract Template for Pi Network (Pseudo Solidity)
// This contract is ready for future deployment on Pi Network or any EVM-compatible chain

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
