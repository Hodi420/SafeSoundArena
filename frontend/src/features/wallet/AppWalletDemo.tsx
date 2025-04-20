// Wallet Address Demo Component
// This component displays the app wallet address for the authenticated user
import React from 'react';

const AppWalletDemo: React.FC = () => {
  // Replace with actual wallet logic as needed
  const walletAddress = 'SAFESOUND-PI-WALLET-ADDRESS-TEST';
  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-md mb-4">
      <h2 className="font-bold text-lg mb-2">App Wallet Address</h2>
      <div className="font-mono text-blue-300 mb-2">{walletAddress}</div>
      <button
        className="btn-secondary"
        onClick={() => navigator.clipboard.writeText(walletAddress)}
      >
        Copy Address
      </button>
    </div>
  );
};

export default AppWalletDemo;
