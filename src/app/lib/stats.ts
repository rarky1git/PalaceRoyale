import type { PlayerStats } from '../game-engine';

export const STATS_KEY = 'palace-stats';

export function encodeStats(stats: PlayerStats): string {
  try {
    return btoa(JSON.stringify(stats));
  } catch {
    return '';
  }
}

export function decodeStats(input: string): PlayerStats | null {
  try {
    const parsed = JSON.parse(atob(input.trim())) as Record<string, unknown>;
    const { gold, silver, bronze, losses, gamesPlayed } = parsed;
    if (
      typeof gold === 'number' && gold >= 0 &&
      typeof silver === 'number' && silver >= 0 &&
      typeof bronze === 'number' && bronze >= 0 &&
      typeof losses === 'number' && losses >= 0 &&
      typeof gamesPlayed === 'number' && gamesPlayed >= 0
    ) {
      return { gold, silver, bronze, losses, gamesPlayed };
    }
    return null;
  } catch {
    return null;
  }
}

export function loadLocalStats(): PlayerStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) return JSON.parse(raw) as PlayerStats;
  } catch { /* ignore */ }
  return { gold: 0, silver: 0, bronze: 0, losses: 0, gamesPlayed: 0 };
}
