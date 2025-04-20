import { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import Head from 'next/head';

let socket: ReturnType<typeof io> | null = null;

// Logging utility for security and connectivity events
const logEvent = (event: string, details?: any) => {
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.log(`[JailRoom] ${event}`, details || '');
  }
};

interface JailUser {
  username: string;
  avatar?: string;
  profileData?: Record<string, any>;
}

interface JailMessage {
  user: string;
  text: string;
  timestamp: number;
}

interface JailReward {
  reward: number;
  userCount: number;
}

interface JailNotification {
  message: string;
  type: 'warning' | 'success' | 'info';
  duration?: number;
}

import SimplePeer from 'simple-peer';

import UserPiKycGuard from '../components/UserPiKycGuard';

export default function JailRoom() {
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting' | 'disconnected'>('disconnected');
  const [ping, setPing] = useState<number | null>(null);
  const [lastPingTime, setLastPingTime] = useState<number | null>(null);
  const [users, setUsers] = useState<JailUser[]>([]);
  const [messages, setMessages] = useState<JailMessage[]>([]);
  const [input, setInput] = useState('');
  const [profile] = useState<JailUser>({ 
    username: 'YourUser', 
    avatar: '👤', 
    profileData: {} 
  }); // Replace with real profile
  const [notification, setNotification] = useState<JailNotification | null>(null);
  const [reward, setReward] = useState<JailReward | null>(null);
  const [isJailActive, setIsJailActive] = useState(false);
  const [jailTimeRemaining, setJailTimeRemaining] = useState<number | null>(null);
  const [activeEmotes, setActiveEmotes] = useState<Record<string, { emote: string; ts: number }>>({});
  // Speaking indicator state
  const [speakingUsers, setSpeakingUsers] = useState<string[]>([]);
  // Volume meter state: username -> 0..1
  const [userVolumes, setUserVolumes] = useState<Record<string, number>>({});
  // Push-to-Talk state
  const [isPTTActive, setIsPTTActive] = useState(false);
  const [pttMode, setPTTMode] = useState<'hold' | 'toggle'>('hold');

  // Voice chat state
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [voiceUsers, setVoiceUsers] = useState<string[]>([]); // usernames in voice
  const [localStream, setLocalStream] = useState<MediaStream|null>(null);
  const [peers, setPeers] = useState<Record<string, SimplePeer.Instance>>({});
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({}); // refs for remote audio
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Emote sending helper
  const EMOTE_LIST = ['😀','😂','😎','😡','😭','😍','👍','👏','🎉','🤔','😱','🥳','💯','🔥','🤖','👋'];

  const sendEmote = (emote: string) => {
    if (!profile.username) return;
    socket?.emit('sendEmote', { user: profile.username, emote });
    setActiveEmotes(prev => ({ ...prev, [profile.username]: { emote, ts: Date.now() } }));
    setTimeout(() => {
      setActiveEmotes(prev => {
        const copy = { ...prev };
        if (copy[profile.username] && Date.now() - copy[profile.username].ts > 1800) {
          delete copy[profile.username];
        }
        return copy;
      });
    }, 2000);
  };

  useEffect(() => {
    if (!socket) {
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';
      socket = io(socketUrl, { transports: ['websocket'] });
    }

    // Connection status listeners
    socket.on('connect', () => {
      setConnectionStatus('connected');
      logEvent('Socket connected');
    });
    socket.on('disconnect', () => {
      setConnectionStatus('disconnected');
      logEvent('Socket disconnected');
    });
    socket.on('reconnect_attempt', () => {
      setConnectionStatus('reconnecting');
      logEvent('Socket reconnecting');
    });
    socket.on('reconnect', () => {
      setConnectionStatus('connected');
      logEvent('Socket reconnected');
    });
    socket.on('connect_error', (err: any) => {
      setConnectionStatus('disconnected');
      logEvent('Socket connection error', err);
    });

    socket.emit('joinJail', profile);

    // Set up socket listeners
    socket.on('jailUsers', setUsers);

    // Voice chat: listen for user join/leave voice
    socket.on('voiceUsers', (voiceList: string[]) => {
      setVoiceUsers(voiceList);
    });

    // WebRTC signaling: listen for signal events
    socket.on('signal', ({ from, signal }: { from: string, signal: any }) => {
      setPeers(prev => {
        if (!prev[from]) return prev; // Defensive: peer should exist
        prev[from].signal(signal);
        return { ...prev };
      });
    });


    // Listen for emote events
    socket.on('emote', ({ user, emote }: { user: string; emote: string }) => {
      setActiveEmotes(prev => ({ ...prev, [user]: { emote, ts: Date.now() } }));
      setTimeout(() => {
        setActiveEmotes(prev => {
          const copy = { ...prev };
          if (copy[user] && Date.now() - copy[user].ts > 1800) {
            delete copy[user];
          }
          return copy;
        });
      }, 2000);
    });
    socket.on('jailMessage', (msg: JailMessage) => {
      setMessages((prev) => [...prev, msg]);
    });
    socket.on('jailStatus', ({ active, startTime, endTime }: { active: boolean, startTime?: number, endTime?: number }) => {
      setIsJailActive(active);
      if (active && endTime) {
        const updateCountdown = () => {
          const now = Date.now();
          const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
          setJailTimeRemaining(remaining);
          if (remaining > 0) {
            requestAnimationFrame(updateCountdown);
          }
        };
        updateCountdown();
      } else {
        setJailTimeRemaining(null);
      }
    });
    socket.on('jailStartingSoon', ({ in: seconds, startTime }: { in: number, startTime: number }) => {
      setNotification({
        message: `Jail time starts in ${seconds / 60} minute!`,
        type: 'warning',
        duration: seconds * 1000
      });
    });
    socket.on('jailReward', (rewardData: JailReward) => {
      setReward(rewardData);
      setNotification({
        message: `You earned ${rewardData.reward} points!`,
        type: 'success',
        duration: 5000
      });
      setTimeout(() => setReward(null), 8000); // Hide reward popup after 8s
    });

    // Automated connectivity test (ping)
    let pingInterval: NodeJS.Timeout | null = null;
    const runPingTest = () => {
      if (!socket?.connected) {
        setPing(null);
        return;
      }
      const start = Date.now();
      socket.emit('pingTest', {}, () => {
        const latency = Date.now() - start;
        setPing(latency);
        setLastPingTime(Date.now());
        logEvent('Ping test', { latency });
      });
    };
    pingInterval = setInterval(runPingTest, 10000); // every 10s
    runPingTest();

    // Error handling for socket
    socket.on('error', (err: any) => {
      logEvent('Socket error', err);
    });

    return () => {
      socket?.emit('leaveJail');
      socket?.off('connect');
      socket?.off('disconnect');
      socket?.off('reconnect_attempt');
      socket?.off('reconnect');
      socket?.off('connect_error');
      socket?.off('error');
      socket?.off('jailUsers');
      socket?.off('voiceUsers');
      socket?.off('signal');
      socket?.off('jailMessage');
      socket?.off('emote');
      socket?.off('jailStatus');
      socket?.off('jailStartingSoon');
      socket?.off('jailReward');
      if (pingInterval) clearInterval(pingInterval);
    };
  }, [profile]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (input.trim()) {
      socket?.emit('jailMessage', { user: profile.username, text: input });
      setInput('');
      inputRef.current?.focus();
    }
  };

  // Format time remaining as MM:SS
  const formatTimeRemaining = (seconds: number | null) => {
    if (seconds === null) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <Head>
        <title>SafeSoundArena - Jail Room</title>
      </Head>
      
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-0 overflow-hidden">
        {/* Connection Status & Security Notice */}
        <div className="flex flex-col items-center justify-center pt-6 pb-2">
          <div className={`px-4 py-1 rounded-full font-semibold text-sm mb-2 ${
            connectionStatus === 'connected' ? 'bg-green-700 text-white' :
            connectionStatus === 'reconnecting' ? 'bg-yellow-600 text-white animate-pulse' :
            'bg-red-700 text-white'
          }`}>
            {connectionStatus === 'connected' && 'Connected'}
            {connectionStatus === 'reconnecting' && 'Reconnecting...'}
            {connectionStatus === 'disconnected' && 'Disconnected'}
          </div>
          <div className="text-xs text-gray-400 mb-1">Real-time lobby status</div>
          <div className="bg-gray-800 rounded px-3 py-2 text-xs text-gray-300 max-w-lg">
            <strong>Security Notice:</strong> While in jail time, all activity is monitored for your safety. Please do not share sensitive information. Connectivity is actively tested for fairness and transparency.
          </div>
        </div>
        {/* Connectivity Test */}
        <div className="flex flex-col items-center mb-4">
          <div className="text-sm text-gray-300">
            <span className="font-medium">Ping:</span> {ping !== null ? `${ping} ms` : 'N/A'}
            {lastPingTime && (
              <span className="ml-3 text-xs text-gray-500">(Last checked: {new Date(lastPingTime).toLocaleTimeString()})</span>
            )}
          </div>
        </div>
        {/* Header */}
        <div className="sticky top-0 z-10 bg-black bg-opacity-80 backdrop-blur-sm border-b border-red-800">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <motion.h1 
              className="text-3xl md:text-4xl font-bold flex items-center gap-3 text-red-500"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="text-4xl">🚨</span> Jail Room
            </motion.h1>
            
            {isJailActive && jailTimeRemaining !== null && (
              <motion.div 
                className="flex items-center gap-2 bg-red-900/50 px-4 py-2 rounded-full text-white font-mono"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                <span className="text-xl font-bold">{formatTimeRemaining(jailTimeRemaining)}</span>
              </motion.div>
            )}
          </div>
        </div>

        {/* Notification */}
        <AnimatePresence>
          {notification && (
            <motion.div 
              className={`w-full text-center py-3 font-bold text-lg ${notification.type === 'warning' ? 'bg-amber-500 text-amber-950' : notification.type === 'success' ? 'bg-green-500 text-green-950' : 'bg-blue-500 text-blue-950'}`}
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              transition={{ type: 'spring', damping: 15 }}
              onAnimationComplete={() => {
                if (notification.duration) {
                  setTimeout(() => setNotification(null), notification.duration);
                }
              }}
            >
              {notification.message}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reward Animation */}
        <AnimatePresence>
          {reward && (
            <motion.div 
              className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div 
                className="bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-yellow-400 rounded-xl p-6 shadow-[0_0_30px_rgba(234,179,8,0.3)] text-center"
                initial={{ scale: 0.8, y: 50 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.8, y: 50 }}
                transition={{ type: 'spring', damping: 12 }}
              >
                <motion.div
                  className="text-5xl mb-2"
                  animate={{ 
                    scale: [1, 1.2, 1], 
                    rotate: [0, 10, -10, 0],
                  }}
                  transition={{ 
                    duration: 0.8, 
                    repeat: 3, 
                    repeatType: 'reverse' 
                  }}
                >
                  🎉
                </motion.div>
                <h2 className="text-yellow-400 text-3xl font-bold mb-1">Reward!</h2>
                <div className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 my-3">
                  +{reward.reward} Points
                </div>
                <div className="text-gray-300 text-sm">{reward.userCount} users in jail</div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-200px)]">
            {/* Spatial Lobby: Users as Avatars in a Room */}
            <motion.div
              className="flex-1 flex flex-col items-center justify-center min-h-[400px] relative"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              {/* Voice Chat Controls */}
      <div className="w-full flex justify-center mb-4 gap-4">
        <button
          className={`px-4 py-2 rounded-lg font-semibold transition-colors shadow-md ${isVoiceActive ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-green-600 text-white hover:bg-green-700'}`}
          onClick={async () => {
            if (isVoiceActive) {
              // Leave voice chat
              setIsVoiceActive(false);
              setIsMuted(false);
              setVoiceUsers(vu => vu.filter(u => u !== profile.username));
              socket?.emit('leaveVoice');
              if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
                setLocalStream(null);
              }
              // Clean up peers
              Object.values(peers).forEach(peer => peer.destroy());
              setPeers({});
              audioRefs.current = {};
            } else {
              // Join voice chat
              try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                setLocalStream(stream);
                setIsVoiceActive(true);
                setIsMuted(false);
                socket?.emit('joinVoice');
                // Wait for voiceUsers to update, then connect to others
                setTimeout(() => {
                  setPeers(prev => {
                    const newPeers: Record<string, SimplePeer.Instance> = {};
                    voiceUsers.forEach(u => {
                      if (u === profile.username) return;
                      // Initiator: lower username alphabetically starts connection
                      const initiator = profile.username < u;
                      const peer = new SimplePeer({
                        initiator,
                        trickle: false,
                        stream
                      });
                      peer.on('signal', signal => {
                        socket?.emit('signal', { to: u, from: profile.username, signal });
                      });
                      peer.on('stream', remoteStream => {
                        // Play remote audio
                        if (!audioRefs.current[u]) {
                          const audio = new window.Audio();
                          audio.srcObject = remoteStream;
                          audio.autoplay = true;
                          audioRefs.current[u] = audio;
                        } else {
                          audioRefs.current[u].srcObject = remoteStream;
                        }
                        // Speaking indicator logic + volume meter
                        try {
                          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                          const analyser = audioContext.createAnalyser();
                          const source = audioContext.createMediaStreamSource(remoteStream);
                          source.connect(analyser);
                          const dataArray = new Uint8Array(analyser.frequencyBinCount);
                          function checkVolume() {
                            analyser.getByteFrequencyData(dataArray);
                            const volume = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
                            setUserVolumes(prev => ({ ...prev, [u]: Math.min(volume / 100, 1) }));
                            if (volume > 20) { // Threshold: adjust as needed
                              setSpeakingUsers(prev => prev.includes(u) ? prev : [...prev, u]);
                            } else {
                              setSpeakingUsers(prev => prev.filter(name => name !== u));
                            }
                            requestAnimationFrame(checkVolume);
                          }
                          checkVolume();
                        } catch (err) {
                          // Fallback: ignore speaking indicator if AudioContext fails
                        }
                      });
                      peer.on('close', () => {
                        if (audioRefs.current[u]) {
                          audioRefs.current[u].pause();
                          delete audioRefs.current[u];
                        }
                      });
                      peer.on('error', () => {
                        if (audioRefs.current[u]) {
                          audioRefs.current[u].pause();
                          delete audioRefs.current[u];
                        }
                      });
                      newPeers[u] = peer;
                    });
                    return newPeers;
                  });
                }, 500);
              } catch (err) {
                alert('Could not access microphone.');
              }
            }
          }}
        >
          {isVoiceActive ? 'Leave Voice Chat' : 'Join Voice Chat'}
        </button>
        {isVoiceActive && (
          <>
            <button
              className={`px-4 py-2 rounded-lg font-semibold transition-colors shadow-md ${isMuted ? 'bg-gray-500 text-white hover:bg-gray-600' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              onClick={() => {
                if (localStream) {
                  localStream.getAudioTracks().forEach(track => (track.enabled = isMuted));
                  setIsMuted(m => !m);
                }
              }}
              title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isMuted ? 'Unmute' : 'Mute'}
            </button>
            <button
              className={`px-4 py-2 rounded-lg font-semibold transition-colors shadow-md ${isPTTActive ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-white hover:bg-yellow-600'}`}
              onMouseDown={() => {
                if (pttMode === 'hold' && localStream) {
                  localStream.getAudioTracks().forEach(track => (track.enabled = true));
                  setIsPTTActive(true);
                }
              }}
              onMouseUp={() => {
                if (pttMode === 'hold' && localStream) {
                  localStream.getAudioTracks().forEach(track => (track.enabled = false));
                  setIsPTTActive(false);
                }
              }}
              onClick={() => {
                if (pttMode === 'toggle' && localStream) {
                  const newState = !isPTTActive;
                  localStream.getAudioTracks().forEach(track => (track.enabled = newState));
                  setIsPTTActive(newState);
                }
              }}
              onTouchStart={e => { e.preventDefault(); if (pttMode === 'hold' && localStream) { localStream.getAudioTracks().forEach(track => (track.enabled = true)); setIsPTTActive(true); } }}
              onTouchEnd={e => { e.preventDefault(); if (pttMode === 'hold' && localStream) { localStream.getAudioTracks().forEach(track => (track.enabled = false)); setIsPTTActive(false); } }}
              title={pttMode === 'hold' ? 'Push and hold to talk' : 'Toggle to talk'}
            >
              {pttMode === 'hold' ? (isPTTActive ? 'Talking...' : 'Push-to-Talk') : (isPTTActive ? 'Talking...' : 'Talk')}
            </button>
            <button
              className="px-2 py-1 rounded bg-gray-800 text-xs text-gray-200 border border-gray-600 ml-2"
              onClick={() => setPTTMode(pttMode === 'hold' ? 'toggle' : 'hold')}
              title="Switch PTT mode"
            >
              {pttMode === 'hold' ? 'Hold Mode' : 'Toggle Mode'}
            </button>
          </>
        )}
      </div>
      {/* Show voice users */}
      <div className="w-full flex justify-center mb-2 gap-2 flex-wrap">
        {voiceUsers.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-indigo-200">
            <span className="font-bold">In Voice:</span>
            {voiceUsers.map(u => (
              <span key={u} className={`px-2 py-1 rounded-full bg-indigo-700 text-white font-semibold ${u === profile.username ? 'border border-yellow-300' : ''}`}>{u}</span>
            ))}
          </div>
        )}
      </div>
      <div className="relative w-full max-w-3xl h-[420px] bg-gray-900/80 rounded-2xl border border-indigo-800 shadow-xl flex items-center justify-center overflow-hidden">
                {/* Arrange users in a grid (5 columns) */}
                {users.map((user, i) => {
                  // Use a random emoji for avatar if not present
                  const emojiList = ['🦁','🐼','🐸','🐵','🦊','🐯','🐻','🐨','🐶','🐱','🐰','🦄','🐮','🐷','🐔','🐙','🐢','🐧','🦉','🦋','🐝','🐞','🦖','🐲','🐳','🐬','🦓','🦒','🐘','🦥','🦦','🦨','🦔','🦩','🦚','🦜','🦢','🦩','🦚','🦜'];
                  // Deterministically pick emoji based on username hash
                  let hash = 0; for (let c of user.username) hash += c.charCodeAt(0);
                  const avatar = user.avatar || emojiList[hash % emojiList.length];
                  // Grid position (5 columns)
                  const cols = 5;
                  const row = Math.floor(i / cols);
                  const col = i % cols;
                  const gridW = 90; // px
                  const gridH = 110; // px
                  const isCurrentUser = user.username === profile.username;
                  return (
                    <div
                      key={user.username}
                      className="absolute flex flex-col items-center group cursor-pointer transition-all duration-200"
                      style={{
                        left: `${col * gridW + 60}px`,
                        top: `${row * gridH + 50}px`,
                        zIndex: 10 + i
                      }}
                      title={user.username}
                    >
                      <div className="relative">
                        <div className={`w-16 h-16 rounded-full bg-indigo-700 flex items-center justify-center text-3xl border-4 border-indigo-400 shadow-lg group-hover:scale-110 transition-transform ${speakingUsers.includes(user.username) ? 'ring-4 ring-yellow-400' : ''}`}>
                          {avatar}
                        </div>
                        {/* Volume meter below avatar */}
                        <div className="w-12 h-2 mt-1 bg-gray-700 rounded overflow-hidden">
                          <div className="h-2 bg-yellow-400 transition-all" style={{ width: `${Math.round((userVolumes[user.username] || 0) * 100)}%` }} />
                        </div>
                        {/* Emote Animation Overlay */}
                        {activeEmotes[user.username] && (
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 animate-bounce text-3xl pointer-events-none select-none drop-shadow-lg">
                            {activeEmotes[user.username].emote}
                          </div>
                        )}
                        {/* Emote Picker for current user */}
                        {isCurrentUser && (
                          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex gap-1 bg-gray-900 bg-opacity-80 rounded-xl px-2 py-1 shadow-lg border border-indigo-700 mt-2">
                            {EMOTE_LIST.map(e => (
                              <button
                                key={e}
                                className="text-2xl hover:scale-125 transition-transform focus:outline-none"
                                onClick={() => sendEmote(e)}
                                title={e}
                                type="button"
                              >
                                {e}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="mt-2 text-xs text-white bg-gray-800 bg-opacity-80 px-2 py-1 rounded shadow group-hover:bg-indigo-700 transition-colors">
                        {user.username}
                      </div>
                    </div>
                  );
                })}
                {users.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-500 italic">
                    No users in the lobby yet
                  </div>
                )}
              </div>
            </motion.div>

            {/* Chat Area */}
            <motion.div 
              className="flex-1 flex flex-col bg-gray-800/30 rounded-xl backdrop-blur-sm border border-gray-700 overflow-hidden"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg, index) => {
                  const isCurrentUser = msg.user === profile.username;
                  return (
                    <motion.div 
                      key={index}
                      className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      <div 
                        className={`max-w-[80%] px-4 py-2 rounded-2xl ${isCurrentUser 
                          ? 'bg-indigo-600 text-white rounded-tr-none' 
                          : 'bg-gray-700 text-gray-100 rounded-tl-none'}`}
                      >
                        {!isCurrentUser && (
                          <div className="font-semibold text-xs text-gray-300 mb-1">{msg.user}</div>
                        )}
                        <div>{msg.text}</div>

              {/* Input */}
              <div className="p-3 border-t border-gray-700 bg-gray-800/50">
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendMessage()}
                    className="flex-1 bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Type your message..."
                  />
                  <motion.button 
                    onClick={sendMessage}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    whileTap={{ scale: 0.95 }}
                    disabled={!input.trim()}
                  >
                    Send
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
}
