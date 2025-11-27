const express = require('express');
const router = express.Router();
const blockchainController = require('../controllers/blockchainController');
const { authenticateJWT } = require('../middleware/authMiddleware');

// Public routes
router.get('/balance/:address', blockchainController.getBalance);
router.get('/token/:token/balance/:address', blockchainController.getTokenBalance);
router.get('/player/:playerAddress/stats', blockchainController.getPlayerStats);
router.get('/transaction/:txHash/receipt', blockchainController.getTransactionReceipt);

// Protected routes (require authentication)
router.post('/verify-ownership', authenticateJWT, blockchainController.verifyNFTOwnership);

module.exports = router;
