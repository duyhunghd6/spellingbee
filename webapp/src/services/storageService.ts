import type { PlayerSession, GameResult } from '../types';
import { STORAGE_KEYS } from '../types';

// Generate unique ID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Format date to GMT+7
function formatDateGMT7(date: Date): string {
  const offset = 7 * 60; // GMT+7 in minutes
  const localDate = new Date(date.getTime() + offset * 60 * 1000);
  return localDate.toISOString().replace('Z', '+07:00');
}

// Player session management
export function getPlayerSession(): PlayerSession | null {
  const stored = localStorage.getItem(STORAGE_KEYS.PLAYER_SESSION);
  return stored ? JSON.parse(stored) : null;
}

export function createPlayerSession(name: string): PlayerSession {
  const session: PlayerSession = {
    id: generateId(),
    name,
    createdAt: formatDateGMT7(new Date()),
  };
  localStorage.setItem(STORAGE_KEYS.PLAYER_SESSION, JSON.stringify(session));
  return session;
}

export function updatePlayerName(name: string): PlayerSession {
  let session = getPlayerSession();
  if (!session) {
    return createPlayerSession(name);
  }
  session.name = name;
  localStorage.setItem(STORAGE_KEYS.PLAYER_SESSION, JSON.stringify(session));
  return session;
}

// Rankings management
export function getRankings(): GameResult[] {
  const stored = localStorage.getItem(STORAGE_KEYS.RANKINGS);
  return stored ? JSON.parse(stored) : [];
}

export function saveGameResult(
  playerName: string,
  difficulty: string,
  score: number,
  totalQuestions: number,
  totalTimeSeconds: number
): GameResult {
  const session = getPlayerSession() || createPlayerSession(playerName);
  
  const result: GameResult = {
    id: generateId(),
    playerId: session.id,
    playerName: playerName || session.name,
    difficulty: difficulty as GameResult['difficulty'],
    score,
    totalQuestions,
    totalTimeSeconds,
    completedAt: formatDateGMT7(new Date()),
  };
  
  const rankings = getRankings();
  rankings.push(result);
  
  // Sort by score DESC, then time ASC
  rankings.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.totalTimeSeconds - b.totalTimeSeconds;
  });
  
  // Keep top 100
  const trimmed = rankings.slice(0, 100);
  localStorage.setItem(STORAGE_KEYS.RANKINGS, JSON.stringify(trimmed));
  
  return result;
}

// Get top rankings for a difficulty
export function getTopRankings(difficulty?: string, limit: number = 10): GameResult[] {
  const rankings = getRankings();
  const filtered = difficulty 
    ? rankings.filter(r => r.difficulty === difficulty)
    : rankings;
  return filtered.slice(0, limit);
}
