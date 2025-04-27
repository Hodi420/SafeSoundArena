import { motion, AnimatePresence } from 'framer-motion';
<<<<<<< HEAD
import { useBattleAction, useCharacter, useActiveBattle, useJoinBattle } from '../hooks/useCombat';
import { useWeather } from '../hooks/useWeather';
import { useInventory } from '../hooks/useInventory';
import { useMiniGames } from '../hooks/useMiniGames';
import { EMOJIS } from '../parameters/emojis';

export default function GameWorld() {

  const { data: character } = useCharacter('current');
=======
import useCombat from '../hooks/useCombat';
import useWeather from '../hooks/useWeather';
import useInventory from '../hooks/useInventory';
import useMiniGames from '../hooks/useMiniGames';
import { EMOJIS } from '../parameters/emojis';

export default function GameWorld() {
  const { data: character } = useCombat('current');
>>>>>>> 9841034 (Initial full project commit: user/admin dashboards, tasks, notifications, MongoDB, and statistics features)
  const { data: weather } = useWeather();
  const { data: inventory } = useInventory();
  const { data: miniGames } = useMiniGames();

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Status Bar */}
      <motion.div 
        className="fixed top-0 left-0 right-0 bg-gray-900 border-b border-blue-500 p-4"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-blue-400">
<<<<<<< HEAD
               Lvl {(character as any)?.level}
=======
              {(character as any)?.element && (EMOJIS.ELEMENTS as any)[(character as any).element]} Lvl {(character as any)?.level}
>>>>>>> 9841034 (Initial full project commit: user/admin dashboards, tasks, notifications, MongoDB, and statistics features)
            </div>
            <div className="flex items-center">
              <span className="text-red-400">❤️ {(character as any)?.health}/{(character as any)?.maxHealth}</span>
              <div className="w-24 h-2 bg-gray-800 ml-2 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-red-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${((character as any)?.health || 0) / ((character as any)?.maxHealth || 1) * 100}%` }}
                />
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-blue-400">⚡ {(character as any)?.energy}/{(character as any)?.maxEnergy}</span>
              <div className="w-24 h-2 bg-gray-800 ml-2 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-blue-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${((character as any)?.energy || 0) / ((character as any)?.maxEnergy || 1) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="text-2xl">
<<<<<<< HEAD
              {(weather as any)?.current}
=======
              {(weather as any)?.current && (EMOJIS.WEATHER as any)[(weather as any).current]}
>>>>>>> 9841034 (Initial full project commit: user/admin dashboards, tasks, notifications, MongoDB, and statistics features)
            </div>
            <div className="flex items-center space-x-2">
              {((inventory ?? []) as any[]).slice(0, 3).map((item) => (
                <motion.div
                  key={item.id}
                  className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center"
                  whileHover={{ scale: 1.1 }}
                >
                  {item.emoji}
                </motion.div>
              ))}
              <button className="text-gray-400 hover:text-white">+{(((inventory ?? []) as any[]).length || 0) - 3}</button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Game Content */}
      <div className="pt-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Mini Games */}
            <AnimatePresence>
              {((miniGames ?? []) as any[]).map((game) => (
                <motion.div
                  key={game.id}
                  className="card group"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="text-3xl mb-2">{game.emoji}</div>
                  <h3 className="text-xl font-bold text-blue-400 mb-2">{game.name}</h3>
                  <p className="text-gray-400 mb-4">{game.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-yellow-400">🏆</span>
                      <span>{game.highScores[0]?.score || 0}</span>
                    </div>
                    <button className="btn-primary">Play</button>
                  </div>

                  {/* Rewards Preview */}
                  <div className="mt-4 pt-4 border-t border-gray-800">
                    <div className="text-sm text-gray-400">Rewards:</div>
                    <div className="flex items-center space-x-3 mt-2">
                      <div className="flex items-center">
                        <span className="text-yellow-400">✨</span>
                        <span className="ml-1">{game.rewards.experience}xp</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-blue-400">💰</span>
                        <span className="ml-1">{game.rewards.currency}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Weather Effects */}
      <AnimatePresence>
        {(weather as any)?.current === 'RAINY' && (
          <motion.div
            className="fixed inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-blue-500/10" />
            {/* Add rain animation here */}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Actions */}
      <motion.div
        className="fixed bottom-6 right-6 flex space-x-4"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
      >
        <button className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-700">
<<<<<<< HEAD
          ☰
        </button>
        <button className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-700">
          ⚙️
=======
          {EMOJIS.UI.MENU}
        </button>
        <button className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-700">
          {EMOJIS.UI.SETTINGS}
>>>>>>> 9841034 (Initial full project commit: user/admin dashboards, tasks, notifications, MongoDB, and statistics features)
        </button>
      </motion.div>
    </div>
  );
}
