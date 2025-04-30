import React, { useState } from 'react';
import ThemeCustomizer from '../components/ThemeCustomizer';
import { ThemePreview } from '../components/ThemePreview';
import { motion } from 'framer-motion';

const ThemeShowcase: React.FC = () => {
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="py-8 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold text-blue-400 neon-text mb-4"
          >
            Theme Showcase
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-600 dark:text-gray-300 mb-8"
          >
            Explore and customize the UI theme system
          </motion.p>
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsCustomizerOpen(true)}
            className="btn btn-primary neon-text px-8 py-3 text-lg"
          >
            Open Theme Customizer
          </motion.button>
        </div>
      </header>

      {/* Theme Preview */}
      <main className="max-w-7xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <ThemePreview />
        </motion.div>
      </main>

      {/* Theme Customizer Dialog */}
      <ThemeCustomizer
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
      />
    </div>
  );
};

export default ThemeShowcase; 