import React, { useState } from 'react';

type PiUser = {
  uid?: string;
  username?: string;
  wallet?: { address?: string };
};

type PiAuthResult = {
  user?: PiUser;
};

type PiSdk = {
  authenticate: (
    scopes: string[],
    onSuccess?: (auth: PiAuthResult) => void,
    onError?: (error: unknown) => void
  ) => Promise<PiAuthResult> | void;
  createPayment?: (
    payment: { amount: number; memo: string; metadata?: Record<string, unknown> },
    callbacks: {
      onReadyForServerApproval?: (paymentId: string) => void;
      onReadyForServerCompletion?: (paymentId: string, txid: string) => void;
      onCancel?: (paymentId: string) => void;
      onError?: (error: unknown) => void;
    }
  ) => void;
};

function getPiSdk() {
  if (typeof window === 'undefined') return undefined;
  return (window as Window & { Pi?: PiSdk }).Pi;
}

function describeError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export default function PiWalletConnect() {
  const [user, setUser] = useState<PiUser | null>(null);
  const [status, setStatus] = useState('Pi wallet is not connected.');
  const [loading, setLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  const handleConnect = () => {
    const pi = getPiSdk();
    if (!pi) {
      setStatus('Pi Network SDK is not loaded.');
      return;
    }

    setLoading(true);
    const handleSuccess = (auth: PiAuthResult) => {
      setUser(auth.user || null);
      setStatus(`Connected as ${auth.user?.username || auth.user?.uid || 'Pioneer'}.`);
      setLoading(false);
    };
    const handleError = (error: unknown) => {
      setStatus(`Pi authentication failed: ${describeError(error)}`);
      setLoading(false);
    };

    try {
      const result = pi.authenticate(['username', 'payments'], handleSuccess, handleError);
      if (result && typeof result.then === 'function') {
        result.then(handleSuccess).catch(handleError);
      }
    } catch (error) {
      handleError(error);
    }
  };

  const handlePayment = () => {
    const pi = getPiSdk();
    if (!pi?.createPayment || !user) {
      setStatus('Connect a Pi wallet before sending a payment.');
      return;
    }

    setPaymentLoading(true);
    pi.createPayment(
      {
        amount: 0.01,
        memo: 'Test payment from SafeSoundArena',
        metadata: { source: 'PiWalletConnect' },
      },
      {
        onReadyForServerApproval: (paymentId: string) => {
          setStatus(`Payment awaiting server approval: ${paymentId}`);
        },
        onReadyForServerCompletion: (paymentId: string, txid: string) => {
          setStatus(`Payment completed: ${paymentId} (${txid})`);
          setPaymentLoading(false);
        },
        onCancel: (paymentId: string) => {
          setStatus(`Payment cancelled: ${paymentId}`);
          setPaymentLoading(false);
        },
        onError: (error: unknown) => {
          setStatus(`Payment failed: ${describeError(error)}`);
          setPaymentLoading(false);
        },
      }
    );
  };

  return (
    <section className="rounded-lg border border-indigo-100 bg-white p-4 text-gray-900 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-indigo-700">Pi Wallet</h2>
        <p className="text-sm text-gray-600">{status}</p>
      </div>
      {user?.wallet?.address && (
        <p className="mb-4 break-all text-sm text-gray-600">Wallet: {user.wallet.address}</p>
      )}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleConnect}
          disabled={loading}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? 'Connecting...' : user ? 'Reconnect Pi' : 'Connect Pi'}
        </button>
        <button
          type="button"
          onClick={handlePayment}
          disabled={paymentLoading || !user}
          className="rounded-md border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-700 disabled:opacity-60"
        >
          {paymentLoading ? 'Processing...' : 'Send Test Payment'}
        </button>
      </div>
    </section>
  );
}
