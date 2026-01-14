import type { Word, QuestionHistory, SessionStats } from '../types';
import { STORAGE_KEYS } from '../types';

/**
 * Question Session Service
 * 
 * Manages smart question rotation with these priorities:
 * 1. Unseen questions (never shown before)
 * 2. Questions answered incorrectly (sorted by mistake count)
 * 3. Questions answered correctly
 */

// Get all question history from storage
function getQuestionHistory(): Record<string, QuestionHistory> {
  const stored = localStorage.getItem(STORAGE_KEYS.QUESTION_HISTORY);
  return stored ? JSON.parse(stored) : {};
}

// Save question history to storage
function saveQuestionHistory(history: Record<string, QuestionHistory>): void {
  localStorage.setItem(STORAGE_KEYS.QUESTION_HISTORY, JSON.stringify(history));
}

/**
 * Mark a question as shown
 */
export function markQuestionShown(word: Word): void {
  const history = getQuestionHistory();
  const key = word.word.toLowerCase();
  
  if (!history[key]) {
    history[key] = {
      wordId: key,
      timesShown: 0,
      timesCorrect: 0,
      timesIncorrect: 0,
      lastShownAt: null,
    };
  }
  
  history[key].timesShown += 1;
  history[key].lastShownAt = new Date().toISOString();
  
  saveQuestionHistory(history);
}

/**
 * Mark a question as answered correctly
 */
export function markQuestionCorrect(word: Word): void {
  const history = getQuestionHistory();
  const key = word.word.toLowerCase();
  
  if (history[key]) {
    history[key].timesCorrect += 1;
    saveQuestionHistory(history);
  }
}

/**
 * Mark a question as answered incorrectly
 */
export function markQuestionIncorrect(word: Word): void {
  const history = getQuestionHistory();
  const key = word.word.toLowerCase();
  
  if (history[key]) {
    history[key].timesIncorrect += 1;
    saveQuestionHistory(history);
  }
}

/**
 * Calculate priority score for a word
 * Lower score = higher priority
 */
function calculatePriority(word: Word, history: Record<string, QuestionHistory>): number {
  const key = word.word.toLowerCase();
  const wordHistory = history[key];
  
  // Unseen questions get highest priority (lowest score)
  if (!wordHistory || wordHistory.timesShown === 0) {
    return 0;
  }
  
  // Calculate net incorrect (incorrect - correct)
  const netIncorrect = wordHistory.timesIncorrect - wordHistory.timesCorrect;
  
  // Questions with more mistakes get higher priority
  if (netIncorrect > 0) {
    return 1000 - (netIncorrect * 100); // Higher mistakes = lower score = higher priority
  }
  
  // Correct questions get lowest priority
  // More times shown = even lower priority
  return 10000 + wordHistory.timesShown;
}

/**
 * Select questions for a session using priority-based algorithm
 * 
 * Priority order:
 * 1. Unseen questions (never shown)
 * 2. Questions with more incorrect answers than correct
 * 3. Questions with correct answers (least priority)
 */
export function selectQuestionsForSession(
  allWords: Word[],
  count: number
): Word[] {
  const history = getQuestionHistory();
  
  if (allWords.length === 0) return [];
  if (allWords.length <= count) {
    // If we have fewer words than requested, shuffle and return all
    return shuffleArray([...allWords]);
  }
  
  // Create array with words and their priority scores
  const wordsWithPriority = allWords.map(word => ({
    word,
    priority: calculatePriority(word, history),
  }));
  
  // Sort by priority (lower score = higher priority)
  wordsWithPriority.sort((a, b) => a.priority - b.priority);
  
  // Take the top N questions based on priority
  const selected = wordsWithPriority.slice(0, count).map(item => item.word);
  
  // Shuffle to avoid predictable order
  return shuffleArray(selected);
}

/**
 * Get session statistics
 */
export function getSessionStats(allWords: Word[]): SessionStats {
  const history = getQuestionHistory();
  
  let unseenCount = 0;
  let seenCount = 0;
  let masteredCount = 0;
  
  for (const word of allWords) {
    const key = word.word.toLowerCase();
    const wordHistory = history[key];
    
    if (!wordHistory || wordHistory.timesShown === 0) {
      unseenCount++;
    } else {
      seenCount++;
      
      // Mastered if correct count is greater than incorrect count
      if (wordHistory.timesCorrect > wordHistory.timesIncorrect) {
        masteredCount++;
      }
    }
  }
  
  return {
    totalQuestions: allWords.length,
    unseenCount,
    seenCount,
    masteredCount,
  };
}

/**
 * Clear all question history (for testing or reset)
 */
export function clearQuestionHistory(): void {
  localStorage.removeItem(STORAGE_KEYS.QUESTION_HISTORY);
}

// Fisher-Yates shuffle algorithm
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
