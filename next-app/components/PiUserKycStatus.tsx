import React from 'react';
import { usePiAuth } from '../hooks/usePiAuth';

export default function PiUserKycStatus() {
  const { profile, loading, error } = usePiAuth();

  if (loading) return <div className="text-center">בודק התחברות ל-Pi...</div>;
  if (error) return <div className="text-red-700 text-center">{error}</div>;
  if (!profile) return null;

  return (
    <div className="bg-white p-4 rounded shadow max-w-md mx-auto mt-8 text-center">
      <h2 className="text-xl font-bold mb-2">פרטי משתמש Pi</h2>
      <div className="mb-2">שם משתמש: <span className="font-mono text-blue-700">{profile.username}</span></div>
      <div className="mb-2">
        סטטוס KYC: {profile.kyc_verified ? (
          <span className="text-green-700 font-bold">מאומת ✔️</span>
        ) : (
          <span className="text-red-700 font-bold">לא מאומת ❌</span>
        )}
      </div>
      <a
        href={`https://pichain.info/user/${profile.username}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 underline mt-2 inline-block"
      >
        לצפייה בהיסטוריית העברות ב-Block Explorer
      </a>
    </div>
  );
}
