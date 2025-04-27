import React, { useEffect, useState } from 'react';
import { BotApiKeyManager } from '../components/BotApiKeyManager';

export default function BotSettingsPage() {
  const [bots, setBots] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetch('/api/ai/bots')
      .then(res => res.json())
<<<<<<< HEAD
      .then(data => setBots(data.bots.map((b: { id: string; name: string }) => ({ id: b.id, name: b.name }))));
=======
      .then(data => setBots(data.bots.map((b: any) => ({ id: b.id, name: b.name }))));
>>>>>>> 9841034 (Initial full project commit: user/admin dashboards, tasks, notifications, MongoDB, and statistics features)
  }, []);

  function handleSave(botId: string, apiKey: string, endpoint?: string) {
    // Assume userId is available via auth/session (replace with real userId)
    const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') || 'demo-user' : 'demo-user';
    fetch(`/api/ai/user-bot-keys?userId=${encodeURIComponent(userId)}&botId=${encodeURIComponent(botId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey, endpoint }),
    });
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f6f8fa', paddingTop: 36 }}>
      <h1 style={{ textAlign: 'center', marginBottom: 24 }}>Manage Your Bot API Keys & Endpoints</h1>
      {bots.length > 0 ? (
        <BotApiKeyManager bots={bots} onSave={handleSave} />
      ) : (
        <div style={{ textAlign: 'center', color: '#888', marginTop: 60 }}>Loading bots...</div>
      )}
    </div>
  );
}
