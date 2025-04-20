import React, { useState } from 'react';
import JailtimeVoiceAuth from '../components/JailtimeVoiceAuth';
import { usePiAuth } from '../hooks/usePiAuth';

const JailTimePage = () => {
  const { profile, loading, error } = usePiAuth();
  const [voiceOk, setVoiceOk] = useState(false);

  if (loading) {
    return <div className="flex flex-col min-h-screen items-center justify-center bg-gray-900 text-white">בודק סטטוס KYC...</div>;
  }
  if (error) {
    return <div className="flex flex-col min-h-screen items-center justify-center bg-gray-900 text-red-600">שגיאת התחברות ל-Pi: {error}</div>;
  }
  if (!profile) {
    return <div className="flex flex-col min-h-screen items-center justify-center bg-gray-900 text-white">לא נמצא פרופיל Pi</div>;
  }
  if (!profile.kyc_verified) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center bg-gray-900 text-red-600">
        <div className="bg-white text-red-700 p-6 rounded shadow text-center max-w-md">
          <h2 className="text-xl font-bold mb-2">גישה ל-JailTime למאומתים בלבד</h2>
          <p>רק משתמשים עם KYC מאומת ב-Pi Network יכולים להיכנס.</p>
        </div>
      </div>
    );
  }

  if (!voiceOk) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center bg-gray-900 text-white">
        <JailtimeVoiceAuth onSuccess={() => setVoiceOk(true)} />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-gray-900 text-white">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full text-center">
        <h1 className="text-3xl font-bold mb-4">Jail Time</h1>
        <p className="mb-4">This page is visually and functionally separated from the rest of the app. No global UI enhancements or transitions are applied here.</p>
        <p className="text-lg">Custom content for jail time goes here.</p>
      </div>
    </div>
  );
};

// Disable all global transitions and overlays for this page
(JailTimePage as any).disableTransition = true;

export default JailTimePage;
