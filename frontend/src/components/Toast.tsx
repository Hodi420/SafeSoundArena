import { useEffect } from 'react';

interface ToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, onClose, duration = 2500 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-blue-700 text-white px-6 py-3 rounded-full shadow-lg text-base font-semibold flex items-center gap-2 animate-fade-in"
      role="status"
      aria-live="polite"
    >
      <span>🔔</span>
      <span>{message}</span>
    </div>
  );
}
