import React from 'react';
import { motion } from 'framer-motion';
import { useThemeStore } from '../store/useThemeStore';
import { IconSword, IconShield, IconBolt, IconTrophy } from '@tabler/icons-react';

export const ThemePreview: React.FC = () => {
  const { uiStyle } = useThemeStore();

  return (
    <div className="p-8 space-y-8">
      {/* Game Stats Section */}
      <section>
        <h2 className="text-2xl font-bold text-blue-400 neon-text mb-4">Game Stats</h2>
        <div className="arena-stats">
          <div className="stat-card">
            <IconSword className="w-6 h-6 mx-auto mb-2 text-primary-500" />
            <div className="stat-value">128</div>
            <div className="text-sm text-gray-500">Battles Won</div>
          </div>
          <div className="stat-card">
            <IconShield className="w-6 h-6 mx-auto mb-2 text-primary-500" />
            <div className="stat-value">95%</div>
            <div className="text-sm text-gray-500">Defense Rate</div>
          </div>
          <div className="stat-card">
            <IconBolt className="w-6 h-6 mx-auto mb-2 text-primary-500" />
            <div className="stat-value">742</div>
            <div className="text-sm text-gray-500">Power Level</div>
          </div>
          <div className="stat-card">
            <IconTrophy className="w-6 h-6 mx-auto mb-2 text-primary-500" />
            <div className="stat-value">12</div>
            <div className="text-sm text-gray-500">Achievements</div>
          </div>
        </div>
      </section>

      {/* Player Status Section */}
      <section>
        <h2 className="text-2xl font-bold text-blue-400 neon-text mb-4">Player Status</h2>
        <div className="player-status">
          <div className="player-avatar">
            <img
              src="https://api.dicebear.com/7.x/avatars/svg?seed=player"
              alt="Player Avatar"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="player-info">
            <div className="player-name">CyberWarrior</div>
            <div className="player-level">Level 42</div>
            <div className="health-bar mt-2">
              <div className="health-bar-fill" style={{ width: '75%' }} />
            </div>
          </div>
          <div className="flex gap-2">
            <span className="combat-badge">
              <IconSword className="w-4 h-4" />
              Elite
            </span>
            <span className="combat-badge">
              <IconTrophy className="w-4 h-4" />
              Top 100
            </span>
          </div>
        </div>
      </section>

      {/* Game Menu Section */}
      <section>
        <h2 className="text-2xl font-bold text-blue-400 neon-text mb-4">Game Menu</h2>
        <div className="game-menu">
          <button className="menu-item">
            <IconSword className="menu-item-icon" />
            <span>Battle Arena</span>
          </button>
          <button className="menu-item">
            <IconShield className="menu-item-icon" />
            <span>Training Ground</span>
          </button>
          <button className="menu-item">
            <IconTrophy className="menu-item-icon" />
            <span>Leaderboard</span>
          </button>
        </div>
      </section>

      {/* Cards Section */}
      <section>
        <h2 className="text-2xl font-bold text-blue-400 neon-text mb-4">Game Cards</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <motion.div
            whileHover={{ y: -4 }}
            className="card neon-border p-6"
          >
            <h3 className="text-xl font-semibold mb-2">Current Match</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Arena: Cyber Nexus
            </p>
            <div className="mt-4">
              <div className="combat-badge">Live Match</div>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -4 }}
            className="card game-card p-6"
          >
            <h3 className="text-xl font-semibold mb-2">Next Challenge</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Opponent: Shadow Master
            </p>
            <div className="mt-4">
              <div className="combat-badge">High Stakes</div>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -4 }}
            className="card neon-border p-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10"
          >
            <h3 className="text-xl font-semibold mb-2">Tournament</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Quarter Finals
            </p>
            <div className="mt-4">
              <div className="combat-badge">Elite Tier</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Current Theme Info */}
      <section className="mt-8 p-4 card neon-border">
        <h2 className="text-xl font-semibold mb-2">Current Theme: {uiStyle}</h2>
        <p className="text-gray-600 dark:text-gray-300">
          This preview shows how different game components look with the current theme settings.
          Try changing the theme style, colors, and neon intensity to see how it affects the game UI.
        </p>
      </section>
    </div>
  );
}; 