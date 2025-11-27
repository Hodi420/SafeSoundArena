const blockchainService = require('../services/blockchainService');
const { expect } = require('chai');
const { ethers } = require('ethers');

// Test configuration
const TEST_ADDRESS = '0x0000000000000000000000000000000000000001';
const TEST_TOKEN = 'SSAToken';
const TEST_AMOUNT = '1.5';

describe('Blockchain Service', () => {
  describe('getBalance', () => {
    it('should get balance for a valid address', async () => {
      const balance = await blockchainService.getBalance(TEST_ADDRESS);
      expect(balance).to.be.a('string');
      expect(parseFloat(balance)).to.be.a('number');
    });

    it('should throw error for invalid address', async () => {
      try {
        await blockchainService.getBalance('invalid-address');
        throw new Error('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Invalid Ethereum address');
      }
    });
  });

  describe('getTokenBalance', () => {
    it('should get token balance for a valid address', async () => {
      const balance = await blockchainService.getTokenBalance(TEST_TOKEN, TEST_ADDRESS);
      expect(balance).to.be.a('string');
      expect(parseFloat(balance)).to.be.a('number');
    });
  });

  describe('getPlayerStats', () => {
    it('should get player stats for a valid address', async () => {
      const stats = await blockchainService.getPlayerStats(TEST_ADDRESS);
      expect(stats).to.be.an('object');
      expect(stats.gamesPlayed).to.be.a('number');
      expect(stats.gamesWon).to.be.a('number');
      expect(stats.totalWinnings).to.be.a('string');
      expect(stats.lastPlayed).to.be.instanceOf(Date);
    });
  });

  describe('verifyNFTOwnership', () => {
    it('should verify NFT ownership', async () => {
      // This is a mock test - in a real test, you'd need actual contract addresses and token IDs
      const isOwner = await blockchainService.verifyNFTOwnership(
        '0x1234...', // Mock collection address
        TEST_ADDRESS,
        '1' // Mock token ID
      );
      expect(isOwner).to.be.a('boolean');
    });
  });
});
