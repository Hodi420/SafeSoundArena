import { useState } from 'react';

export default function DevLogin() {
  const [token, setToken] = useState('');
  const [err, setErr] = useState('');
  const hint = process.env.NEXT_PUBLIC_DEV_HINT || 'Enter your dev token';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (!token) {
      setErr('Token required');
      return;
    }
    // set cookie and redirect
    document.cookie = `dev_access=${encodeURIComponent(token)}; path=/`;
    window.location.href = '/';
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0b1020',
        color: '#fff',
      }}
    >
      <form
        onSubmit={submit}
        style={{
          background: '#10193a',
          padding: 24,
          borderRadius: 12,
          minWidth: 320,
          boxShadow: '0 8px 30px rgba(0,0,0,.3)',
        }}
      >
        <h1 style={{ margin: '0 0 14px', fontSize: 22 }}>Developer Access</h1>
        <p style={{ margin: '0 0 10px', opacity: 0.8, fontSize: 13 }}>
          Enter your developer token to access the app.
        </p>
        <input
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder={hint}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid #2f3b66',
            background: '#0e1834',
            color: '#fff',
          }}
        />
        {err && <div style={{ color: '#ff9a9a', marginTop: 8, fontSize: 12 }}>{err}</div>}
        <button
          type="submit"
          style={{
            marginTop: 12,
            width: '100%',
            padding: '10px 12px',
            borderRadius: 8,
            border: 'none',
            background: '#2563eb',
            color: '#fff',
            fontWeight: 700,
          }}
        >
          Continue
        </button>
      </form>
    </div>
  );
}
