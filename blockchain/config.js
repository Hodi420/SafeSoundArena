module.exports = {
  networks: {
    development: {
      url: process.env.BLOCKCHAIN_RPC_URL || 'http://localhost:8545',
      chainId: 1337, // Local development chain ID
      gas: 8000000,
      gasPrice: '1000000000', // 1 Gwei
    },
    testnet: {
      url: process.env.TESTNET_RPC_URL || 'https://rpc.testnet.fantom.network',
      chainId: 4002,
      gas: 8000000,
      gasPrice: '30000000000', // 30 Gwei
    },
    mainnet: {
      url: process.env.MAINNET_RPC_URL || 'https://rpc.ftm.tools/',
      chainId: 250,
      gas: 8000000,
      gasPrice: '30000000000', // 30 Gwei
    },
  },
  contracts: {
    SafeSoundArena: {
      address: {
        1337: process.env.LOCAL_CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
        4002: process.env.TESTNET_CONTRACT_ADDRESS || '',
        250: process.env.MAINNET_CONTRACT_ADDRESS || '',
      },
      abi: require('./artifacts/contracts/SafeSoundArena.sol/SafeSoundArena.json').abi,
    },
    SSAToken: {
      address: {
        1337: process.env.LOCAL_TOKEN_ADDRESS || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
        4002: process.env.TESTNET_TOKEN_ADDRESS || '',
        250: process.env.MAINNET_TOKEN_ADDRESS || '',
      },
      abi: require('./artifacts/contracts/SSAToken.sol/SSAToken.json').abi,
    },
  },
  defaultNetwork: process.env.NETWORK || 'development',
};
