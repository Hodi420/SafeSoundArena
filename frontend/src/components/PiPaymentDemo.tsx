import React, { useState } from 'react';

/**
 * Demo component for simulating a Pi Network User-to-App payment.
 * In Sandbox mode, this does NOT process real payments.
 * In production, integrate with Pi SDK or Pi payment API.
 */
export default function PiPaymentDemo() {
  const [amount, setAmount] = useState('1');
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');

  const isSandbox = process.env.NEXT_PUBLIC_APP_ENV === 'sandbox' || process.env.NEXT_PUBLIC_PI_SANDBOX === 'true';

  const handlePayment = async () => {
    setStatus('pending');
    // Simulate payment process
    setTimeout(() => {
      if (isSandbox) {
        setStatus('success');
      } else {
        // Here you would integrate with the real Pi payment API
        setStatus('error');
      }
    }, 1200);
  };

  return (
    <div style={{border: '1px solid #bbb', borderRadius: 8, padding: 20, margin: '32px auto', maxWidth: 400, background: '#f9f9f9'}}>
      <h2>Pi Payment Demo</h2>
      <p>This demo simulates a User-to-App payment using the Pi Network.</p>
      <label>
        Amount (Pi):
        <input
          type="number"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          style={{marginLeft: 8, width: 80}}
        />
      </label>
      <br /><br />
      <button onClick={handlePayment} disabled={status === 'pending'}>
        {status === 'pending' ? 'Processing...' : 'Pay'}
      </button>
      {status === 'success' && <p style={{color: 'green'}}>Payment simulated successfully (Sandbox mode).</p>}
      {status === 'error' && <p style={{color: 'red'}}>Payment failed (Production mode requires real integration).</p>}
      <p style={{fontSize: 13, color: '#888', marginTop: 16}}>
        {isSandbox
          ? 'Sandbox mode: No real Pi will be transferred.'
          : 'Production: Integrate with Pi payment API for real transactions.'}
      </p>
    </div>
  );
}
