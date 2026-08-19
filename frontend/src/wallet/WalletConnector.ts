type WalletPayload = Record<string, unknown>;

interface WalletProvider {
  connect?: () => Promise<unknown>;
  sendTransaction?: (payload: WalletPayload) => Promise<unknown>;
  estimateGas?: (payload: WalletPayload) => Promise<unknown>;
  getTransactionReceipt?: (transactionId: string) => Promise<unknown>;
  createWallet?: () => Promise<unknown>;
  getWalletDetails?: (walletId: string) => Promise<unknown>;
  updateWallet?: (walletId: string, data: WalletPayload) => Promise<unknown>;
}

const getWalletProvider = (): WalletProvider => {
  const globalWallet = globalThis as typeof globalThis & {
    piNetwork?: WalletProvider;
    Pi?: WalletProvider;
  };
  const provider = globalWallet.piNetwork || globalWallet.Pi;

  if (!provider) {
    throw new Error('Pi wallet provider is not available');
  }

  return provider;
};

export const IDAN_FOR_FILL_CONFIG = {
  PI_API_URL: 'https://api.pinetwork.com',
  APP_WALLET_ADDRESS: 'your_app_wallet_address',
  NETWORK: 'mainnet',
  CHAIN_ID: 'your_chain_id',
};

export async function connectWallet() {
  const provider = getWalletProvider();
  if (!provider.connect) throw new Error('Wallet connect is not supported');
  return provider.connect();
}

export async function fetchBalance(address: string) {
  const response = await fetch(`${IDAN_FOR_FILL_CONFIG.PI_API_URL}/balance?address=${encodeURIComponent(address)}`);
  return response.json();
}

export async function sendTransaction(from: string, to: string, amount: number) {
  const provider = getWalletProvider();
  if (!provider.sendTransaction) throw new Error('Wallet transactions are not supported');
  return provider.sendTransaction({ from, to, amount });
}

export async function fetchHistory(address: string) {
  const response = await fetch(`${IDAN_FOR_FILL_CONFIG.PI_API_URL}/history?address=${encodeURIComponent(address)}`);
  return response.json();
}

export async function estimateGas(from: string, to: string, amount: number) {
  const provider = getWalletProvider();
  if (!provider.estimateGas) throw new Error('Gas estimation is not supported');
  return provider.estimateGas({ from, to, amount });
}

export async function getTransactionReceipt(transactionId: string) {
  const provider = getWalletProvider();
  if (!provider.getTransactionReceipt) throw new Error('Transaction receipts are not supported');
  return provider.getTransactionReceipt(transactionId);
}

export async function createWallet() {
  const provider = getWalletProvider();
  if (!provider.createWallet) throw new Error('Wallet creation is not supported');
  return provider.createWallet();
}

export async function getWalletDetails(walletId: string) {
  const provider = getWalletProvider();
  if (!provider.getWalletDetails) throw new Error('Wallet details are not supported');
  return provider.getWalletDetails(walletId);
}

export async function updateWallet(walletId: string, data: WalletPayload) {
  const provider = getWalletProvider();
  if (!provider.updateWallet) throw new Error('Wallet updates are not supported');
  return provider.updateWallet(walletId, data);
}
