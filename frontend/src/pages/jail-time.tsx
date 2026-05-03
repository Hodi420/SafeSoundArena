import React, { useState } from 'react';
import JailtimeVoiceAuth from '../components/JailtimeVoiceAuth';
import { usePiAuth } from '../hooks/usePiAuth';

const JailTimePage = () => {
  const { profile, loading, error } = usePiAuth();
  const [voiceOk, setVoiceOk] = useState(false);
  const [jailStatus, setJailStatus] = useState<{ active: boolean; startTime?: number; endTime?: number } | null>(null);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [reward, setReward] = useState<number | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);
  const [messages, setMessages] = useState<{ username: string; text: string; timestamp: number }[]>([]);
  const [message, setMessage] = useState('');
  const [timer, setTimer] = useState<string | null>(null);

  // Fetch jail status on mount
  React.useEffect(() => {
    fetch('/api/jail')
      .then((res) => res.json())
      .then((data) => setJailStatus(data));
  }, []);

  // Connect to WebSocket for live updates
  React.useEffect(() => {
    if (!voiceOk) return;
    const socket = new window.WebSocket('ws://localhost:4000');
    socket.onopen = () => console.log('Connected to JailTime WebSocket');
    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.jailStatus) setJailStatus(msg.jailStatus);
        if (msg.jailReward) setReward(msg.jailReward.reward);
        if (msg.jailUsers) setUsers(msg.jailUsers);
        if (msg.jailMessage) setMessages((prev) => [...prev, msg.jailMessage]);
      } catch {}
    };
    setWs(socket);
    return () => socket.close();
  }, [voiceOk]);

  // Timer for jail end
  React.useEffect(() => {
    if (!jailStatus?.active || !jailStatus.endTime) {
      setTimer(null);
      return;
    }
    const interval = setInterval(() => {
      const seconds = Math.max(0, Math.floor((jailStatus.endTime - Date.now()) / 1000));
      if (seconds <= 0) {
        setTimer('00:00');
        clearInterval(interval);
      } else {
        const m = String(Math.floor(seconds / 60)).padStart(2, '0');
        const s = String(seconds % 60).padStart(2, '0');
        setTimer(`${m}:${s}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [jailStatus]);

  const handleJoinJail = () => {
    if (!ws) return;
    setJoining(true);
    ws.send(JSON.stringify({ type: 'joinJail', profile }));
    setJoined(true);
    setJoining(false);
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!ws || !message.trim()) return;
    ws.send(JSON.stringify({ type: 'jailMessage', username: profile?.username || 'אנונימי', text: message }));
    setMessage('');
  };

  if (loading) {
    return <div className="flex flex-col min-h-screen items-center justify-center bg-gray-900 text-white">בודק סטטוס KYC...</div>;
  }
  if (error) {
    return <div className="flex flex-col min-h-screen items-center justify-center bg-gray-900 text-red-600">שגיאת התחברות ל-Pi: {error}</div>;
  }
  if (!profile) {
    return <div className="flex flex-col min-h-screen items-center justify-center bg-gray-900 text-white">לא נמצא פרופיל Pi</div>;
  }
  if (!profile.kyc_verified) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center bg-gray-900 text-red-600">
        <div className="bg-white text-red-700 p-6 rounded shadow text-center max-w-md">
          <h2 className="text-xl font-bold mb-2">גישה ל-JailTime למאומתים בלבד</h2>
          <p>רק משתמשים עם KYC מאומת ב-Pi Network יכולים להיכנס.</p>
        </div>
      </div>
    );
  }
  if (!voiceOk) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center bg-gray-900 text-white">
        <JailtimeVoiceAuth onSuccess={() => setVoiceOk(true)} />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-gray-900 text-white">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full text-center">
        <h1 className="text-3xl font-bold mb-4">Jail Time</h1>
        {jailStatus ? (
          <>
            <p className="mb-2">
              סטטוס: {jailStatus.active ? <span className="text-green-400">פעיל</span> : <span className="text-yellow-400">לא פעיל</span>}
            </p>
            {jailStatus.active && jailStatus.endTime && (
              <>
                <p className="mb-2">ה-Jail יסתיים ב: {new Date(jailStatus.endTime).toLocaleTimeString()}</p>
                {timer && <p className="mb-2">נותרו: <span className="font-mono">{timer}</span></p>}
              </>
            )}
            {!joined ? (
              <button
                className="mt-4 px-6 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold"
                onClick={handleJoinJail}
                disabled={joining || !jailStatus.active}
              >
                הצטרף ל-Jail
              </button>
            ) : (
              <p className="mt-4 text-green-300">הצטרפת ל-Jail!</p>
            )}
            {/* רשימת משתמשים ב-Jail */}
            {jailStatus.active && (
              <div className="mt-6 bg-gray-700 rounded p-3 text-right">
                <h2 className="text-lg font-bold mb-2">משתמשים ב-Jail ({users.length}):</h2>
                <ul className="text-sm max-h-24 overflow-y-auto">
                  {users.length === 0 ? <li>אין משתמשים כרגע</li> : users.map((u, i) => <li key={i}>{u.username || u.name || 'משתמש'}</li>)}
                </ul>
              </div>
            )}
            {/* צ'אט Jail */}
            {jailStatus.active && (
              <div className="mt-6 bg-gray-700 rounded p-3 text-right">
                <h2 className="text-lg font-bold mb-2">צ'אט Jail</h2>
                <div className="bg-gray-900 rounded h-32 overflow-y-auto text-left mb-2 px-2 py-1 border border-gray-600">
                  {messages.length === 0 ? <div className="text-gray-400">אין הודעות</div> : messages.slice(-20).map((msg, i) => (
                    <div key={i} className="mb-1">
                      <span className="font-bold text-blue-300">{msg.username}:</span> <span>{msg.text}</span>
                      <span className="text-xs text-gray-500 ml-2">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
                <form className="flex gap-2" onSubmit={handleSendMessage}>
                  <input
                    className="flex-1 rounded px-2 py-1 bg-gray-800 text-white border border-gray-600"
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="כתוב הודעה..."
                    disabled={!joined}
                  />
                  <button
                    className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold"
                    type="submit"
                    disabled={!joined || !message.trim()}
                  >שלח</button>
                </form>
              </div>
            )}
          </>
        ) : (
          <p>טוען סטטוס Jail...</p>
        )}
        {reward && (
          <div className="mt-6 p-4 bg-green-700 rounded text-white">
            קיבלת תגמול של {reward} נקודות!
          </div>
        )}
      </div>
    </div>
  );
};

// Disable all global transitions and overlays for this page
(JailTimePage as { disableTransition?: boolean }).disableTransition = true;

export default JailTimePage;
