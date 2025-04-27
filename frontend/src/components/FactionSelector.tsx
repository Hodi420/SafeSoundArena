import { useState } from 'react';
import { useFactions } from '../services/api/hooks/useReputation';
import { EMOJIS } from '../parameters/emojis';
import { SkeletonCard } from './SkeletonCard';
import { useToast } from './ToastContext';
import { useAuth } from '../hooks/useAuth';

// Analytics event logger (replace with real analytics)
function logAnalytics(event: string, data: any) {
  // eslint-disable-next-line no-console
  console.log(`[Analytics] ${event}`, data);
}

export default function FactionSelector() {
  const { factions, goToFactionPage, factionsReputation } = useFactions();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const { user, loading: userLoading } = useAuth();

  const handleSelect = (id: string, name: string) => {
    setError(null);
    if (!user?.isAuthenticated) {
      setError('You must be logged in to select a faction.');
      toast.showToast('Login required to select a faction.', 'error');
      return;
    }
    setLoading(id);
    const isAdmin = user.role === 'admin';
    logAnalytics('faction_select', { id, name, role: user.role });
    goToFactionPage(id, {
      query: { from: 'selector', name, role: user.role },
      onComplete: () => setLoading(null),
      ...(isAdmin && { admin: true }),
    });
  };

  // Wait for user loading
  if (userLoading || !factions || factionsReputation.isLoading) {
    return (
      <div className="max-w-sm mx-auto">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  // Handle error state for faction reputation data
  if (factionsReputation.isError) {
    setError('Failed to load faction reputation data.');
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded p-2 mb-2 flex items-center justify-between">
          <span>{error}</span>
          <button
            aria-label="Dismiss error"
            className="ml-2 px-2 py-1 rounded bg-red-300 dark:bg-red-700 text-xs text-white hover:bg-red-400 dark:hover:bg-red-600 transition-colors"
            onClick={() => setError(null)}
          >✕</button>
        </div>
      )}
      {factions.map((faction) => {
        // Find reputation data for this faction
        const factionRep = factionsReputation.data?.find(rep => rep.id === faction.id);
        const reputationText = factionRep ? `Reputation: ${factionRep.reputation}` : 'Reputation: N/A';
        return (
          <button
            key={faction.id}
            className={`w-full p-4 rounded-lg bg-gray-100 hover:bg-blue-100 dark:bg-darkbg-surface dark:hover:bg-darkbg-accent transition-colors flex flex-col items-start ${loading === faction.id ? 'opacity-50 pointer-events-none' : ''}`}
            onClick={() => handleSelect(faction.id, faction.name)}
            disabled={loading === faction.id}
          >
            <div className="flex items-center w-full">
<<<<<<< HEAD
              {/* @ts-ignore */}
<span className="text-lg font-semibold">{EMOJIS.FACTIONS && EMOJIS.FACTIONS[String(faction.id)] ? EMOJIS.FACTIONS[String(faction.id)] + ' ' : ''}{faction.name}</span>
=======
              <span className="text-lg font-semibold">{EMOJIS[faction.id]} {faction.name}</span>
>>>>>>> 9841034 (Initial full project commit: user/admin dashboards, tasks, notifications, MongoDB, and statistics features)
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">{reputationText}</div>
            {loading === faction.id && (
              <span className="ml-2 flex items-center gap-1">
                <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
                Loading...
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
