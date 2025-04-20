// In-memory store for user AI profiles (replace with DB in production)
export interface AIProfile {
  pi_uid: string;
  username: string;
  avatarUrl?: string;
  preferences?: Record<string, any>;
  trainingData: string[];
  history: { timestamp: number; input: string; output: string }[];
}

const profiles: Record<string, AIProfile> = {};

export function getProfile(pi_uid: string): AIProfile {
  if (!profiles[pi_uid]) {
    profiles[pi_uid] = {
      pi_uid,
      username: '',
      avatarUrl: '',
      preferences: {},
      trainingData: [],
      history: [],
    };
  }
  return profiles[pi_uid];
}

export function updateProfile(pi_uid: string, updates: Partial<AIProfile>) {
  const profile = getProfile(pi_uid);
  Object.assign(profile, updates);
}

export function addTrainingData(pi_uid: string, data: string) {
  const profile = getProfile(pi_uid);
  profile.trainingData.push(data);
}

export function addHistory(pi_uid: string, input: string, output: string) {
  const profile = getProfile(pi_uid);
  profile.history.push({ timestamp: Date.now(), input, output });
}

export function getHistory(pi_uid: string) {
  return getProfile(pi_uid).history;
}
