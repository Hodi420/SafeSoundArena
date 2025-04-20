import React from 'react';
import { useRouter } from 'next/router';
import { GoogleOAuthProvider } from '@react-oauth/google';
import GoogleAuthButton from './GoogleAuthButton';

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Marketplace', href: '/marketplace' },
  { label: 'User Dashboard', href: '/user-dashboard' },
  { label: 'Ask AI', href: '/AIBotAskPanel' },
  { label: 'Bot Settings', href: '/BotSettings' },
];

export function MainNav() {
  const router = useRouter();
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  return (
    <GoogleOAuthProvider clientId={clientId}>
      <nav style={{ display: 'flex', gap: 28, padding: '18px 32px', background: '#f7fafd', borderBottom: '1.5px solid #e0e6ef', alignItems: 'center' }}>
        <span style={{ fontWeight: 800, fontSize: 22, color: '#0070f3', letterSpacing: 1, cursor: 'pointer' }} onClick={() => router.push('/')}>SafeSoundArena</span>
        <div style={{ flex: 1 }} />
        {NAV_LINKS.map(link => (
          <a
            key={link.href}
            href={link.href}
            style={{
              color: router.pathname === link.href ? '#0070f3' : '#333',
              fontWeight: router.pathname === link.href ? 700 : 500,
              fontSize: 17,
              textDecoration: 'none',
              padding: '6px 14px',
              borderRadius: 7,
              background: router.pathname === link.href ? '#e0eaff' : 'transparent',
              transition: 'background 0.2s',
            }}
          >
            {link.label}
          </a>
        ))}
        {/* Google Sign-In/Sign-Out button */}
        <div style={{ marginLeft: 24 }}>
          <GoogleAuthButton />
        </div>
      </nav>
    </GoogleOAuthProvider>
  );
}
