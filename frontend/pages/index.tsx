import { motion } from 'framer-motion';
import { useState } from 'react';
import Link from 'next/link'; // For navigation
// Stubs for demo
const BotDialogue = () => <div style={{padding:16, color:'#ccc'}}>AI Guide coming soon!</div>;
const ScrollViewer = () => <div style={{padding:16, color:'#ccc'}}>Quest list coming soon!</div>;
const ThemeCustomizer = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => null; // Hide for now

export default function Home() {
  const [isThemeCustomizerOpen, setIsThemeCustomizerOpen] = useState(false);
  return (
    <div className="min-h-screen bg-black">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(37,99,235,0.1),transparent_50%)]" />
        <div className="absolute inset-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%232563eb' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }} />
      </div>
      
      <nav className="relative bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <motion.h1 
                className="text-2xl font-bold text-blue-500 neon-text"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                SafeSoundArena
              </motion.h1>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                className="btn-secondary flex items-center space-x-2 transition hover:scale-105 focus:ring-2 focus:ring-blue-400"
                aria-label="Open theme customizer"
                title="Open theme customizer"
                onClick={() => setIsThemeCustomizerOpen(true)}
              >
                <span className="text-lg">⚙️</span>
                <span>Customize UI</span>
              </button>
              <button 
                className="btn-primary transition hover:scale-105 focus:ring-2 focus:ring-yellow-400"
                aria-label="Connect to Pi Wallet"
                title="Connect to Pi Wallet (coming soon)"
                onClick={() => alert('Pi Wallet authentication coming soon!')}
              >
                🔗 Connect Pi Wallet
              </button>
              <Link href="/dashboard">
                <button className="btn-secondary transition hover:scale-105 focus:ring-2 focus:ring-green-400" aria-label="Go to dashboard" title="Go to dashboard">
                  🚀 Go to Dashboard
                </button>
              </Link>
            </div>

            <ThemeCustomizer
              isOpen={isThemeCustomizerOpen}
              onClose={() => setIsThemeCustomizerOpen(false)}
            />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="w-full bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl shadow mb-12 py-12 px-6 flex flex-col items-center text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold text-blue-700 mb-4">Welcome to SafeSoundArena</h1>
        <p className="max-w-2xl text-lg md:text-xl text-gray-700 mb-6">Embark on quests, join guilds, and earn Pi rewards. Your journey begins here!</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="/dashboard" className="btn-primary text-lg px-8 py-3 rounded-full shadow hover:scale-105 focus:ring-2 focus:ring-blue-400 transition">
            🚀 Go to Dashboard
          </a>
          <a href="/about" className="btn-secondary text-lg px-8 py-3 rounded-full shadow hover:scale-105 focus:ring-2 focus:ring-purple-400 transition">
            ℹ️ Learn More
          </a>
        </div>
      </section>

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Active Quests Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="rounded-xl shadow-lg bg-white p-8 flex flex-col h-full">
              <h2 className="text-2xl font-bold text-blue-700 mb-3 flex items-center gap-2">
                🗺️ Your Active Quests
              </h2>
              <ScrollViewer />
              <div className="mt-6 flex justify-end">
                <button className="btn-primary px-6 py-2 rounded-full text-base font-semibold shadow hover:scale-105 focus:ring-2 focus:ring-blue-400 transition">
                  ➕ Start New Quest
                </button>
              </div>
            </div>
          </motion.div>

          {/* AI Guide Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="rounded-xl shadow-lg bg-white p-8 flex flex-col h-full">
              <h2 className="text-2xl font-bold text-purple-700 mb-3 flex items-center gap-2">
                🤖 AI Guide
              </h2>
              <BotDialogue />
              <div className="mt-6 flex justify-end">
                <button className="btn-secondary px-6 py-2 rounded-full text-base font-semibold shadow hover:scale-105 focus:ring-2 focus:ring-purple-400 transition">
                  💬 Chat with Guide
                </button>
              </div>
            </div>
          </motion.div>

          {/* Honor Board Card */}
          <motion.div
            className="md:col-span-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div className="rounded-xl shadow-lg bg-white p-8 flex flex-col">
              <h2 className="text-2xl font-bold text-pink-700 mb-3 flex items-center gap-2">
                🏅 Honor Board
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg shadow group transition-all duration-300 hover:scale-105">
                    <div className="font-medium text-blue-600 text-lg mb-1">SafeSoundArena#{i}</div>
                    <div className="text-sm text-gray-500">Achievement unlocked</div>
                    <div className="mt-2 text-purple-700 font-bold text-xl">+100 Pi</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
