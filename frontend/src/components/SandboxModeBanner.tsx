import React from 'react';

/**
 * Banner that clearly indicates when the app is running in Sandbox Mode.
 * Reads the environment variable NEXT_PUBLIC_APP_ENV or NEXT_PUBLIC_PI_SANDBOX.
 */
const isSandbox =
  process.env.NEXT_PUBLIC_APP_ENV === 'sandbox' ||
  process.env.NEXT_PUBLIC_PI_SANDBOX === 'true';

export default function SandboxModeBanner() {
  if (!isSandbox) return null;
  return (
    <div style={{
      background: '#ff9800',
      color: 'white',
      padding: '12px 0',
      textAlign: 'center',
      fontWeight: 'bold',
      letterSpacing: '1px',
      zIndex: 9999,
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
    }}>
      SANDBOX MODE ACTIVE – This is a test environment. Data may be reset at any time.
    </div>
  );
}
