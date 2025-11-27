import React, { useState } from 'react';

export default function ProfileIdentityForm() {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || '';
      const r = await fetch(`${base}/api/user/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, displayName }),
      });
      if (!r.ok) throw new Error('Failed to save');
      setMsg('נשמר בהצלחה');
    } catch (e: any) {
      setMsg(e.message || 'שגיאה בשמירה');
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 2500);
    }
  }

  return (
    <div
      style={{
        maxWidth: 540,
        margin: '0 auto',
        padding: 24,
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 2px 14px rgba(0,0,0,0.06)',
      }}
    >
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>פרטי פרופיל</h2>
      <form onSubmit={onSave}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>אימייל</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          style={{
            width: '100%',
            padding: 10,
            borderRadius: 8,
            border: '1.5px solid #bcd',
            marginBottom: 12,
          }}
        />
        <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>שם תצוגה</label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="הזן שם תצוגה"
          style={{
            width: '100%',
            padding: 10,
            borderRadius: 8,
            border: '1.5px solid #bcd',
            marginBottom: 16,
          }}
        />
        <button
          type="submit"
          disabled={saving}
          style={{
            padding: '10px 18px',
            borderRadius: 8,
            background: '#0070f3',
            color: '#fff',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {saving ? 'שומר...' : 'שמור'}
        </button>
        {msg && <span style={{ marginLeft: 12, fontWeight: 600 }}>{msg}</span>}
      </form>
    </div>
  );
}
