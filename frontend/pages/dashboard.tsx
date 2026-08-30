import { useState } from 'react';
import { ReputationBar, FactionSelector, Marketplace, GuildPanel, NotificationCenter, ChallengeTracker } from '../src/components';
import AppWalletDemo from '../src/components/AppWalletDemo';

export default function Dashboard() {
  // For demo: mock user id
  const [userId] = useState('current');
  const [selectedFaction, setSelectedFaction] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-purple-50 text-gray-900 p-0">
      {/* Dashboard Hero/Header */}
      <section className="w-full bg-gradient-to-r from-blue-100 to-purple-100 border-b border-blue-200 py-10 px-4 text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-extrabold text-blue-700 mb-3">Your Dashboard</h1>
        <p className="text-lg md:text-xl text-gray-700 mb-2">Manage your quests, guilds, rewards, and more—all in one place.</p>
      </section>

      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* App Wallet Section */}
        <div className="col-span-1 md:col-span-2 lg:col-span-3">
          <div className="rounded-xl shadow-lg bg-white p-8 mb-6 flex flex-col items-center">
            <h2 className="text-2xl font-bold text-blue-700 mb-2 flex items-center gap-2">💼 Your Pi Wallet</h2>
            <AppWalletDemo />
          </div>
        </div>
        {/* Reputation Bar */}
        <div className="col-span-1 md:col-span-2 lg:col-span-3">
          <div className="rounded-xl shadow-lg bg-white p-8 flex flex-col items-center mb-6">
            <h2 className="text-2xl font-bold text-green-700 mb-2 flex items-center gap-2">🌟 Reputation</h2>
            <ReputationBar userId={userId} />
          </div>
        </div>
        {/* Faction Selector */}
        <div className="col-span-1">
          <div className="rounded-xl shadow-lg bg-white p-6 flex flex-col h-full">
            <h2 className="text-xl font-bold text-purple-700 mb-2 flex items-center gap-2">🛡️ Choose Your Faction</h2>
            <FactionSelector onSelect={setSelectedFaction} />
          </div>
        </div>
        {/* Marketplace */}
        <div className="col-span-1">
          <div className="rounded-xl shadow-lg bg-white p-6 flex flex-col h-full">
            <h2 className="text-xl font-bold text-blue-700 mb-2 flex items-center gap-2">🛒 Marketplace</h2>
            <Marketplace />
            <div className="mt-4 flex justify-end">
              <button className="btn-primary px-5 py-2 rounded-full text-base font-semibold shadow hover:scale-105 focus:ring-2 focus:ring-blue-400 transition">
                ➕ Add Item
              </button>
            </div>
          </div>
        </div>
        {/* Guilds */}
        <div className="col-span-1">
          <div className="rounded-xl shadow-lg bg-white p-6 flex flex-col h-full">
            <h2 className="text-xl font-bold text-pink-700 mb-2 flex items-center gap-2">🤝 Guilds</h2>
            <GuildPanel />
            <div className="mt-4 flex justify-end">
              <button className="btn-secondary px-5 py-2 rounded-full text-base font-semibold shadow hover:scale-105 focus:ring-2 focus:ring-pink-400 transition">
                ➕ Create Guild
              </button>
            </div>
          </div>
        </div>
        {/* Notifications */}
        <div className="col-span-1 md:col-span-2">
          <div className="rounded-xl shadow-lg bg-white p-6 flex flex-col h-full">
            <h2 className="text-xl font-bold text-yellow-700 mb-2 flex items-center gap-2">🔔 Notifications</h2>
            <NotificationCenter />
          </div>
        </div>
        {/* Challenges */}
        <div className="col-span-1 md:col-span-2 lg:col-span-3">
          <div className="rounded-xl shadow-lg bg-white p-8 flex flex-col h-full">
            <h2 className="text-2xl font-bold text-indigo-700 mb-2 flex items-center gap-2">🏆 Challenges</h2>
            <ChallengeTracker />
            <div className="mt-6 flex justify-end">
              <button className="btn-primary px-6 py-2 rounded-full text-base font-semibold shadow hover:scale-105 focus:ring-2 focus:ring-indigo-400 transition">
                ➕ Start New Challenge
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
