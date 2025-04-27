import React, { useCallback, useEffect, useState } from 'react';
import { ethers } from 'ethers';

// --- CONFIGURATION SECTION --- //
const CONTRACT_ADDRESS = 'PASTE_YOUR_DEPLOYED_CONTRACT_ADDRESS_HERE';
const ABI = [
  // Minimal ABI for claim and lastClaim
  "function claim() external",
  "function lastClaim(address) view returns (uint256)",
  "function COOLDOWN() view returns (uint256)",
  "function REWARD_AMOUNT() view returns (uint256)"
];

// --- DESIGN: Accessible, modern, clear labels, self-documenting --- //

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}m ${s}s`;
}

export default function FaucetClaimButton() {
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [account, setAccount] = useState<string>('');
  const [cooldown, setCooldown] = useState<number>(0);
  const [lastClaim, setLastClaim] = useState<number>(0);
  const [reward, setReward] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [timer, setTimer] = useState(0);

  // Connect wallet on mount
  useEffect(() => {
    if ((window as any).ethereum) {
      const ethProvider = new ethers.providers.Web3Provider((window as any).ethereum);
      setProvider(ethProvider);
<<<<<<< HEAD
      (async () => {
        const accounts: string[] = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
        setAccount(accounts[0]);
        setSigner(ethProvider.getSigner());
      })();
=======
      const accounts: string[] = (window as any).ethereum.request({ method: 'eth_requestAccounts' });
      accounts.then(accounts => {
        setAccount(accounts[0]);
        setSigner(ethProvider.getSigner());
      });
>>>>>>> 9841034 (Initial full project commit: user/admin dashboards, tasks, notifications, MongoDB, and statistics features)
    }
  }, []);

  // Fetch cooldown, lastClaim, reward
  const fetchData = useCallback(async () => {
    if (!provider || !account) return;
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
    const [cd, lc, rw] = await Promise.all([
      contract.COOLDOWN(),
      contract.lastClaim(account),
      contract.REWARD_AMOUNT()
    ]);
    setCooldown(Number(cd));
    setLastClaim(Number(lc));
    setReward(ethers.utils.formatUnits(rw, 18));
  }, [provider, account]);

  useEffect(() => {
    fetchData().catch(() => {});
  }, [fetchData]);

  // Timer logic
  useEffect(() => {
    if (!cooldown || !lastClaim) return;
    const nextClaim = lastClaim + cooldown;
    const now = Math.floor(Date.now() / 1000);
    const diff = nextClaim - now;
    setTimer(diff > 0 ? diff : 0);
    if (diff > 0) {
      const interval = setInterval(() => {
        const newDiff = nextClaim - Math.floor(Date.now() / 1000);
        setTimer(newDiff > 0 ? newDiff : 0);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [cooldown, lastClaim]);

  // Claim handler
  const handleClaim = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer!);
      const tx = await contract.claim();
      await tx.wait();
      setSuccess(true);
      fetchData();
    } catch (e: any) {
      setError(e.message || 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  // --- UI --- //
  return (
    <section className="faucet-claim">
      <h2>Testnet Faucet</h2>
      <p>
        <b>Available:</b> {reward || '...'} Test Tokens
      </p>
      <p>
        You can claim test tokens once every <b>24 hours</b>.
      </p>
      <button
        onClick={handleClaim}
        disabled={loading || timer > 0}
        style={{
          width: '100%',
          padding: '16px 0',
          fontSize: 20,
          background: timer > 0 ? '#bdbdbd' : '#1976d2',
          color: '#fff',
          border: 'none',
          borderRadius: 10,
          fontWeight: 700,
          cursor: loading || timer > 0 ? 'not-allowed' : 'pointer',
          transition: 'background 0.2s, box-shadow 0.2s',
          boxShadow: timer > 0 ? 'none' : '0 2px 8px rgba(25, 118, 210, 0.18)',
          outline: 'none',
        }}
        aria-label="Claim your test tokens"
        title={timer > 0 ? 'You must wait until the cooldown period is over to claim again.' : 'Click to claim your test tokens!'}
        onMouseOver={e => {
          if (!(loading || timer > 0)) e.currentTarget.style.background = '#1976d2';
        }}
        onFocus={e => {
          if (!(loading || timer > 0)) e.currentTarget.style.boxShadow = '0 0 0 3px #90caf9';
        }}
        onBlur={e => {
          if (!(loading || timer > 0)) e.currentTarget.style.boxShadow = '0 2px 8px rgba(25, 118, 210, 0.18)';
        }}
      >
        {loading ? 'Processing…' : timer > 0 ? `⏳ Next claim: ${formatTime(timer)}` : '💸 Claim Test Pi Tokens'}
      </button>
      {success && <p style={{color: '#388e3c', marginTop: 18, fontWeight: 600, fontSize: 16, letterSpacing: 0.1}}>✅ Tokens claimed successfully!</p>}
      {error && <p style={{color: '#d32f2f', marginTop: 18, fontWeight: 600, fontSize: 16, letterSpacing: 0.1}}>❌ {error}</p>}
      <p style={{fontSize: 14, color: '#607d8b', marginTop: 32, textAlign: 'center'}}>
        <span title="This is a demo/test contract address. Do not use for real transactions.">ℹ️</span> This is a demo/test contract address. Do not use for real transactions or with real funds. Powered by smart contract. Connect your wallet to claim test tokens.<br />
        <span style={{fontFamily: 'monospace', background: '#e3f2fd', borderRadius: 4, padding: '2px 6px', color: '#1976d2'}} title="Smart contract address">Contract: {CONTRACT_ADDRESS.slice(0, 8)}...{CONTRACT_ADDRESS.slice(-4)}</span>
      </p>
    </section>
  );
}
