// 🛠️ Scoring and Progression Logic
// Core functions for XP, level, and reputation calculations.

import { XP_TABLE } from '../parameters/gameConfig';
import {
  awardCommunityPoints,
  awardScamDetectionPoints,
  LeaderboardType,
} from '../services/leaderboardService';

// Points configuration for different actions
export const POINTS = {
  // Scam Detection
  REPORT_SCAM: 50,
  CONFIRM_SCAM: 25,
  PREVENT_SCAM: 100,

  // Community Impact
  HELP_OTHER: 10,
  COMPLETE_TUTORIAL: 50,
  COMPLETE_DAILY_QUEST: 30,
  COMPLETE_WEEKLY_QUEST: 100,
  REFER_FRIEND: 75,

  // Moderation
  CONTENT_REVIEW: 20,
  CONTENT_FLAG_REVIEW: 15,

  // Engagement
  DAILY_LOGIN: 5,
  WEEKLY_STREAK: 25,
} as const;

type ActionType = keyof typeof POINTS;

// Map action types to leaderboard categories
const ACTION_TO_LEADERBOARD: Record<ActionType, LeaderboardType | 'all'> = {
  // Scam Detection
  REPORT_SCAM: 'scam_detection',
  CONFIRM_SCAM: 'scam_detection',
  PREVENT_SCAM: 'scam_detection',

  // Community Impact
  HELP_OTHER: 'community_impact',
  COMPLETE_TUTORIAL: 'community_impact',
  COMPLETE_DAILY_QUEST: 'community_impact',
  COMPLETE_WEEKLY_QUEST: 'community_impact',
  REFER_FRIEND: 'community_impact',

  // Moderation
  CONTENT_REVIEW: 'community_impact',
  CONTENT_FLAG_REVIEW: 'community_impact',

  // Engagement
  DAILY_LOGIN: 'all',
  WEEKLY_STREAK: 'all',
} as const;

export function getLevelFromXP(xp: number): number {
  for (let i = XP_TABLE.length - 1; i >= 0; i--) {
    if (xp >= XP_TABLE[i]) return i;
  }
  return 0;
}

export function getXPForNextLevel(level: number): number {
  return XP_TABLE[level + 1] ?? XP_TABLE[XP_TABLE.length - 1];
}

/**
 * Awards points to a user based on their action
 * @param userId The ID of the user
 * @param action The action performed
 * @param multiplier Optional multiplier for the points
 * @returns Promise that resolves when points are awarded
 */
export async function awardPoints(
  userId: string,
  action: ActionType,
  multiplier: number = 1,
): Promise<{ success: boolean }> {
  const points = Math.floor(POINTS[action] * multiplier);
  const leaderboardType = ACTION_TO_LEADERBOARD[action];

  try {
    // Update the specific leaderboard
    const leaderboardResponse = await fetch('/api/leaderboard/update-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        type: leaderboardType,
        score: points,
        action: 'increment',
      }),
    });

    if (!leaderboardResponse.ok) {
      throw new Error('Failed to update leaderboard');
    }

    // If the action contributes to overall score (all), no need to update again
    if (leaderboardType === 'all') {
      return { success: true };
    }

    // Also update the overall leaderboard
    const overallResponse = await fetch('/api/leaderboard/update-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        type: 'overall',
        score: points,
        action: 'increment',
      }),
    });

    if (!overallResponse.ok) {
      throw new Error('Failed to update overall leaderboard');
    }

    return { success: true };
  } catch (error) {
    console.error('Error awarding points:', error);
    return { success: false };
  }
}

/**
 * Calculates the user's rank based on their score
 * @param score The user's score
 * @param leaderboardType The type of leaderboard
 * @returns The user's rank (1st, 2nd, 3rd, etc.)
 */
export function calculateRank(score: number, leaderboardType: LeaderboardType = 'overall'): string {
  // This is a simplified version - in a real app, you'd fetch the actual rank from the server
  if (score <= 0) return 'Unranked';

  // These thresholds would typically come from the server
  const thresholds: Record<LeaderboardType, number[]> = {
    overall: [10000, 5000, 1000, 500, 100],
    scam_detection: [5000, 2500, 1000, 500, 100],
    community_impact: [5000, 2500, 1000, 500, 100],
  };

  const rankNames = ['Elite', 'Expert', 'Veteran', 'Member', 'Newcomer'];
  const scoreThresholds = thresholds[leaderboardType] || thresholds.overall;

  for (let i = 0; i < scoreThresholds.length; i++) {
    if (score >= scoreThresholds[i]) {
      return rankNames[i];
    }
  }

  return 'Newcomer';
}

/**
 * Calculates the progress to the next rank
 * @param score Current score
 * @param leaderboardType Type of leaderboard
 * @returns Object with current rank, next rank, and progress percentage
 */
export function getRankProgress(
  score: number,
  leaderboardType: LeaderboardType = 'overall',
): { currentRank: string; nextRank: string; progress: number } {
  const thresholds: Record<LeaderboardType, number[]> = {
    overall: [10000, 5000, 1000, 500, 100],
    scam_detection: [5000, 2500, 1000, 500, 100],
    community_impact: [5000, 2500, 1000, 500, 100],
  };

  const rankNames = ['Elite', 'Expert', 'Veteran', 'Member', 'Newcomer'];
  const scoreThresholds = thresholds[leaderboardType] || thresholds.overall;

  for (let i = 0; i < scoreThresholds.length; i++) {
    if (score >= scoreThresholds[i]) {
      return {
        currentRank: rankNames[i],
        nextRank: i > 0 ? rankNames[i - 1] : '',
        progress:
          i === 0
            ? 100
            : 100 -
              ((score - scoreThresholds[i]) / (scoreThresholds[i - 1] - scoreThresholds[i])) * 100,
      };
    }
  }

  return {
    currentRank: 'Newcomer',
    nextRank: 'Member',
    progress: (score / 100) * 100, // Assuming 100 is the first threshold
  };
}
