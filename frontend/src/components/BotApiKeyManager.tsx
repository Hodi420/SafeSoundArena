import React, { useState, useEffect } from 'react';

const BOT_ICONS: Record<string, string> = {
  openai: '🤖',
  echo: '🦜',
  // Add more bot icons here
};

const BOT_INSTRUCTIONS: Record<string, string> = {
  openai: 'Get your free or paid OpenAI API key at https://platform.openai.com/account/api-keys. Paste it below.',
  echo: 'No API key required for Echo Bot.',
};

export function BotApiKeyManager({ bots, onSave }: { bots: { id: string; name: string }[]; onSave: (botId: string, apiKey: string, endpoint?: string) => void }) {
  const [selectedBot, setSelectedBot] = useState(bots[0]?.id || '');
  const [apiKey, setApiKey] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [savedKeys, setSavedKeys] = useState<Record<string, { apiKey: string; endpoint?: string } | undefined>>({});

  // Fetch saved keys for summary
  useEffect(() => {
    const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') || 'demo-user' : 'demo-user';
    fetch(`/api/ai/user-bot-keys?userId=${encodeURIComponent(userId)}`)
      .then(res => res.json())
      .then(data => setSavedKeys(data.keys || {}));
  }, [saved]);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (apiKey && apiKey.length < 10) {
      setError('API Key looks too short.');
      setShowToast(true);
      setToastMsg('API Key looks too short.');
      setTimeout(() => setShowToast(false), 2500);
      return;
    }
    onSave(selectedBot, apiKey, endpoint);
    setSaved(true);
    setShowToast(true);
    setToastMsg('Saved!');
    setTimeout(() => setShowToast(false), 2000);
    setApiKey('');
    setEndpoint('');
    setTimeout(() => setSaved(false), 1000);
  }

  return (
    <div style={{ maxWidth: 540, margin: '0 auto', padding: 32, background: '#fff', borderRadius: 14, boxShadow: '0 2px 16px rgba(0,0,0,0.07)', position: 'relative' }}>
      {showToast && (
        <div
          role="alert"
          style={{
            position: 'absolute',
            top: 10,
            right: 16,
            background: error ? '#ffcccc' : '#d1ffe0',
            color: error ? '#a00' : '#0a4',
            padding: '8px 18px',
            borderRadius: 8,
            fontWeight: 600,
            zIndex: 10,
            boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
            fontSize: 15,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          {toastMsg}
          {/* TODO: Implement undo bot action if needed in the future */}
        </div>
      )}
      <h2 style={{ marginBottom: 18, fontWeight: 800, fontSize: 25, letterSpacing: 0.5, color: '#0070f3', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span>Manage Bot API Keys</span>
      </h2>
      <div style={{ marginBottom: 22, color: '#444', fontSize: 16 }}>
        Securely connect your own API keys or endpoints for each bot. <br />
        <span style={{ color: '#888', fontSize: 14 }}>Free and paid bots supported. Your keys are only used for your account.</span>
      </div>
      <form onSubmit={handleSave} style={{ background: '#f8fafd', borderRadius: 10, padding: 18, boxShadow: '0 1px 6px rgba(0,0,0,0.03)', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <label htmlFor="bot-select" style={{ fontWeight: 600, fontSize: 17 }}>Select Bot:</label>
          <select id="bot-select" value={selectedBot} onChange={e => setSelectedBot(e.target.value)} style={{ padding: 7, borderRadius: 7, fontSize: 16 }}>
            {bots.map(bot => (
              <option value={bot.id} key={bot.id}>{BOT_ICONS[bot.id] || '🤖'} {bot.name}</option>
            ))}
          </select>
        </div>
        <div style={{ margin: '10px 0 14px 0', fontSize: 15, color: '#555' }}>
          {BOT_INSTRUCTIONS[selectedBot] || 'Enter your API key and endpoint if required.'}
        </div>
        <input
          type="text"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          placeholder="API Key (if required)"
          style={{ width: '100%', padding: 10, borderRadius: 7, border: '1.5px solid #bcd', marginBottom: 10, fontSize: 16 }}
          aria-label="API Key"
        />
        <input
          type="text"
          value={endpoint}
          onChange={e => setEndpoint(e.target.value)}
          placeholder="Custom Endpoint (optional)"
          style={{ width: '100%', padding: 10, borderRadius: 7, border: '1.5px solid #bcd', marginBottom: 10, fontSize: 16 }}
          aria-label="Custom Endpoint"
        />
        <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
          <button type="submit" style={{ padding: '10px 18px', borderRadius: 8, background: '#0070f3', color: '#fff', fontWeight: 700, fontSize: 17, border: 'none', cursor: 'pointer', minWidth: 90 }}>
            Save
          </button>
          <button
            type="button"
            style={{ padding: '10px 14px', borderRadius: 8, background: '#eee', color: '#a00', fontWeight: 600, fontSize: 16, border: 'none', cursor: 'pointer' }}
            onClick={() => {
              // Reset/delete credentials for this bot
              const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') || 'demo-user' : 'demo-user';
              fetch(`/api/ai/user-bot-keys?userId=${encodeURIComponent(userId)}&botId=${encodeURIComponent(selectedBot)}`, {
                method: 'DELETE',
              }).then(() => setSavedKeys((prev) => ({ ...prev, [selectedBot]: undefined })));
              setShowToast(true);
              setToastMsg('Credentials deleted');
              setApiKey('');
              setEndpoint('');
              setTimeout(() => setShowToast(false), 2000);
            }}
            aria-label="Delete credentials for this bot"
          >
            Delete
          </button>
        </div>
      </form>
      <div style={{ marginTop: 18 }}>
        <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Saved Credentials</h3>
        <div style={{ background: '#f7fafd', borderRadius: 8, padding: 12, minHeight: 40 }}>
          {bots.map(bot => (
            <div key={bot.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 21 }}>{BOT_ICONS[bot.id] || '🤖'}</span>
              <span style={{ fontWeight: 600 }}>{bot.name}</span>
              {savedKeys[bot.id]?.apiKey ? (
                <span style={{ color: '#0a4', marginLeft: 10, fontSize: 15 }}>API Key saved</span>
              ) : (
                <span style={{ color: '#aaa', marginLeft: 10, fontSize: 15 }}>No key</span>
              )}
              {savedKeys[bot.id]?.endpoint && (
                <span style={{ color: '#0070f3', marginLeft: 10, fontSize: 14 }}>Custom endpoint</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
