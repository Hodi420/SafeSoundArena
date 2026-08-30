import { useMemo, useState } from 'react';

type PiUser = {
  username?: string;
  uid?: string;
  wallet?: {
    address?: string;
  };
  kyc_verified?: boolean;
};

const demoTransactions = [
  { id: 'tx1', amount: 0.01, currency: 'PI', status: 'Demo', date: '2024-06-01' },
  { id: 'tx2', amount: 0.02, currency: 'PI', status: 'Demo', date: '2024-06-02' },
];

export default function PiWalletConnect() {
  const [activeTab, setActiveTab] = useState<'wallet' | 'history' | 'profile'>('wallet');
  const [piUser, setPiUser] = useState<PiUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const walletAddress = piUser?.wallet?.address || 'Not connected';
  const isSdkAvailable = typeof window !== 'undefined' && Boolean(window.Pi?.authenticate);

  const profileStatus = useMemo(() => {
    if (!piUser) return 'Connect through Pi Browser to load profile details.';
    return piUser.kyc_verified ? 'KYC verified' : 'KYC status unavailable';
  }, [piUser]);

  const handleConnect = async () => {
    setError(null);
    setLoading(true);

    try {
      if (!window.Pi?.authenticate) {
        throw new Error('Pi SDK is not available in this browser.');
      }

      const user = await window.Pi.authenticate(['username', 'payments'], () => undefined);
      setPiUser(user);
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : 'Unable to connect Pi wallet.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-lg border border-blue-100 bg-white p-4 text-right text-gray-900" dir="rtl">
      <div className="mb-4 flex flex-wrap gap-2">
        {(['wallet', 'history', 'profile'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded px-3 py-2 text-sm font-semibold ${
              activeTab === tab ? 'bg-blue-700 text-white' : 'bg-blue-50 text-blue-800'
            }`}
          >
            {tab === 'wallet' ? 'ארנק' : tab === 'history' ? 'עסקאות' : 'פרופיל'}
          </button>
        ))}
      </div>

      {activeTab === 'wallet' && (
        <div>
          <h3 className="mb-2 text-lg font-bold text-blue-800">חיבור ארנק Pi</h3>
          <p className="mb-3 text-sm text-gray-600">
            פעולות תשלום אמיתיות מושבתות עד להגדרת Pi SDK ושרת תשלומים מאומת.
          </p>
          <div className="mb-3 rounded bg-gray-50 p-3 text-left font-mono text-sm" dir="ltr">
            {walletAddress}
          </div>
          <button
            type="button"
            onClick={handleConnect}
            disabled={loading || !isSdkAvailable}
            className="rounded bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {loading ? 'מתחבר...' : 'התחבר לארנק'}
          </button>
          {!isSdkAvailable && <p className="mt-2 text-sm text-amber-700">Pi SDK לא זמין בדפדפן הנוכחי.</p>}
        </div>
      )}

      {activeTab === 'history' && (
        <div>
          <h3 className="mb-2 text-lg font-bold text-blue-800">עסקאות</h3>
          <ul className="space-y-2">
            {demoTransactions.map((transaction) => (
              <li key={transaction.id} className="rounded border border-gray-100 bg-gray-50 p-3 text-sm">
                <span className="font-semibold">{transaction.amount} {transaction.currency}</span>
                <span className="mx-2 text-gray-500">|</span>
                <span>{transaction.status}</span>
                <span className="mx-2 text-gray-500">|</span>
                <span>{transaction.date}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {activeTab === 'profile' && (
        <div>
          <h3 className="mb-2 text-lg font-bold text-blue-800">פרופיל</h3>
          <p className="text-sm text-gray-700">שם משתמש: {piUser?.username || 'לא מחובר'}</p>
          <p className="text-sm text-gray-700">{profileStatus}</p>
        </div>
      )}

      {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
    </section>
  );
}
