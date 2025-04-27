import { useGuilds, useJoinGuild, useLeaveGuild } from '../hooks/useGuilds';
import { EMOJIS } from '../parameters/emojis';

export default function GuildPanel() {
  const { data: guilds, isLoading, error } = useGuilds();
  const joinGuild = useJoinGuild();
  const leaveGuild = useLeaveGuild();

  if (isLoading) return (
    <div className="bg-gray-900 rounded-lg p-4 border border-green-500 animate-pulse">
      <div className="h-6 bg-gray-700 rounded w-40 mb-4"></div>
      <div className="flex gap-4">
        <div className="h-10 w-32 bg-gray-700 rounded"></div>
        <div className="h-10 w-32 bg-gray-700 rounded"></div>
      </div>
    </div>
  );

  if (error) {
    return (
      <div className="bg-gray-900 rounded-lg p-4 border border-red-500 text-red-200 max-w-md mx-auto">
        <div className="font-bold mb-2">Error loading guilds</div>
        <div>{error.message || 'Something went wrong. Please try again later.'}</div>
      </div>
    );
  }

  if (!guilds || guilds.length === 0) {
    return (
      <div className="bg-gray-900 rounded-lg p-4 border border-green-500 text-green-200 max-w-md mx-auto">
        <div className="font-bold mb-2">No guilds available</div>
        <div>There are currently no guilds. Create or join a guild to get started!</div>
      </div>
    );
  }

  return (
<<<<<<< HEAD
    <div className="bg-gray-900 rounded-lg p-4 border border-green-500">
      <div className="font-bold mb-2">🔗 Guilds</div>
      <div className="flex flex-col gap-4 mt-4">
        {guilds.map(guild => (
          <div key={guild.id} className="flex items-center justify-between bg-gray-800 rounded-md p-3 border border-green-700 mb-2">
            <span className="text-2xl" aria-label="Guild emoji">{guild.emoji}</span>
            <div className="flex-1 ml-3 overflow-hidden">
=======
    <div className={styles.container}>
      <div className="font-bold mb-2">{EMOJIS.UI.LINK} Guilds</div>
      <div className={styles.guildList}>
        {guilds.map(guild => (
          <div key={guild.id} className={styles.guildItem}>
            <span className="text-2xl" aria-label="Guild emoji">{guild.emoji}</span>
            <div className={styles.guildInfo}>
>>>>>>> 9841034 (Initial full project commit: user/admin dashboards, tasks, notifications, MongoDB, and statistics features)
              <div className="font-bold">{guild.name}</div>
              <div className="text-xs text-gray-400">Leader: {guild.leader}</div>
              <div className="text-blue-400">{guild.members} members</div>
            </div>
<<<<<<< HEAD
            <button
              className="btn btn-sm bg-green-600 text-white rounded px-3 py-1 transition hover:bg-green-700 disabled:opacity-50 ml-2"
              aria-label={`Join guild: ${guild.name}`}
              title={`Join guild: ${guild.name}`}
              onClick={() => joinGuild.mutate(guild.id)}
              disabled={joinGuild.isPending}
            >
              {joinGuild.isPending ? (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <circle cx="10" cy="10" r="8.5" stroke="#1976d2" strokeWidth="1.5"/>
                  <path d="M10 6v8M6 10h8" stroke="#1976d2" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <circle cx="10" cy="10" r="8.5" stroke="#1976d2" strokeWidth="1.5"/>
                  <path d="M10 6v8M6 10h8" stroke="#1976d2" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              )}
            </button>
            <button
              className="btn btn-sm bg-red-600 text-white rounded px-3 py-1 transition hover:bg-red-700 disabled:opacity-50 ml-2"
              aria-label={`Leave guild: ${guild.name}`}
              title={`Leave guild: ${guild.name}`}
              onClick={() => leaveGuild.mutate(guild.id)}
              disabled={leaveGuild.isPending}
            >
              {leaveGuild.isPending ? (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <circle cx="10" cy="10" r="8.5" stroke="#a00" strokeWidth="1.5"/>
                  <path d="M6 10h8" stroke="#a00" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <circle cx="10" cy="10" r="8.5" stroke="#a00" strokeWidth="1.5"/>
                  <path d="M6 10h8" stroke="#a00" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              )}
            </button>
=======
            <IconButton
              ariaLabel={`Join guild: ${guild.name}`}
              title={`Join guild: ${guild.name}`}
              primary={!joinGuild.isPending}
              active={joinGuild.isPending}
              disabled={joinGuild.isPending}
              onClick={() => joinGuild.mutate(guild.id)}
            >
              {joinGuild.isPending ? (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" style={{animation: 'spin 1s linear infinite'}}><circle cx="10" cy="10" r="8" stroke="#1b7c1b" strokeWidth="3" opacity="0.2"/><path d="M10 2a8 8 0 0 1 8 8" stroke="#1b7c1b" strokeWidth="3" strokeLinecap="round"/><style>{'@keyframes spin{100%{transform:rotate(360deg);}}'}</style></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="8.5" stroke="#1b7c1b" strokeWidth="1.5"/><path d="M10 6v8M6 10h8" stroke="#1b7c1b" strokeWidth="1.8" strokeLinecap="round"/></svg>
              )}
            </IconButton>
            <IconButton
              ariaLabel={`Leave guild: ${guild.name}`}
              title={`Leave guild: ${guild.name}`}
              disabled={leaveGuild.isPending}
              style={{ color: '#a00', border: '2px solid #a00', background: '#ffeaea', marginLeft: 6 }}
              onClick={() => leaveGuild.mutate(guild.id)}
            >
              {leaveGuild.isPending ? (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" style={{animation: 'spin 1s linear infinite'}}><circle cx="10" cy="10" r="8" stroke="#a00" strokeWidth="3" opacity="0.2"/><path d="M10 2a8 8 0 0 1 8 8" stroke="#a00" strokeWidth="3" strokeLinecap="round"/><style>{'@keyframes spin{100%{transform:rotate(360deg);}}'}</style></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="8.5" stroke="#a00" strokeWidth="1.5"/><path d="M6 10h8" stroke="#a00" strokeWidth="1.8" strokeLinecap="round"/></svg>
              )}
            </IconButton>
>>>>>>> 9841034 (Initial full project commit: user/admin dashboards, tasks, notifications, MongoDB, and statistics features)
          </div>
        ))}
      </div>
    </div>
  );
}
