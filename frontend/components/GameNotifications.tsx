import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconSword, IconTrophy, IconAlertTriangle, IconInfoCircle } from '@tabler/icons-react';

type NotificationType = 'combat' | 'achievement' | 'warning' | 'info';

interface GameNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
}

interface GameNotificationsProps {
  notifications: GameNotification[];
  onDismiss: (id: string) => void;
}

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'combat':
      return <IconSword className="w-5 h-5" />;
    case 'achievement':
      return <IconTrophy className="w-5 h-5" />;
    case 'warning':
      return <IconAlertTriangle className="w-5 h-5" />;
    case 'info':
      return <IconInfoCircle className="w-5 h-5" />;
  }
};

const getNotificationStyles = (type: NotificationType) => {
  switch (type) {
    case 'combat':
      return 'bg-red-500/10 border-red-500 text-red-500';
    case 'achievement':
      return 'bg-yellow-500/10 border-yellow-500 text-yellow-500';
    case 'warning':
      return 'bg-orange-500/10 border-orange-500 text-orange-500';
    case 'info':
      return 'bg-blue-500/10 border-blue-500 text-blue-500';
  }
};

export const GameNotifications: React.FC<GameNotificationsProps> = ({
  notifications,
  onDismiss,
}) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            className={`
              card neon-border p-4 cursor-pointer
              border-l-4 ${getNotificationStyles(notification.type)}
            `}
            onClick={() => onDismiss(notification.id)}
          >
            <div className="flex items-start gap-3">
              <div className={`mt-1 ${getNotificationStyles(notification.type)}`}>
                {getNotificationIcon(notification.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {notification.title}
                </p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {notification.message}
                </p>
              </div>
              <div className="ml-4 flex-shrink-0">
                <span className="text-xs text-gray-400">
                  {new Date(notification.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}; 