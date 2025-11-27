// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SSAToken
 * @dev ERC20 token for the SafeSoundArena platform
 */
contract SSAToken is ERC20, Ownable {
    // Mapping to track minters (only minters can mint new tokens)
    mapping(address => bool) public minters;
    
    // Total supply cap (1 billion tokens with 18 decimals)
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18;
    
    // Events
    event MinterAdded(address indexed account);
    event MinterRemoved(address indexed account);
    
    /**
     * @dev Constructor that mints the initial supply to the deployer
     */
    constructor() ERC20("SafeSoundArena Token", "SSA") {
        // Mint initial supply to the contract deployer
        _mint(msg.sender, MAX_SUPPLY);
    }
    
    /**
     * @dev Add a minter address
     * @param _minter The address to add as a minter
     */
    function addMinter(address _minter) external onlyOwner {
        require(_minter != address(0), "Invalid address");
        require(!minters[_minter], "Already a minter");
        
        minters[_minter] = true;
        emit MinterAdded(_minter);
    }
    
    /**
     * @dev Remove a minter address
     * @param _minter The address to remove as a minter
     */
    function removeMinter(address _minter) external onlyOwner {
        require(minters[_minter], "Not a minter");
        
        minters[_minter] = false;
        emit MinterRemoved(_minter);
    }
    
    /**
     * @dev Mint new tokens (only callable by minters)
     * @param _to The address that will receive the minted tokens
     * @param _amount The amount of tokens to mint
     */
    function mint(address _to, uint256 _amount) external {
        require(minters[msg.sender], "Caller is not a minter");
        require(_to != address(0), "Mint to the zero address");
        require(_amount > 0, "Amount must be greater than zero");
        
        _mint(_to, _amount);
    }
    
    /**
     * @dev Burn tokens from the caller's account
     * @param _amount The amount of tokens to burn
     */
    function burn(uint256 _amount) external {
        _burn(msg.sender, _amount);
    }
    
    /**
     * @dev Override transfer to include additional checks
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        super._beforeTokenTransfer(from, to, amount);
        
        // Add any additional checks here (e.g., blacklist, transfer restrictions)
    }
}
