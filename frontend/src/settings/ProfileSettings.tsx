import React from 'react';
import { BotApiKeyManager } from './BotApiKeyManager';

// In the future, import and add more settings panels here (e.g., EmailSettings, NotificationSettings)

export default function ProfileSettingsPage() {
  // In a real app, fetch bots and userId from context/auth
  const bots = [
    { id: 'openai', name: 'OpenAI Chat' },
    { id: 'echo', name: 'Echo Bot' },
    // Add more bots here
  ];
  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') || 'demo-user' : 'demo-user';

  function handleSave(botId: string, apiKey: string, endpoint?: string) {
    fetch(`/api/ai/user-bot-keys?userId=${encodeURIComponent(userId)}&botId=${encodeURIComponent(botId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey, endpoint }),
    });
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f6f8fa', paddingTop: 36 }}>
      <h1 style={{ textAlign: 'center', marginBottom: 24 }}>Profile Settings</h1>
      <BotApiKeyManager bots={bots} onSave={handleSave} />
      {/* Add more settings panels here */}
    </div>
  );
}
