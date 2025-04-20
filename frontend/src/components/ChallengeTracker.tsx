import { useDailyChallenges, useWeeklyChallenges, useClaimChallenge } from '../hooks/useChallenges';
import React, { useState } from 'react';
import Toast from './Toast';
import { EMOJIS } from '../parameters/emojis';

export default function ChallengeTracker() {
  const { data: daily, isLoading: loadingDaily } = useDailyChallenges();
  const { data: weekly, isLoading: loadingWeekly } = useWeeklyChallenges();
  const claim = useClaimChallenge();
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  function handleClaim(challengeId: string) {
    claim.mutate(
      challengeId,
      {
        onSuccess: () => {
          setToastMsg('Reward claimed!');
          setShowToast(true);
        }
      }
    );
  }

  if (loadingDaily || loadingWeekly) return (
    <div className="bg-gray-900 rounded-lg p-4 border border-orange-500 animate-pulse max-w-lg mx-auto">
      <div className="h-6 bg-gray-700 rounded w-40 mb-4"></div>
      <div className="flex flex-col gap-2">
        <div className="h-8 bg-gray-700 rounded"></div>
        <div className="h-8 bg-gray-700 rounded"></div>
        <div className="h-8 bg-gray-700 rounded"></div>
      </div>
    </div>
  );

  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-orange-500 max-w-lg mx-auto">
      <div className="font-bold mb-2">{EMOJIS.UI.TIME} Challenges</div>
      <div>
        <div className="font-bold text-blue-300">Daily</div>
        {((daily ?? []) as any[]).map((ch: any) => (
          <div key={ch.id} className="flex items-center space-x-2 mb-2">
            <span className="text-2xl">{ch.emoji}</span>
            <span>{ch.title}</span>
            <span className="text-yellow-400">{ch.progress}/{ch.goal}</span>
            <button
              className="btn-primary ml-auto transition hover:scale-105 focus:ring-2 focus:ring-yellow-400"
              onClick={() => handleClaim(ch.id)}
              disabled={claim.isPending || ch.claimed || ch.progress < ch.goal}
              aria-label={`Claim reward for ${ch.title}`}
              title={`Claim reward for ${ch.title}`}
            >
              🏆 Claim Reward
            </button>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <div className="font-bold text-purple-300">Weekly</div>
        {((weekly ?? []) as any[]).map((ch: any) => (
          <div key={ch.id} className="flex items-center space-x-2 mb-2">
            <span className="text-2xl">{ch.emoji}</span>
            <span>{ch.title}</span>
            <span className="text-yellow-400">{ch.progress}/{ch.goal}</span>
            <button
              className="btn-primary ml-auto transition hover:scale-105 focus:ring-2 focus:ring-yellow-400"
              onClick={() => claim.mutate(ch.id)}
              disabled={claim.isPending || ch.claimed || ch.progress < ch.goal}
              aria-label={`Claim reward for ${ch.title}`}
              title={`Claim reward for ${ch.title}`}
            >
              🏆 Claim Reward
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
