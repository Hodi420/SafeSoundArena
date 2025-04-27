import { useUserReputation } from '../services/api/hooks/useReputation';
import { motion, AnimatePresence } from 'framer-motion';
import { EMOJIS } from '../constants/emojis';
import { useMemo } from 'react';

export default function ReputationBar({ userId }: { userId: string }) {
  const { data: reputation, isLoading, isError } = useUserReputation(userId);
  
  // Calculate the percentage for the circular progress
  const percentage = useMemo(() => {
    if (!reputation?.total) return 0;
    // Assuming max reputation is 1000, adjust as needed
    return Math.min(Math.max(reputation.total / 1000 * 100, 0), 100);
  }, [reputation?.total]);
  
  // Calculate color based on percentage
  const progressColor = useMemo(() => {
    if (percentage < 33) return 'rgb(239, 68, 68)'; // red-500
    if (percentage < 66) return 'rgb(245, 158, 11)'; // amber-500
    return 'rgb(34, 197, 94)'; // green-500
  }, [percentage]);

  if (isLoading) return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-gray-900 rounded-lg p-4 md:p-6 flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-6 border border-blue-500"
    >
      <div className="w-20 h-20 rounded-full bg-gray-800 animate-pulse flex items-center justify-center">
        <span className="text-lg text-gray-600">{EMOJIS.UI.INFO}</span>
      </div>
      <div className="w-full md:w-auto animate-pulse">
        <div className="h-4 bg-gray-800 rounded w-32 mb-2"></div>
        <div className="h-6 bg-gray-800 rounded w-48"></div>
      </div>
    </motion.div>
  );

  if (isError) return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-red-900/20 rounded-lg p-4 flex items-center space-x-4 border border-red-500"
    >
      <span className="text-lg font-bold text-red-400">{EMOJIS.UI.ERROR || '❌'}</span>
      <span>Failed to load reputation data</span>
    </motion.div>
  );

  return (
    <AnimatePresence mode="wait">
      <motion.div 
        key="reputation-bar"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-gray-900 rounded-lg p-4 md:p-6 flex flex-col md:flex-row items-center gap-4 md:gap-6 border border-blue-500/30 shadow-lg hover:shadow-blue-500/10 transition-all duration-300"
      >
        {/* Radial Progress */}
        <div className="relative flex-shrink-0">
          <svg className="w-20 h-20" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#1f2937"
              strokeWidth="10"
            />
            
            {/* Progress circle - animated */}
            <motion.circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={progressColor}
              strokeWidth="10"
              strokeLinecap="round"
              initial={{ strokeDasharray: "283 283", strokeDashoffset: 283 }}
              animate={{ 
                strokeDashoffset: 283 - (percentage / 100) * 283,
                transition: { duration: 1, ease: "easeOut" }
              }}
              style={{ transformOrigin: "center", transform: "rotate(-90deg)" }}
            />
            
            {/* Text inside circle */}
            <text
              x="50"
              y="50"
              dy=".3em"
              textAnchor="middle"
              className="text-2xl font-bold"
              fill="white"
            >
              {Math.round(percentage)}%
            </text>
          </svg>
        </div>
        
        {/* Reputation Info */}
        <div className="flex-grow">
          <div className="flex flex-col">
            <h3 className="text-lg font-semibold text-blue-400 mb-1">Reputation</h3>
            <div className="text-2xl font-bold text-white">
              <span>{reputation?.total || 0}</span>
              <span className="ml-2 text-purple-400 text-lg">{reputation?.rank || 'Newcomer'}</span>
            </div>
            
            {/* Faction Badges */}
            <div className="mt-3 flex flex-wrap gap-2">
<<<<<<< HEAD
              {reputation?.factions?.map((faction: any) => (
=======
              {reputation?.factions?.map(faction => (
>>>>>>> 9841034 (Initial full project commit: user/admin dashboards, tasks, notifications, MongoDB, and statistics features)
                <motion.div
                  key={faction.id}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="px-3 py-1 rounded-full text-sm flex items-center gap-1"
                  style={{ 
                    backgroundColor: `rgba(${faction.id.charCodeAt(0) % 255}, ${faction.id.charCodeAt(1) % 255}, ${faction.id.charCodeAt(2) % 255}, 0.2)`,
                    border: `1px solid rgba(${faction.id.charCodeAt(0) % 255}, ${faction.id.charCodeAt(1) % 255}, ${faction.id.charCodeAt(2) % 255}, 0.5)`
                  }}
                >
                  <span>{faction.emoji || '🏷️'}</span>
                  <span className="font-medium">{faction.name}</span>
                  <span className="ml-1 text-xs opacity-80">{faction.reputation}</span>
                </motion.div>
              ))}
              {(!reputation?.factions || reputation.factions.length === 0) && (
                <span className="text-sm text-gray-400">No faction affiliations yet</span>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
