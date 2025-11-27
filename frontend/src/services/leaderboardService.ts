import axios from 'axios';

type AxiosResponse<T = any> = {
  data: T;
  status: number;
  statusText: string;
  headers: any;
  config: any;
  request?: any;
};

export type LeaderboardType = 'overall' | 'scam_detection' | 'community_impact';

export interface LeaderboardUser {
  rank: number;
  username: string;
  avatar: string;
  score: number;
}

interface UpdateScoreResponse {
  success: boolean;
  result?: any;
  error?: string;
}

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getLeaderboard = async (
  type: LeaderboardType = 'overall',
): Promise<LeaderboardUser[]> => {
  try {
    const response: AxiosResponse<LeaderboardUser[]> = await api.get(`/leaderboard/${type}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    throw error;
  }
};

interface UpdateScoreParams {
  userId: string;
  type: LeaderboardType | 'all';
  score?: number;
  action?: 'increment';
}

export const updateScore = async ({
  userId,
  type,
  score,
  action,
}: UpdateScoreParams): Promise<UpdateScoreResponse> => {
  try {
    const response: AxiosResponse<UpdateScoreResponse> = await api.post(
      '/leaderboard/update-score',
      {
        userId,
        type,
        score,
        action,
      },
    );
    return response.data;
  } catch (error) {
    console.error('Error updating score:', error);
    throw error;
  }
};

// Helper function to award points for community impact actions
export const awardCommunityPoints = async (userId: string, points: number) => {
  return updateScore({
    userId,
    type: 'community_impact',
    score: points,
    action: 'increment',
  });
};

// Helper function to award points for scam detection
export const awardScamDetectionPoints = async (userId: string, points: number) => {
  return updateScore({
    userId,
    type: 'scam_detection',
    score: points,
    action: 'increment',
  });
};

// Helper to get user's position in a specific leaderboard
export const getUserRank = async (
  userId: string,
  type: LeaderboardType = 'overall',
): Promise<number> => {
  try {
    const leaderboard = await getLeaderboard(type);
    const user = leaderboard.find((u) => u.username === userId);
    return user ? user.rank : -1;
  } catch (error) {
    console.error('Error getting user rank:', error);
    return -1;
  }
};

// Helper to get user's score in a specific leaderboard
export const getUserScore = async (
  userId: string,
  type: LeaderboardType = 'overall',
): Promise<number> => {
  try {
    const leaderboard = await getLeaderboard(type);
    const user = leaderboard.find((u) => u.username === userId);
    return user ? user.score : 0;
  } catch (error) {
    console.error('Error getting user score:', error);
    return 0;
  }
};
