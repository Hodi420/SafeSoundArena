import { GoogleLogin, googleLogout } from '@react-oauth/google';
import { useState } from 'react';

export default function GoogleAuthButton() {
  const [user, setUser] = useState<any>(null);

  if (user) {
    return (
      <button
        onClick={() => {
          googleLogout();
          setUser(null);
          localStorage.removeItem('auth_user');
        }}
        style={{ background: '#db4437', color: 'white', border: 'none', borderRadius: 6, padding: '7px 20px', fontWeight: 600 }}
      >
        Sign out ({user.name || user.email || 'Google'})
      </button>
    );
  }

  return (
    <GoogleLogin
      onSuccess={credentialResponse => {
        // Parse credential and save user info (demo)
        const { credential } = credentialResponse;
        if (credential) {
          // In real app, send credential to backend for verification and get user info
          const userObj = { name: 'Google User', isAuthenticated: true };
          setUser(userObj);
          localStorage.setItem('auth_user', JSON.stringify(userObj));
        }
      }}
      onError={() => {
        alert('Google Sign-In failed');
      }}
      useOneTap
    />
  );
}
