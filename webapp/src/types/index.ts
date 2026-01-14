// Word entry from CSV
export interface Word {
  no: number;
  word: string;
  ipa: string;
  meaning: string;
  unit: number;
  definition: string;
}

// Difficulty levels
export type Difficulty = 'easy' | 'medium' | 'hard';

// Game state
export interface GameState {
  difficulty: Difficulty;
  totalQuestions: number;
  currentQuestionIndex: number;
  currentWord: Word | null;
  userAnswer: string[];
  score: number;
  totalTimeSpent: number;
  questionStartTime: number;
  isAnswerSubmitted: boolean;
  isCorrect: boolean | null;
  showingFeedback: boolean;
  gameComplete: boolean;
}

// Player session data
export interface PlayerSession {
  id: string;
  name: string;
  createdAt: string;
}

// Word weight for adaptive learning
export interface WordWeight {
  wordId: string;
  mistakeCount: number;
  lastSeen: string | null;
}

// Question session tracking
export interface QuestionHistory {
  wordId: string;
  timesShown: number;
  timesCorrect: number;
  timesIncorrect: number;
  lastShownAt: string | null;
}

// Session stats
export interface SessionStats {
  totalQuestions: number;
  unseenCount: number;
  seenCount: number;
  masteredCount: number; // correct more than wrong
}

// Game result for rankings
export interface GameResult {
  id: string;
  playerId: string;
  playerName: string;
  difficulty: Difficulty;
  score: number;
  totalQuestions: number;
  totalTimeSeconds: number;
  completedAt: string; // GMT+7
}

// Storage keys
export const STORAGE_KEYS = {
  PLAYER_SESSION: 'spellingbee_player',
  WORD_WEIGHTS: 'spellingbee_weights',
  RANKINGS: 'spellingbee_rankings',
  QUESTION_HISTORY: 'spellingbee_question_history',
} as const;

// Game constants
export const GAME_CONSTANTS = {
  MAX_TIME_PER_QUESTION: 60, // seconds
  DEFAULT_QUESTIONS: 30,
  FEEDBACK_HIGHLIGHT_MS: 300,
  ANSWER_REVEAL_MS: {
    easy: 8000,
    medium: 4000,
    hard: 3000,
  },
  MAX_WORD_LENGTH: 20, // Will be calculated from data
} as const;
