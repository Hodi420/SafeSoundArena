import React from 'react';
import { usePiAuth } from '../hooks/usePiAuth';

export default function UserPiKycGuard({ children }: { children: React.ReactNode }) {
  const { profile, loading, error } = usePiAuth();

  if (loading) return <div className="flex flex-col min-h-screen items-center justify-center bg-gray-900 text-white">בודק סטטוס KYC...</div>;
  if (error) return <div className="flex flex-col min-h-screen items-center justify-center bg-gray-900 text-red-600">שגיאת התחברות ל-Pi: {error}</div>;
  if (!profile) return <div className="flex flex-col min-h-screen items-center justify-center bg-gray-900 text-white">לא נמצא פרופיל Pi</div>;
  if (!profile.kyc_verified) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center bg-gray-900 text-red-600">
        <div className="bg-white text-red-700 p-6 rounded shadow text-center max-w-md">
          <h2 className="text-xl font-bold mb-2">גישה למאומתים בלבד</h2>
          <p>רק משתמשים עם KYC מאומת ב-Pi Network יכולים להמשיך.</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
