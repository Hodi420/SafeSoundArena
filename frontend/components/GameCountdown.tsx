import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface GameCountdownProps {
  endTime: Date;
  onComplete?: () => void;
  showHours?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'urgent' | 'casual';
}

export const GameCountdown: React.FC<GameCountdownProps> = ({
  endTime,
  onComplete,
  showHours = true,
  size = 'md',
  variant = 'default',
}) => {
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
  }>({ hours: 0, minutes: 0, seconds: 0 });

  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = endTime.getTime() - new Date().getTime();
      
      if (difference <= 0) {
        onComplete?.();
        return { hours: 0, minutes: 0, seconds: 0 };
      }

      return {
        hours: Math.floor(difference / (1000 * 60 * 60)),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    };

    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);
      
      // Set urgent state when less than 1 minute remains
      setIsUrgent(
        variant === 'default' && 
        newTimeLeft.hours === 0 && 
        newTimeLeft.minutes === 0
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime, onComplete, variant]);

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-lg space-x-2';
      case 'md':
        return 'text-2xl space-x-3';
      case 'lg':
        return 'text-4xl space-x-4';
    }
  };

  const getVariantClasses = () => {
    if (isUrgent) return 'text-red-500 neon-text';
    switch (variant) {
      case 'urgent':
        return 'text-red-500 neon-text';
      case 'casual':
        return 'text-blue-400';
      default:
        return 'text-gray-900 dark:text-gray-100';
    }
  };

  const TimeUnit: React.FC<{ value: number; label: string }> = ({ value, label }) => (
    <div className="flex flex-col items-center">
      <motion.div
        key={value}
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        className={`font-mono font-bold ${getVariantClasses()}`}
      >
        {value.toString().padStart(2, '0')}
      </motion.div>
      <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {label}
      </span>
    </div>
  );

  return (
    <div className={`flex items-center ${getSizeClasses()}`}>
      <AnimatePresence mode="popLayout">
        {showHours && (
          <>
            <TimeUnit value={timeLeft.hours} label="HRS" />
            <span className={`font-mono ${getVariantClasses()}`}>:</span>
          </>
        )}
        <TimeUnit value={timeLeft.minutes} label="MIN" />
        <span className={`font-mono ${getVariantClasses()}`}>:</span>
        <TimeUnit value={timeLeft.seconds} label="SEC" />
      </AnimatePresence>
    </div>
  );
}; 