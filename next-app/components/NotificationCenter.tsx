import { useNotifications, useReadNotification, useReadAllNotifications } from '../hooks/useNotifications';
import { EMOJIS } from '../constants/emojis';

export default function NotificationCenter() {
  const { data: notifications, isLoading, error } = useNotifications();
  const readNotification = useReadNotification();
  const readAll = useReadAllNotifications();

  if (isLoading) return (
    <div className="bg-gray-900 rounded-lg p-4 border border-purple-500 animate-pulse max-w-md mx-auto">
      <div className="h-6 bg-gray-700 rounded w-32 mb-4"></div>
      <div className="flex flex-col gap-2">
        <div className="h-8 bg-gray-700 rounded"></div>
        <div className="h-8 bg-gray-700 rounded"></div>
        <div className="h-8 bg-gray-700 rounded"></div>
      </div>
    </div>
  );

  if (error) {
    return (
      <div className="bg-gray-900 rounded-lg p-4 border border-red-500 text-red-200 max-w-md mx-auto">
        <div className="font-bold mb-2">Error loading notifications</div>
        <div>{error.message || 'Something went wrong. Please try again later.'}</div>
      </div>
    );
  }

  if (!notifications || notifications.length === 0) {
    return (
      <div className="bg-gray-900 rounded-lg p-4 border border-purple-500 text-purple-200 max-w-md mx-auto">
        <div className="font-bold mb-2">No notifications</div>
        <div>You're all caught up! No new notifications.</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-purple-500 max-w-md mx-auto">
      <div className="font-bold mb-2">{EMOJIS.UI.INFO} Notifications</div>
      <button
        className="mb-3 btn-secondary"
        aria-label="Mark all notifications as read"
        onClick={() => readAll.mutate()}
        disabled={readAll.isPending}
      >
        {EMOJIS.UI.REFRESH} Mark All as Read
      </button>
      <ul className="space-y-2">
        {notifications.map(n => (
          <li key={n.id} className={`flex items-center p-2 rounded-lg ${n.read ? 'bg-gray-800' : 'bg-blue-900 border-l-4 border-blue-400'}`}>
            <span className="text-2xl mr-2" aria-label="Notification emoji">{n.emoji}</span>
            <span className="flex-1">{n.content}</span>
            {!n.read && (
              <button
                className="btn-primary ml-2"
                aria-label={`Mark notification as read: ${n.content}`}
                onClick={() => readNotification.mutate(n.id)}
                disabled={readNotification.isPending}
              >{EMOJIS.UI.SUCCESS} Read</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
