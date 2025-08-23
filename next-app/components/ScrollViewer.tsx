import { motion } from 'framer-motion';

type Quest = {
  id: number;
  title: string;
  description: string;
  reward: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  progress: number;
};

const quests: Quest[] = [
  {
    id: 1,
    title: 'First Steps',
    description: 'Complete your profile and connect your Pi wallet',
    reward: 50,
    difficulty: 'Easy',
    progress: 30,
  },
  {
    id: 2,
    title: 'Social Pioneer',
    description: 'Interact with 5 other pioneers in the community',
    reward: 100,
    difficulty: 'Medium',
    progress: 60,
  },
  {
    id: 3,
    title: 'Master Explorer',
    description: 'Complete 10 different quests in various categories',
    reward: 200,
    difficulty: 'Hard',
    progress: 10,
  },
];

export default function ScrollViewer() {
  return (
    <div className="space-y-4">
      {quests.map((quest) => (
        <motion.div
          key={quest.id}
          className="card hover:shadow-lg transition-all duration-300 cursor-pointer relative group"
          whileHover={{ scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-lg text-blue-400 neon-text group-hover:text-blue-300 transition-colors">{quest.title}</h3>
            <span
              className={`px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                quest.difficulty === 'Easy'
                  ? 'text-green-400 border-green-500'
                  : quest.difficulty === 'Medium'
                  ? 'text-yellow-400 border-yellow-500'
                  : 'text-red-400 border-red-500'
              } border-2 relative`}
              style={{
                clipPath: 'polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)'
              }}
            >
              {quest.difficulty}
            </span>
          </div>
          
          <p className="text-gray-400 text-sm mb-4 group-hover:text-gray-300 transition-colors">{quest.description}</p>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-blue-400">
              <span>Progress</span>
              <span className="font-mono">{quest.progress}%</span>
            </div>
            <div className="progress-bar">
              <motion.div
                className="progress-bar-fill"
                initial={{ width: 0 }}
                animate={{ width: `${quest.progress}%` }}
                transition={{ duration: 1 }}
              />
            </div>
          </div>

          <div className="mt-4 flex justify-between items-center text-sm">
            <span className="text-purple-400 font-bold font-mono group-hover:text-purple-300 transition-colors">
              <span className="text-xs text-gray-500 mr-1">Ⓟ</span>
              {quest.reward} Pi
            </span>
            <button className="btn-secondary text-xs">
              View Details
            </button>
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        </motion.div>
      ))}
    </div>
  );
}