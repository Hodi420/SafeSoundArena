import React from 'react';
import { motion } from 'framer-motion';

interface GameProgressBarProps {
  value: number;
  maxValue: number;
  type?: 'health' | 'mana' | 'experience' | 'shield';
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

export const GameProgressBar: React.FC<GameProgressBarProps> = ({
  value,
  maxValue,
  type = 'health',
  showText = true,
  size = 'md',
  animated = true,
}) => {
  const percentage = Math.min(100, Math.max(0, (value / maxValue) * 100));

  const getBarColors = () => {
    switch (type) {
      case 'health':
        return {
          bg: 'from-red-500 to-red-600',
          glow: 'rgba(239, 68, 68, 0.5)', // red-500
        };
      case 'mana':
        return {
          bg: 'from-blue-500 to-blue-600',
          glow: 'rgba(59, 130, 246, 0.5)', // blue-500
        };
      case 'experience':
        return {
          bg: 'from-yellow-500 to-yellow-600',
          glow: 'rgba(234, 179, 8, 0.5)', // yellow-500
        };
      case 'shield':
        return {
          bg: 'from-purple-500 to-purple-600',
          glow: 'rgba(168, 85, 247, 0.5)', // purple-500
        };
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-2';
      case 'md':
        return 'h-4';
      case 'lg':
        return 'h-6';
    }
  };

  const colors = getBarColors();
  const sizeClass = getSizeClasses();

  return (
    <div className="relative">
      <div
        className={`
          w-full ${sizeClass} bg-gray-200 dark:bg-gray-700 
          rounded-full overflow-hidden
        `}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{
            duration: animated ? 0.5 : 0,
            ease: 'easeOut',
          }}
          className={`
            h-full rounded-full bg-gradient-to-r ${colors.bg}
            relative
          `}
          style={{
            boxShadow: `0 0 10px ${colors.glow}`,
          }}
        >
          {animated && percentage > 30 && (
            <motion.div
              className="absolute inset-0 bg-white"
              animate={{
                opacity: [0, 0.1, 0],
                x: ['0%', '100%'],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
          )}
        </motion.div>
      </div>

      {showText && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`
            font-medium
            ${size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'}
            ${percentage > 50 ? 'text-white' : 'text-gray-700 dark:text-gray-300'}
          `}>
            {value}/{maxValue}
          </span>
        </div>
      )}
    </div>
  );
}; 