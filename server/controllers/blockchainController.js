const blockchainService = require('../services/blockchainService');
const logger = require('../utils/logger');

class BlockchainController {
  async getPlayerStats(req, res) {
    try {
      const { playerAddress } = req.params;
      
      if (!playerAddress) {
        return res.status(400).json({ 
          success: false, 
          error: 'Player address is required' 
        });
      }
      
      const stats = await blockchainService.getPlayerStats(playerAddress);
      res.json({ 
        success: true, 
        data: stats 
      });
    } catch (error) {
      logger.error('Error in getPlayerStats:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || 'Failed to retrieve player stats' 
      });
    }
  }

  async getTokenBalance(req, res) {
    try {
      const { token, address } = req.params;
      
      if (!token || !address) {
        return res.status(400).json({
          success: false,
          error: 'Token name and address are required'
        });
      }
      
      const balance = await blockchainService.getTokenBalance(token, address);
      
      res.json({
        success: true,
        data: {
          token,
          address,
          balance,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error in getTokenBalance:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get token balance'
      });
    }
  }

  async verifyNFTOwnership(req, res) {
    try {
      const { collectionAddress, ownerAddress, tokenId } = req.body;
      
      if (!collectionAddress || !ownerAddress || tokenId === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Collection address, owner address, and token ID are required'
        });
      }
      
      const isOwner = await blockchainService.verifyNFTOwnership(
        collectionAddress, 
        ownerAddress, 
        tokenId
      );
      
      res.json({ 
        success: true, 
        data: { 
          isOwner,
          collectionAddress,
          ownerAddress,
          tokenId,
          verifiedAt: new Date().toISOString()
        } 
      });
    } catch (error) {
      logger.error('Error in verifyNFTOwnership:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || 'Failed to verify NFT ownership' 
      });
    }
  }

  async getBalance(req, res) {
    try {
      const { address } = req.params;
      
      if (!address) {
        return res.status(400).json({
          success: false,
          error: 'Address is required'
        });
      }
      
      const balance = await blockchainService.getBalance(address);
      
      res.json({ 
        success: true, 
        data: { 
          address,
          balance: balance.toString(),
          currency: 'ETH',
          timestamp: new Date().toISOString()
        } 
      });
    } catch (error) {
      logger.error('Error in getBalance:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || 'Failed to retrieve balance' 
      });
    }
  }
  
  async getTransactionReceipt(req, res) {
    try {
      const { txHash } = req.params;
      
      if (!txHash) {
        return res.status(400).json({
          success: false,
          error: 'Transaction hash is required'
        });
      }
      
      const receipt = await blockchainService.getTransactionReceipt(txHash);
      
      if (!receipt) {
        return res.status(404).json({
          success: false,
          error: 'Transaction not found'
        });
      }
      
      res.json({
        success: true,
        data: {
          ...receipt,
          // Convert BigNumber to string for JSON serialization
          gasUsed: receipt.gasUsed.toString(),
          cumulativeGasUsed: receipt.cumulativeGasUsed?.toString(),
          effectiveGasPrice: receipt.effectiveGasPrice?.toString(),
          timestamp: receipt.timestamp || new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error in getTransactionReceipt:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get transaction receipt'
      });
    }
  }
}

module.exports = new BlockchainController();
