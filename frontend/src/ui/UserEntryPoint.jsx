import React, { useState, useEffect } from 'react';
import Onboarding from './Onboarding';
import AdminDashboard from './AdminDashboard';
import UserDashboard from './UserDashboard';

export default function UserEntryPoint() {
  const [userId, setUserId] = useState('');
  const [onboarded, setOnboarded] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // בדיקה אם יש משתמש מחובר ושאם עבר onboarding
    const saved = localStorage.getItem('userId');
    if (saved) {
      fetch(`/api/root/user-memory/${saved}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.onboardingComplete) {
            setUserId(saved);
            setOnboarded(true);
            setIsAdmin(!!data.isAdmin);
          } else {
            setUserId('');
            setOnboarded(false);
          }
          setChecking(false);
        })
        .catch(() => setChecking(false));
    } else {
      setChecking(false);
    }
  }, []);

  function handleOnboardDone(uid) {
    localStorage.setItem('userId', uid);
    setUserId(uid);
    setOnboarded(true);
  }

  if (checking) return <div>טוען...</div>;
  if (!onboarded) return <Onboarding onComplete={handleOnboardDone} />;
  if (isAdmin) return <AdminDashboard userId={userId} />;
  return <UserDashboard userId={userId} />;
}
