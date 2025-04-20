import React, { useState } from 'react';
import Toast from './Toast';
import { IconButton } from './IconButton';

/**
 * Demo component for displaying an app wallet (public address).
 * In production, integrate with real wallet SDK/API.
 *
 * UI/UX: Modernized copy button, clear feedback, concise warning, accessible labels.
 */
export default function AppWalletDemo() {
  // For demo: generate a fake wallet address (not secure!)
  const [wallet] = useState<string>('PITEST_0x' + Math.random().toString(36).substring(2, 12).toUpperCase());
  const [copied, setCopied] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Copies wallet address to clipboard and shows feedback
  const handleCopy = () => {
    navigator.clipboard.writeText(wallet);
    setCopied(true);
    setShowToast(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="container">
      <h2>Demo Wallet Address</h2>
      <p>This is a sample wallet address for demonstration only. In production, connect to a real wallet provider.</p>
      <div style={{background: '#eee', padding: 8, borderRadius: 4, fontFamily: 'monospace', userSelect: 'all'}}>{wallet}</div>
      <IconButton
        ariaLabel={copied ? 'Wallet address copied!' : 'Copy wallet address'}
        title={copied ? 'Wallet address copied!' : 'Copy wallet address'}
        onClick={handleCopy}
        className={copied ? 'iconButtonActive' : 'iconButtonPrimary'}
        active={copied}
        primary={!copied}
        style={{ marginBottom: 18, marginTop: 10 }}
      >
        {copied ? (
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="11" fill="#e0ffe0"/><path d="M6.5 11.5l3 3 6-6" stroke="#0a4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true"><rect x="6" y="6" width="10" height="12" rx="2" stroke="#0070f3" strokeWidth="1.6"/><rect x="4" y="4" width="10" height="12" rx="2" stroke="#0070f3" strokeWidth="1.2"/></svg>
        )}
      </IconButton>
      {showToast && <Toast message="Wallet address copied!" onClose={() => setShowToast(false)} />}
      <p style={{
        fontSize: 16,
        color: '#d32f2f',
        marginTop: 28,
        fontWeight: 700,
        background: '#fff3e0',
        borderRadius: 6,
        padding: '10px 16px',
        boxShadow: '0 1px 4px rgba(211,47,47,0.08)',
        textAlign: 'center',
        letterSpacing: 0.2
      }}>
        ⚠️ Demo Only: Do not use for real Pi transactions.
      </p>
    </div>
  );
}
