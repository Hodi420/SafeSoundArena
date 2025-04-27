import { useEffect } from 'react';

interface ToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
<<<<<<< HEAD
  color?: 'blue' | 'red' | 'green';
}

export default function Toast({ message, onClose, duration = 2500, color = 'blue' }: ToastProps) {
=======
}

export default function Toast({ message, onClose, duration = 2500 }: ToastProps) {
>>>>>>> 9841034 (Initial full project commit: user/admin dashboards, tasks, notifications, MongoDB, and statistics features)
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

<<<<<<< HEAD
  const bgColor = color === 'red' ? 'bg-red-600' : color === 'green' ? 'bg-green-600' : 'bg-blue-700';
  const icon = color === 'red' ? '❌' : color === 'green' ? '✅' : '🔔';

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 ${bgColor} text-white px-6 py-3 rounded-full shadow-lg text-base font-semibold flex items-center gap-2 animate-fade-in`}
      role="status"
      aria-live="polite"
    >
      <span>{icon}</span>
=======
  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-blue-700 text-white px-6 py-3 rounded-full shadow-lg text-base font-semibold flex items-center gap-2 animate-fade-in"
      role="status"
      aria-live="polite"
    >
      <span>🔔</span>
>>>>>>> 9841034 (Initial full project commit: user/admin dashboards, tasks, notifications, MongoDB, and statistics features)
      <span>{message}</span>
    </div>
  );
}
