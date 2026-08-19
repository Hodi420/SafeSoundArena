import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import Head from 'next/head';

/**
 * Jail System Test & Monitor Dashboard
 * Tracks complete jail cycle: Warning → Start → End → Rewards
 * Runs in separate window for testing and debugging
 * Access: http://localhost:3000/jail-test-monitor
 */

interface JailEvent {
  type: string;
  timestamp: number;
  jailActive: boolean;
  userCount: number;
  details: Record<string, any>;
}

interface TimelineEntry {
  label: string;
  time: string;
  status: 'pending' | 'active' | 'completed';
  expectedTime: Date;
}

const JAIL_TIMING = {
  CYCLE_LENGTH_MIN: 70,
  WARNING_BEFORE_SEC: 60,
  JAIL_DURATION_MIN: 10,
  REWARD_DELAY_SEC: 60,
  TOTAL_CYCLE_MIN: 81, // 70 + 10 + 1
};

export default function JailTestMonitor() {
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('disconnected');
  const [isJailActive, setIsJailActive] = useState(false);
  const [jailTimeRemaining, setJailTimeRemaining] = useState<number | null>(null);
  const [events, setEvents] = useState<JailEvent[]>([]);
  const [usersInJail, setUsersInJail] = useState<string[]>([]);
  const [nextCycleTime, setNextCycleTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [cycleProgress, setCycleProgress] = useState(0);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Timeline data for visual display
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);

  useEffect(() => {
    if (!socketRef.current) {
      const socketUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      socketRef.current = io(socketUrl, { transports: ['websocket'] });
    }

    const socket = socketRef.current;

    socket.on('connect', () => {
      setConnectionStatus('connected');
      console.log('[JailMonitor] Connected to socket');
    });

    socket.on('disconnect', () => {
      setConnectionStatus('disconnected');
      console.log('[JailMonitor] Disconnected from socket');
    });

    // Listen for jail events
    socket.on('jailStatus', ({ active, startTime, endTime }: any) => {
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

    socket.on('jailStartingSoon', ({ in: seconds, startTime }: any) => {
      const nextStart = new Date(startTime);
      setNextCycleTime(nextStart);
      addEvent('JAIL_WARNING', {
        message: `Jail starting in ${seconds} seconds`,
        startTime: new Date(startTime).toISOString(),
      });
    });

    socket.on('jailReward', ({ reward, userCount }: any) => {
      addEvent('REWARDS_SENT', {
        reward,
        userCount,
        totalReward: reward * userCount,
      });
      setUsersInJail([]);
    });

    // Log when jail starts
    const originalEmit = socket.emit;
    socket.emit = function (...args: any[]) {
      if (args[0] === 'joinJail') {
        console.log('[JailMonitor] Event: joinJail');
      }
      return originalEmit.apply(socket, args as [ev: string, ...args: any[]]);
    };

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Add event to log
  const addEvent = (type: string, details: any) => {
    const event: JailEvent = {
      type,
      timestamp: Date.now(),
      jailActive: isJailActive,
      userCount: usersInJail.length,
      details,
    };
    setEvents((prev) => [event, ...prev].slice(0, 100)); // Keep last 100 events
    console.log(`[${type}]`, event);
  };

  // Format seconds to MM:SS
  const formatTime = (seconds: number | null) => {
    if (seconds === null) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate timeline
  useEffect(() => {
    if (!isJailActive) return;

    const now = Date.now();
    const cycleStartMs = now - (elapsedTime * 1000);
    const warningTime = cycleStartMs + (JAIL_TIMING.CYCLE_LENGTH_MIN * 60 * 1000 - JAIL_TIMING.WARNING_BEFORE_SEC * 1000);
    const jailStartTime = cycleStartMs + (JAIL_TIMING.CYCLE_LENGTH_MIN * 60 * 1000);
    const jailEndTime = jailStartTime + (JAIL_TIMING.JAIL_DURATION_MIN * 60 * 1000);
    const rewardTime = jailEndTime + (JAIL_TIMING.REWARD_DELAY_SEC * 1000);

    setTimeline([
      {
        label: 'Warning',
        time: new Date(warningTime).toLocaleTimeString(),
        status: now > warningTime ? 'completed' : 'pending',
        expectedTime: new Date(warningTime),
      },
      {
        label: 'Jail Start',
        time: new Date(jailStartTime).toLocaleTimeString(),
        status: now > jailStartTime ? 'completed' : now > warningTime ? 'active' : 'pending',
        expectedTime: new Date(jailStartTime),
      },
      {
        label: 'Jail End',
        time: new Date(jailEndTime).toLocaleTimeString(),
        status: now > jailEndTime ? 'completed' : now > jailStartTime ? 'active' : 'pending',
        expectedTime: new Date(jailEndTime),
      },
      {
        label: 'Rewards',
        time: new Date(rewardTime).toLocaleTimeString(),
        status: now > rewardTime ? 'completed' : now > jailEndTime ? 'active' : 'pending',
        expectedTime: new Date(rewardTime),
      },
    ]);

    const progress = (elapsedTime / (JAIL_TIMING.TOTAL_CYCLE_MIN * 60)) * 100;
    setCycleProgress(Math.min(progress, 100));
  }, [isJailActive, elapsedTime]);

  // Update elapsed time when jail is active
  useEffect(() => {
    if (!isJailActive) {
      setElapsedTime(0);
      return;
    }

    timerRef.current = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isJailActive]);

  return (
    <>
      <Head>
        <title>SafeSoundArena - Jail Test Monitor</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-black text-white p-4">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold flex items-center gap-3">
              <span className="text-5xl">🔧</span> Jail System Test Monitor
            </h1>
            <div
              className={`px-4 py-2 rounded-full font-bold ${
                connectionStatus === 'connected'
                  ? 'bg-green-600 text-white'
                  : 'bg-red-600 text-white animate-pulse'
              }`}
            >
              {connectionStatus === 'connected' ? '✓ Connected' : '✗ Disconnected'}
            </div>
          </div>

          {/* Security & Info */}
          <div className="bg-blue-900/40 border border-blue-700 rounded-lg p-4">
            <p className="text-sm text-gray-300">
              <strong>Purpose:</strong> Monitor complete jail cycle in real-time. Expected flow: Warning (T+69min) →
              Start (T+70min) → End (T+80min) → Rewards (T+81min)
            </p>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <motion.div
            className="bg-slate-700/50 border border-slate-600 rounded-lg p-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-xs text-gray-400 mb-1">JAIL STATUS</div>
            <div className={`text-2xl font-bold ${isJailActive ? 'text-red-400' : 'text-gray-300'}`}>
              {isJailActive ? '🚨 ACTIVE' : '✓ Inactive'}
            </div>
          </motion.div>

          <motion.div
            className="bg-slate-700/50 border border-slate-600 rounded-lg p-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="text-xs text-gray-400 mb-1">TIME REMAINING</div>
            <div className="text-2xl font-bold text-yellow-400 font-mono">
              {formatTime(jailTimeRemaining)}
            </div>
          </motion.div>

          <motion.div
            className="bg-slate-700/50 border border-slate-600 rounded-lg p-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="text-xs text-gray-400 mb-1">USERS IN JAIL</div>
            <div className="text-2xl font-bold text-cyan-400">{usersInJail.length}</div>
          </motion.div>

          <motion.div
            className="bg-slate-700/50 border border-slate-600 rounded-lg p-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="text-xs text-gray-400 mb-1">CYCLE PROGRESS</div>
            <div className="text-2xl font-bold text-purple-400">{cycleProgress.toFixed(1)}%</div>
          </motion.div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6 bg-slate-700/50 border border-slate-600 rounded-lg p-4">
          <div className="text-sm text-gray-300 mb-2">Total Cycle: {JAIL_TIMING.TOTAL_CYCLE_MIN} minutes</div>
          <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden border border-slate-600">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: `${cycleProgress}%` }}
              transition={{ duration: 1, ease: 'linear' }}
            />
          </div>
        </div>

        {/* Timeline */}
        <div className="mb-6 bg-slate-700/50 border border-slate-600 rounded-lg p-4">
          <h2 className="text-lg font-bold mb-4">Expected Timeline</h2>
          <div className="space-y-3">
            {timeline.map((entry, index) => (
              <motion.div
                key={index}
                className={`flex items-center gap-4 p-3 rounded-lg border transition-all ${
                  entry.status === 'completed'
                    ? 'bg-green-900/30 border-green-700'
                    : entry.status === 'active'
                    ? 'bg-yellow-900/30 border-yellow-700 animate-pulse'
                    : 'bg-slate-600/30 border-slate-600'
                }`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="text-2xl">
                  {entry.status === 'completed' ? '✓' : entry.status === 'active' ? '→' : '○'}
                </div>
                <div className="flex-1">
                  <div className="font-bold">{entry.label}</div>
                  <div className="text-xs text-gray-400">{entry.time}</div>
                </div>
                <div className="text-xs font-mono bg-slate-900/50 px-2 py-1 rounded border border-slate-600">
                  {entry.status}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Events Log */}
        <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
          <h2 className="text-lg font-bold mb-4">Event Log (Last 50)</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto font-mono text-xs">
            {events.slice(0, 50).map((event, index) => (
              <motion.div
                key={index}
                className={`p-2 rounded border-l-2 ${
                  event.type === 'JAIL_STARTED'
                    ? 'bg-red-900/30 border-l-red-600 text-red-200'
                    : event.type === 'JAIL_ENDED'
                    ? 'bg-green-900/30 border-l-green-600 text-green-200'
                    : event.type === 'REWARDS_SENT'
                    ? 'bg-yellow-900/30 border-l-yellow-600 text-yellow-200'
                    : event.type === 'JAIL_WARNING'
                    ? 'bg-orange-900/30 border-l-orange-600 text-orange-200'
                    : 'bg-slate-600/30 border-l-slate-600 text-gray-300'
                }`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex justify-between">
                  <span className="font-bold">{event.type}</span>
                  <span className="text-gray-400">{new Date(event.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="text-gray-400 mt-1">
                  Users: {event.userCount} | Active: {event.jailActive ? 'YES' : 'NO'}
                </div>
                {Object.keys(event.details).length > 0 && (
                  <div className="text-gray-500 mt-1 bg-black/30 p-1 rounded">
                    {JSON.stringify(event.details, null, 2)}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>Jail System Test Monitor v1.0 | Real-time tracking of jail cycles</p>
          <p>Run tests with: npm test -- test/jail-system.test.js</p>
        </div>
      </div>
    </>
  );
}
