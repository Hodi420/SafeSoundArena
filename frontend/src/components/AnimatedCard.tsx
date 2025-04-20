import { motion } from 'framer-motion';
import React from 'react';

export const AnimatedCard: React.FC<{ delay?: number; children: React.ReactNode }> = ({ children, delay = 0 }) => {
  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{
        duration: 0.2,
        delay,
        type: 'spring',
        stiffness: 300
      }}
      className="card bg-lightbg-surface dark:bg-darkbg-surface dark:text-white rounded-lg shadow-lg p-6"
    >
      {children}
    </motion.div>
  );
};
