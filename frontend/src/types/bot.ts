export interface BotProfile {
  username: string;
  profession: string;
  knowledge: string[];
  hobbies: string[];
  stats: {
    xp: number;
    level: number;
  };
  activity: string[];
  face: string;
  history: Record<string, unknown>[];
}
