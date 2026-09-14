import { useState } from 'react';

export default function AppWalletDemo() {
  const walletAddress = 'SAFESOUND-PI-WALLET-ADDRESS-TEST';
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(walletAddress);
    setCopied(true);
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-md mb-4">
      <h2 className="font-bold text-lg mb-2">App Wallet Address</h2>
      <div className="font-mono text-blue-300 mb-2">{walletAddress}</div>
      <button
        className="btn-secondary"
        onClick={handleCopy}
      >
        {copied ? 'Copied' : 'Copy Address'}
      </button>
    </div>
  );
}

