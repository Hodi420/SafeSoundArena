import React, { useState } from 'react';
import PiWalletConnect from '../components/PiWalletConnect';

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Copy helper for wallet address (delegated from child if needed)
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 1500);
  };

  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-gray-100 text-gray-900">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center mt-10">
        <h1 className="text-2xl font-bold mb-4">הגדרות משתמש</h1>
        <p className="mb-6 text-gray-700">
          התחבר לארנק Pi שלך, בצע תשלום לדוגמה, ונהל את פרטיך האישיים. <br />
          <span className="text-xs text-blue-600 underline cursor-pointer" onClick={() => window.open('https://docs.pi.app/', '_blank')}>למידע נוסף על Pi SDK</span>
        </p>
        {/* חיווי טעינה */}
        {loading && <div className="mb-4 text-yellow-600 font-semibold animate-pulse">טוען...</div>}
        {/* קומפוננטת הארנק */}
        <PiWalletConnect />
        {/* חיווי העתקה */}
        {copySuccess && <div className="mt-2 text-green-600 text-sm">הועתק ללוח!</div>}
        {/* טיפים והסברים */}
        <div className="mt-8 text-xs text-gray-500 text-right leading-6 bg-gray-50 rounded p-3">
          <b>טיפים:</b><br />
          • יש להתחבר דרך <b>Pi Browser</b> כדי לאפשר תשלום אמיתי.<br />
          • כתובת הארנק שלך תוצג לאחר התחברות מוצלחת.<br />
          • תשלום לדוגמה (0.01 Pi) נועד לבדיקה בלבד.<br />
          • יש להפעיל את ה-SDK ב-sandbox או production לפי הצורך.<br />
        </div>
        <div className="mt-8 text-xs text-gray-400">
          Powered by SafeSoundArena
        </div>
      </div>
    </div>
  );
}
