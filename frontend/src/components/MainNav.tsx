import React from 'react';
import { useRouter } from 'next/router';

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Ask AI', href: '/AIBotAskPanel' },
  { label: 'Bot Settings', href: '/BotSettings' },
  // Add more links as needed
];

export function MainNav() {
  const router = useRouter();
  return (
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
    </nav>
  );
}
