import { useEffect, useState } from 'react';
import { useRoom } from '../src/context/RoomContext';

interface LogEvent {
  type: string;
  payload: any;
  userId?: string;
  roomId: string;
  timestamp: string;
}

const typeColors: Record<string, string> = {
  api: 'bg-blue-700 border-blue-400',
  error: 'bg-red-700 border-red-400',
  action: 'bg-green-700 border-green-400',
  state: 'bg-yellow-700 border-yellow-400',
  default: 'bg-gray-900 border-pink-500',
};

function getTypeColor(type: string) {
  if (!type) return typeColors.default;
  const t = type.toLowerCase();
  if (t.includes('api')) return typeColors.api;
  if (t.includes('error')) return typeColors.error;
  if (t.includes('action')) return typeColors.action;
  if (t.includes('state')) return typeColors.state;
  return typeColors.default;
}

export default function DebugRoom() {
  const { roomId } = useRoom();
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [filter, setFilter] = useState('');
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [live, setLive] = useState(true);

  // Poll logs every second
  useEffect(() => {
    let mounted = true;
    async function fetchLogs() {
      const res = await fetch(`/api/logEvent?roomId=${roomId}`);
      const data = await res.json();
      if (mounted) setLogs(data.reverse()); // newest first
    }
    if (live) {
      fetchLogs();
      const interval = setInterval(fetchLogs, 1000);
      return () => { mounted = false; clearInterval(interval); };
    }
  }, [roomId, live]);

  const filteredLogs = filter
    ? logs.filter(log => log.type.toLowerCase().includes(filter.toLowerCase()) || JSON.stringify(log.payload).toLowerCase().includes(filter.toLowerCase()))
    : logs;

  function handleExport() {
    const blob = new Blob([JSON.stringify(filteredLogs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-room-${roomId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Find all unique event types and users
  const eventTypes = Array.from(new Set(logs.map(l => l.type)));
  const users = Array.from(new Set(logs.map(l => l.userId).filter(Boolean)));

  return (
    <div className="min-h-screen bg-black text-white flex flex-col md:flex-row">
      {/* Sidebar filters */}
      <div className="md:w-1/4 w-full p-6 bg-gray-900 border-r-4 border-pink-600 sticky top-0 h-full min-h-screen">
        <h1 className="text-2xl font-bold text-pink-400 mb-4">Debug Room</h1>
        <div className="mb-2 text-blue-400 text-sm break-all">Room ID:<br />{roomId}</div>
        <div className="mb-4 flex items-center gap-2">
          <span className={`h-3 w-3 rounded-full ${live ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`}></span>
          <span className="text-xs">Live</span>
          <button className="ml-4 px-2 py-1 rounded bg-pink-500 hover:bg-pink-600 text-xs" onClick={() => setLive(l => !l)}>{live ? 'Pause' : 'Resume'}</button>
        </div>
        <input
          className="w-full p-2 mb-2 rounded bg-gray-800 border border-pink-500 text-white"
          placeholder="Search logs..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
        <div className="mb-2">
          <div className="font-bold text-xs mb-1">Event Types</div>
          {eventTypes.map(type => (
            <div key={type} className="mb-1">
              <span className="inline-block px-2 py-1 rounded text-xs font-semibold bg-pink-700 mr-2">{type}</span>
            </div>
          ))}
        </div>
        <div className="mb-4">
          <div className="font-bold text-xs mb-1">Users</div>
          {users.map(user => (
            <div key={user} className="mb-1 text-blue-300 text-xs">{user}</div>
          ))}
        </div>
        <button className="w-full py-2 rounded bg-green-600 hover:bg-green-700 font-bold" onClick={handleExport}>Export Logs</button>
      </div>

      {/* Main logs area */}
      <div className="flex-1 p-4 overflow-y-auto max-h-screen">
        <div className="sticky top-0 bg-black z-10 pb-2">
          <div className="text-lg font-bold mb-2">Logs ({filteredLogs.length})</div>
        </div>
        <div className="space-y-4">
          {filteredLogs.length === 0 && <div className="text-gray-400">No logs yet for this room.</div>}
          {filteredLogs.map((log, i) => {
            const color = getTypeColor(log.type);
            const isOpen = expanded[i] || false;
            return (
              <div key={i} className={`rounded shadow border-l-8 p-4 ${color}`}> 
                <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={() => setExpanded(e => ({ ...e, [i]: !isOpen }))}>
                  <span className="font-bold text-yellow-200 text-base">{log.type}</span>
                  <span className="text-xs text-gray-300">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  <span className="ml-2 text-xs text-pink-200">{isOpen ? '▼' : '▶'}</span>
                </div>
                {isOpen && (
                  <>
                    <pre className="text-xs bg-gray-800 rounded p-2 overflow-x-auto mb-2">
                      {JSON.stringify(log.payload, null, 2)}
                    </pre>
                    {log.userId && <div className="text-xs text-blue-300">User: {log.userId}</div>}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
