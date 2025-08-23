const Web3 = require('web3');
const config = require('../../blockchain/config');
const logger = require('../utils/logger');

class BlockchainService {
  constructor() {
    const network = config.networks[config.defaultNetwork];
    this.web3 = new Web3(network.url);
    this.chainId = network.chainId;
    this.gas = network.gas;
    this.gasPrice = network.gasPrice;
    
    // Initialize contracts
    this.contracts = {};
    for (const [name, contractConfig] of Object.entries(config.contracts)) {
      const address = contractConfig.address[this.chainId];
      if (!address) {
        logger.warn(`No address configured for ${name} on chain ${this.chainId}`);
        continue;
      }
      this.contracts[name] = new this.web3.eth.Contract(contractConfig.abi, address);
    }
    
    // Set up account from private key
    if (process.env.WALLET_PRIVATE_KEY) {
      this.account = this.web3.eth.accounts.privateKeyToAccount(process.env.WALLET_PRIVATE_KEY);
      this.web3.eth.accounts.wallet.add(this.account);
      this.web3.eth.defaultAccount = this.account.address;
      logger.info(`Blockchain service initialized with account: ${this.account.address}`);
    } else {
      logger.warn('No WALLET_PRIVATE_KEY provided, read-only mode');
    }
  }

  async getBalance(address) {
    try {
      if (!this.web3.utils.isAddress(address)) {
        throw new Error('Invalid Ethereum address');
      }
      
      const balance = await this.web3.eth.getBalance(address);
      return this.web3.utils.fromWei(balance, 'ether');
    } catch (error) {
      logger.error(`Error getting balance for ${address}:`, error);
      throw new Error(`Failed to get balance: ${error.message}`);
    }
  }

  async getTokenBalance(tokenName, address) {
    try {
      if (!this.contracts[tokenName]) {
        throw new Error(`Contract ${tokenName} not found`);
      }
      
      if (!this.web3.utils.isAddress(address)) {
        throw new Error('Invalid Ethereum address');
      }
      
      const balance = await this.contracts[tokenName].methods.balanceOf(address).call();
      return this.web3.utils.fromWei(balance, 'ether');
    } catch (error) {
      logger.error(`Error getting ${tokenName} balance for ${address}:`, error);
      throw new Error(`Failed to get token balance: ${error.message}`);
    }
  }

  async getPlayerStats(playerAddress) {
    try {
      if (!this.contracts.SafeSoundArena) {
        throw new Error('SafeSoundArena contract not initialized');
      }
      
      if (!this.web3.utils.isAddress(playerAddress)) {
        throw new Error('Invalid player address');
      }
      
      const stats = await this.contracts.SafeSoundArena.methods
        .getPlayerStats(playerAddress)
        .call({ from: this.account?.address || '0x0000000000000000000000000000000000000000' });
      
      return {
        gamesPlayed: parseInt(stats.gamesPlayed),
        gamesWon: parseInt(stats.gamesWon),
        totalWinnings: this.web3.utils.fromWei(stats.totalWinnings, 'ether'),
        lastPlayed: new Date(parseInt(stats.lastPlayed) * 1000)
      };
    } catch (error) {
      logger.error(`Error getting stats for player ${playerAddress}:`, error);
      throw new Error(`Failed to get player stats: ${error.message}`);
    }
  }

  async executeGameResult(winner, loser, amount) {
    try {
      if (!this.contracts.SafeSoundArena) {
        throw new Error('SafeSoundArena contract not initialized');
      }
      
      if (!this.account) {
        throw new Error('No wallet configured for transactions');
      }
      
      if (!this.web3.utils.isAddress(winner) || !this.web3.utils.isAddress(loser)) {
        throw new Error('Invalid player address');
      }
      
      const amountInWei = this.web3.utils.toWei(amount.toString(), 'ether');
      
      // Estimate gas first
      const gasEstimate = await this.contracts.SafeSoundArena.methods
        .recordGameResult(winner, loser, amountInWei)
        .estimateGas({ from: this.account.address });
      
      // Build the transaction
      const tx = {
        to: this.contracts.SafeSoundArena.options.address,
        data: this.contracts.SafeSoundArena.methods
          .recordGameResult(winner, loser, amountInWei)
          .encodeABI(),
        gas: Math.min(Number(gasEstimate) * 2, 1000000), // Add buffer but cap at 1M gas
        gasPrice: this.gasPrice,
        chainId: this.chainId
      };
      
      // Sign and send the transaction
      const signedTx = await this.web3.eth.accounts.signTransaction(
        tx,
        this.account.privateKey
      );
      
      const receipt = await this.web3.eth.sendSignedTransaction(
        signedTx.rawTransaction
      );
      
      logger.info(`Game result recorded in block ${receipt.blockNumber}, tx: ${receipt.transactionHash}`);
      
      return {
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        status: receipt.status,
        gasUsed: receipt.gasUsed,
        events: receipt.events
      };
    } catch (error) {
      logger.error('Error executing game result on blockchain:', error);
      throw new Error(`Failed to execute game result: ${error.message}`);
    }
  }

  async verifyNFTOwnership(collectionAddress, ownerAddress, tokenId) {
    try {
      if (!this.web3.utils.isAddress(collectionAddress) || !this.web3.utils.isAddress(ownerAddress)) {
        throw new Error('Invalid address');
      }
      
      // For ERC721 tokens
      const nftContract = new this.web3.eth.Contract(
        [
          'function ownerOf(uint256 tokenId) view returns (address)',
          'function balanceOf(address owner) view returns (uint256)'
        ],
        collectionAddress
      );
      
      const owner = await nftContract.methods.ownerOf(tokenId).call();
      return owner.toLowerCase() === ownerAddress.toLowerCase();
    } catch (error) {
      logger.error(`Error verifying NFT ownership for token ${tokenId}:`, error);
      return false;
    }
  }
  
  async getTransactionReceipt(txHash) {
    try {
      return await this.web3.eth.getTransactionReceipt(txHash);
    } catch (error) {
      logger.error(`Error getting receipt for tx ${txHash}:`, error);
      throw new Error(`Failed to get transaction receipt: ${error.message}`);
    }
  }
}

// Create a singleton instance
const blockchainService = new BlockchainService();

// Add event listeners for process termination
process.on('SIGINT', async () => {
  logger.info('Shutting down blockchain service...');
  // Add any cleanup code here
  process.exit(0);
});

module.exports = blockchainService;
