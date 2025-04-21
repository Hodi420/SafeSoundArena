import { useEffect, useState } from 'react';

interface AIProfile {
  pi_uid: string;
  username: string;
  avatarUrl?: string;
  preferences?: Record<string, unknown>;
  trainingData: string[];
  history: { timestamp: number; input: string; output: string }[];
}

export default function AIDashboard() {
  const [profile, setProfile] = useState<AIProfile | null>(null);
  const [input, setInput] = useState('');
  const [chat, setChat] = useState<{ input: string; output: string; timestamp: number }[]>([]);
  const [uploadText, setUploadText] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch profile and history on mount
  useEffect(() => {
    fetch('/api/ai-profile').then(res => res.json()).then(setProfile);
    fetch('/api/ai-history').then(res => res.json()).then(data => setChat(data.history || []));
  }, []);

  // Handle chat/AI interaction
  const sendInput = async () => {
    if (!input.trim()) return;
    setLoading(true);
    const res = await fetch('/api/ai-interact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input }),
    });
    const data = await res.json();
    setChat(c => [...c, { input, output: data.output, timestamp: Date.now() }]);
    setInput('');
    setLoading(false);
  };

  // Handle avatar upload (url only for now)
  const updateAvatar = async () => {
    if (!avatarUrl) return;
    await fetch('/api/ai-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatarUrl }),
    });
    setProfile(p => (p ? { ...p, avatarUrl } : p));
    setAvatarUrl('');
  };

  // Handle training data upload
  const uploadTraining = async () => {
    if (!uploadText.trim()) return;
    await fetch('/api/ai-profile-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: uploadText }),
    });
    setUploadText('');
    // Optionally, refetch profile
    fetch('/api/ai-profile').then(res => res.json()).then(setProfile);
  };

  // Replay chat
  const replayChat = () => {
    setChat(profile?.history || []);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center py-8">
      <div className="bg-gray-900 rounded-lg shadow-xl p-6 w-full max-w-3xl">
        <div className="flex items-center gap-6 mb-6">
          <div>
            <img
              src={profile?.avatarUrl || '/default-avatar.png'}
              alt="AI Avatar"
              className="w-24 h-24 rounded-full border-4 border-pink-500 object-cover"
            />
          </div>
          <div>
            <div className="text-2xl font-bold text-pink-400">{profile?.username || 'Your AI'}</div>
            <div className="text-xs text-blue-300 mb-2">Pi UID: {profile?.pi_uid}</div>
            <div className="flex gap-2">
              <input
                className="p-2 rounded bg-gray-800 border border-pink-500 text-white text-xs"
                placeholder="Paste avatar image URL..."
                value={avatarUrl}
                onChange={e => setAvatarUrl(e.target.value)}
              />
              <button
                className="px-3 py-1 rounded bg-pink-600 hover:bg-pink-700 text-xs font-bold"
                onClick={updateAvatar}
              >Update Avatar</button>
            </div>
          </div>
        </div>

        {/* Chat Section */}
        <div className="bg-gray-800 rounded p-4 mb-6 max-h-64 overflow-y-auto">
          <div className="font-bold text-lg text-pink-300 mb-2">AI Chat</div>
          {chat.length === 0 && <div className="text-gray-400">No conversation yet.</div>}
          {chat.map((msg, i) => (
            <div key={i} className="mb-2">
              <div className="text-blue-400 text-xs">You <span className="text-gray-400">({new Date(msg.timestamp).toLocaleTimeString()})</span>:</div>
              <div className="mb-1">{msg.input}</div>
              <div className="text-pink-300 text-xs">AI:</div>
              <div className="mb-2">{msg.output}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mb-6">
          <input
            className="flex-1 p-2 rounded bg-gray-800 border border-pink-500 text-white"
            placeholder="Type your message..."
            value={input}
            disabled={loading}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => (e.key === 'Enter' ? sendInput() : undefined)}
          />
          <button
            className="px-4 py-2 rounded bg-pink-600 hover:bg-pink-700 font-bold"
            onClick={sendInput}
            disabled={loading}
          >Send</button>
          <button
            className="px-2 py-2 rounded bg-blue-700 hover:bg-blue-800 font-bold text-xs"
            onClick={replayChat}
          >Replay</button>
        </div>

        {/* Training Data Upload */}
        <div className="bg-gray-800 rounded p-4 mb-6">
          <div className="font-bold text-pink-300 mb-2">Upload Training Data</div>
          <textarea
            className="w-full p-2 rounded bg-gray-900 border border-pink-500 text-white mb-2"
            rows={3}
            placeholder="Paste text or notes to train your AI..."
            value={uploadText}
            onChange={e => setUploadText(e.target.value)}
          />
          <button
            className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 font-bold"
            onClick={uploadTraining}
          >Upload</button>
        </div>

        {/* Preferences/Control Panel (simple for now) */}
        <div className="bg-gray-800 rounded p-4">
          <div className="font-bold text-pink-300 mb-2">AI Preferences (Coming Soon)</div>
          <div className="text-gray-400 text-xs">Control your AI's learning, behavior, and online updates here.</div>
        </div>
      </div>
    </div>
  );
}
