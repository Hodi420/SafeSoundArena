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
    <div className={styles.container}>
      <div className="font-bold mb-2">{EMOJIS.UI.LINK} Guilds</div>
      <div className={styles.guildList}>
        {guilds.map(guild => (
          <div key={guild.id} className={styles.guildItem}>
            <span className="text-2xl" aria-label="Guild emoji">{guild.emoji}</span>
            <div className={styles.guildInfo}>
              <div className="font-bold">{guild.name}</div>
              <div className="text-xs text-gray-400">Leader: {guild.leader}</div>
              <div className="text-blue-400">{guild.members} members</div>
            </div>
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
          </div>
        ))}
      </div>
    </div>
  );
}
