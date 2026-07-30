import { useState } from 'react';

export default function AppWalletDemo() {
  const [wallet] = useState<string>('PITEST_0x' + Math.random().toString(36).substring(2, 12).toUpperCase());
  const [copied, setCopied] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(wallet);
    }
    setCopied(true);
    setShowToast(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="container">
      <h2>Demo Wallet Address</h2>
      <p>This is a sample wallet address for demonstration only. In production, connect to a real wallet provider.</p>
      <div style={{ background: '#eee', padding: 8, borderRadius: 4, fontFamily: 'monospace', userSelect: 'all' }}>
        {wallet}
      </div>
      <button
        type="button"
        onClick={handleCopy}
        style={{ marginTop: 16, padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', background: copied ? '#4caf50' : '#0070f3', color: '#fff' }}
      >
        {copied ? 'Copied!' : 'Copy Address'}
      </button>
      {showToast && (
        <div style={{ marginTop: 14, padding: 10, borderRadius: 8, background: '#e6ffed', color: '#065f46' }}>
          Wallet address copied to clipboard.
        </div>
      )}
    </div>
  );
}
