import { AIProfile } from '../utils/aiProfileStore';
import { getProfile, updateProfile, addTrainingData, addHistory, getHistory } from '../utils/aiProfileStore';

export function fetchProfile(pi_uid: string): AIProfile {
  return getProfile(pi_uid);
}

export function saveProfile(pi_uid: string, updates: Partial<AIProfile>) {
  updateProfile(pi_uid, updates);
}

export function uploadTrainingData(pi_uid: string, data: string) {
  addTrainingData(pi_uid, data);
}

export function logHistory(pi_uid: string, input: string, output: string) {
  addHistory(pi_uid, input, output);
}

export function fetchHistory(pi_uid: string) {
  return getHistory(pi_uid);
}

// Dummy AI function (replace with your real AI logic)
export async function callPersonalAI(profile: AIProfile, input: string) {
  return `AI (${profile.username}): You said "${input}". Training data items: ${profile.trainingData.length}`;
}
