import React from 'react';
import { motion } from 'framer-motion';
import { IconCrown, IconMedal, IconTrophy } from '@tabler/icons-react';

interface LeaderboardEntry {
  rank: number;
  username: string;
  score: number;
  avatar: string;
  isCurrentUser?: boolean;
  change?: number; // Position change: positive = up, negative = down, 0 = no change
}

interface GameLeaderboardProps {
  entries: LeaderboardEntry[];
  title?: string;
  maxEntries?: number;
}

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <IconCrown className="w-6 h-6 text-yellow-500" />;
    case 2:
      return <IconMedal className="w-6 h-6 text-gray-400" />;
    case 3:
      return <IconTrophy className="w-6 h-6 text-amber-600" />;
    default:
      return null;
  }
};

const getChangeColor = (change: number | undefined) => {
  if (!change) return 'text-gray-400';
  return change > 0 ? 'text-green-500' : 'text-red-500';
};

const getChangeText = (change: number | undefined) => {
  if (!change) return '—';
  return change > 0 ? `↑${change}` : `↓${Math.abs(change)}`;
};

export const GameLeaderboard: React.FC<GameLeaderboardProps> = ({
  entries,
  title = 'Leaderboard',
  maxEntries = 10,
}) => {
  const displayEntries = entries.slice(0, maxEntries);

  return (
    <div className="card neon-border p-6">
      <h2 className="text-2xl font-bold text-blue-400 neon-text mb-6">{title}</h2>
      
      <div className="space-y-2">
        {displayEntries.map((entry, index) => (
          <motion.div
            key={entry.username}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`
              relative p-4 rounded-lg
              ${entry.isCurrentUser 
                ? 'bg-blue-500/10 border border-blue-500/50'
                : 'bg-gray-100 dark:bg-gray-800'
              }
              hover:transform hover:scale-[1.02] transition-transform
            `}
          >
            <div className="flex items-center gap-4">
              {/* Rank */}
              <div className="flex-shrink-0 w-8 text-center">
                {getRankIcon(entry.rank) || (
                  <span className="text-lg font-bold text-gray-500">
                    {entry.rank}
                  </span>
                )}
              </div>

              {/* Avatar */}
              <div className="relative">
                <img
                  src={entry.avatar}
                  alt={`${entry.username}'s avatar`}
                  className="w-10 h-10 rounded-full"
                />
                {entry.isCurrentUser && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-white dark:border-gray-800" />
                )}
              </div>

              {/* Username */}
              <div className="flex-1">
                <span className={`
                  font-medium
                  ${entry.isCurrentUser ? 'text-blue-500' : 'text-gray-900 dark:text-gray-100'}
                `}>
                  {entry.username}
                </span>
              </div>

              {/* Score */}
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {entry.score.toLocaleString()}
                </span>
                <span className={`
                  text-sm font-medium w-8 text-right
                  ${getChangeColor(entry.change)}
                `}>
                  {getChangeText(entry.change)}
                </span>
              </div>
            </div>

            {/* Highlight effect for top 3 */}
            {entry.rank <= 3 && (
              <motion.div
                className="absolute inset-0 rounded-lg"
                animate={{
                  boxShadow: [
                    '0 0 0px rgba(var(--primary-color-rgb), 0)',
                    '0 0 20px rgba(var(--primary-color-rgb), 0.2)',
                    '0 0 0px rgba(var(--primary-color-rgb), 0)',
                  ],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            )}
          </motion.div>
        ))}
      </div>

      {entries.length > maxEntries && (
        <button className="w-full mt-4 p-2 text-sm text-blue-500 hover:text-blue-600 transition-colors">
          View Full Leaderboard
        </button>
      )}
    </div>
  );
}; 