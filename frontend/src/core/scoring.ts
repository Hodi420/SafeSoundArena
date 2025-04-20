// 🛠️ Scoring and Progression Logic
// Core functions for XP, level, and reputation calculations.

import { XP_TABLE } from '../parameters/gameConfig';

export function getLevelFromXP(xp: number): number {
  for (let i = XP_TABLE.length - 1; i >= 0; i--) {
    if (xp >= XP_TABLE[i]) return i;
  }
  return 0;
}

export function getXPForNextLevel(level: number): number {
  return XP_TABLE[level + 1] ?? XP_TABLE[XP_TABLE.length - 1];
}
