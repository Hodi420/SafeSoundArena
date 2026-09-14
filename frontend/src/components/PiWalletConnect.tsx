import { useState } from 'react';

interface PiUser {
  username?: string;
  wallet?: { address?: string };
}

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  status: string;
  date: string;
}

export default function PiWalletConnect() {
  const [user, setUser] = useState<PiUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const connect = () => {
    setError(null);
    const pi = (window as Window & {
      Pi?: {
        authenticate: (
          scopes: string[],
          onSuccess: (auth: { user: PiUser }) => void,
          onError: (error: unknown) => void,
        ) => void;
      };
    }).Pi;
    if (!pi) {
      setError('Pi SDK not loaded.');
      return;
    }

    pi.authenticate(['username', 'payments'], ({ user: authenticatedUser }) => {
      setUser(authenticatedUser);
      setBalance(3.1415);
    }, () => setError('Pi authentication failed.'));
  };

  const addTestPayment = () => {
    const transaction: Transaction = {
      id: `test-${Date.now()}`,
      amount: 0.01,
      currency: 'PI',
      status: 'Completed',
      date: new Date().toISOString(),
    };
    setTransactions((current) => [transaction, ...current]);
    setBalance((current) => Math.max(0, current - transaction.amount));
  };

  return (
    <section className="rounded-lg border border-indigo-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold">Pi Wallet</h2>
      {user ? (
        <div className="mt-4 space-y-2">
          <p>Connected as: {user.username || 'Unknown user'}</p>
          <p>Balance: {balance.toFixed(4)} Pi</p>
          <p className="break-all">Address: {user.wallet?.address || 'Unavailable'}</p>
          <button className="btn-primary" onClick={addTestPayment}>Add test payment</button>
          {transactions.length > 0 && (
            <ul className="mt-4 space-y-2">
              {transactions.map((transaction) => (
                <li key={transaction.id} className="rounded bg-gray-50 p-2">
                  {transaction.amount} {transaction.currency} - {transaction.status}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <button className="btn-primary mt-4" onClick={connect}>Connect Pi Wallet</button>
      )}
      {error && <p className="mt-4 text-red-600">{error}</p>}
    </section>
  );
}
