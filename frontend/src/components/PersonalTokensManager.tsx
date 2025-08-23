import React, { useEffect, useState } from 'react';

type TokenRow = { id: string; provider: string; alias?: string; last4: string; createdAt: string; valid: boolean };

const PROVIDERS = [
  { id: 'openai', name: 'OpenAI' },
  { id: 'anthropic', name: 'Anthropic' },
  { id: 'gemini', name: 'Gemini' },
  { id: 'huggingface', name: 'Hugging Face' },
  { id: 'xai', name: 'xAI' },
  { id: 'custom', name: 'Custom' }
];

export default function PersonalTokensManager() {
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [provider, setProvider] = useState('openai');
  const [token, setToken] = useState('');
  const [alias, setAlias] = useState('');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string|null>(null);
  const userId = typeof window !== 'undefined' ? (localStorage.getItem('userId') || 'pi-demo-user') : 'pi-demo-user';
  const base = process.env.NEXT_PUBLIC_API_URL || '';

  async function refresh() {
    setLoading(true);
    try {
      const r = await fetch(`${base}/api/user/tokens?userId=${encodeURIComponent(userId)}`);
      const j = await r.json();
      setTokens(j.tokens || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      const r = await fetch(`${base}/api/user/tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, provider, token, alias })
      });
      if (!r.ok) throw new Error('שמירה נכשלה');
      setToken('');
      setAlias('');
      setMsg('נשמר בהצלחה');
      refresh();
      setTimeout(() => setMsg(null), 2000);
    } catch (e: any) {
      setMsg(e.message || 'שגיאה');
    }
  }

  async function onDelete(id: string) {
    setMsg(null);
    await fetch(`${base}/api/user/tokens/${id}?userId=${encodeURIComponent(userId)}`, { method: 'DELETE' });
    refresh();
  }

  return (
    <div style={{ maxWidth: 720, margin: '24px auto', background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 14px rgba(0,0,0,0.06)' }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>הטוקנים האישיים שלי</h2>
      <form onSubmit={onAdd} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 2fr 1fr', gap: 10, marginBottom: 16 }}>
        <select value={provider} onChange={e => setProvider(e.target.value)} style={{ padding: 10, borderRadius: 8, border: '1.5px solid #bcd' }}>
          {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input value={token} onChange={e => setToken(e.target.value)} placeholder="API Token" style={{ padding: 10, borderRadius: 8, border: '1.5px solid #bcd' }} />
        <input value={alias} onChange={e => setAlias(e.target.value)} placeholder="כינוי (אופציונלי)" style={{ padding: 10, borderRadius: 8, border: '1.5px solid #bcd' }} />
        <button type="submit" style={{ padding: 10, borderRadius: 8, background: '#0070f3', color: '#fff', fontWeight: 700, border: 'none' }}>הוסף</button>
      </form>
      {msg && <div style={{ marginBottom: 10, fontWeight: 600 }}>{msg}</div>}
      {loading ? (
        <div>טוען...</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left' }}>
              <th>ספק</th>
              <th>כינוי</th>
              <th>Last4</th>
              <th>נוצר בתאריך</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tokens.map(t => (
              <tr key={t.id} style={{ borderTop: '1px solid #eee' }}>
                <td>{t.provider}</td>
                <td>{t.alias || '-'}</td>
                <td>{t.last4}</td>
                <td>{new Date(t.createdAt).toLocaleString()}</td>
                <td><button onClick={() => onDelete(t.id)} style={{ color: '#a00', border: 'none', background: 'transparent', cursor: 'pointer' }}>מחק</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}


