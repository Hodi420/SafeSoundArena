import React, { useState } from 'react';

declare global {
  interface Window {
    Pi: any;
  }
}

export default function PiWalletConnect() {
  const [piUser, setPiUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);

  const handleConnect = () => {
    if (!window.Pi) {
      setError('Pi SDK not loaded.');
      return;
    }
    window.Pi.authenticate(['username', 'payments'], (auth: any) => {
      setPiUser(auth.user);
      setError(null);
    }, (err: any) => {
      setError('Pi authentication failed: ' + err);
    });
  };

  const handlePayment = () => {
    if (!window.Pi || !piUser) {
      setPaymentStatus('Connect your Pi Wallet first.');
      return;
    }
    window.Pi.createPayment(
      {
        amount: 0.01, // Test amount
        memo: 'Test payment from SafeSoundArena',
        metadata: { test: true }
      },
      {
        onReadyForServerApproval: (paymentId: string) => {
          setPaymentStatus('Payment ready for approval: ' + paymentId);
        },
        onReadyForServerCompletion: (paymentId: string, txid: string) => {
          setPaymentStatus('Payment completed! Payment ID: ' + paymentId + ', TxID: ' + txid);
        },
        onCancel: (paymentId: string) => {
          setPaymentStatus('Payment cancelled: ' + paymentId);
        },
        onError: (err: any) => {
          setPaymentStatus('Payment error: ' + err);
        }
      }
    );
  };

  return (
    <div style={{background:'#f7f7ff', padding:20, borderRadius:8, margin:16}}>
      <h3>Pi Wallet Connection</h3>
      {piUser ? (
        <div>
          <div>Connected as: <b>{piUser.username}</b></div>
          <div>Wallet Address: <b>{piUser.wallet?.address || 'N/A'}</b></div>
          <button style={{marginTop:12}} onClick={handlePayment}>Send Test Payment (0.01 Pi)</button>
        </div>
      ) : (
        <button onClick={handleConnect}>Connect Pi Wallet</button>
      )}
      {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
      {paymentStatus && <div style={{ color: 'green', marginTop: 8 }}>{paymentStatus}</div>}
    </div>
  );
}
