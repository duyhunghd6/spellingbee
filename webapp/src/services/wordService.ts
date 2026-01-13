import type { Word, WordWeight } from '../types';
import { STORAGE_KEYS } from '../types';

// Load words data
let wordsCache: Word[] | null = null;

export async function loadWords(): Promise<Word[]> {
  if (wordsCache) return wordsCache;
  
  const response = await fetch('/data/words.json');
  wordsCache = await response.json();
  return wordsCache!;
}

// Calculate max word length from data
export function getMaxWordLength(words: Word[]): number {
  return Math.max(...words.map(w => w.word.length));
}

// Get word weights from storage
function getWordWeights(): Record<string, WordWeight> {
  const stored = localStorage.getItem(STORAGE_KEYS.WORD_WEIGHTS);
  return stored ? JSON.parse(stored) : {};
}

// Save word weights to storage
function saveWordWeights(weights: Record<string, WordWeight>): void {
  localStorage.setItem(STORAGE_KEYS.WORD_WEIGHTS, JSON.stringify(weights));
}

// Record a mistake for a word
export function recordMistake(word: Word): void {
  const weights = getWordWeights();
  const key = word.word.toLowerCase();
  
  if (!weights[key]) {
    weights[key] = {
      wordId: key,
      mistakeCount: 0,
      lastSeen: null,
    };
  }
  
  weights[key].mistakeCount += 1;
  weights[key].lastSeen = new Date().toISOString();
  
  saveWordWeights(weights);
}

// Record a correct answer (reduces weight slightly over time)
export function recordCorrect(word: Word): void {
  const weights = getWordWeights();
  const key = word.word.toLowerCase();
  
  if (weights[key] && weights[key].mistakeCount > 0) {
    weights[key].mistakeCount = Math.max(0, weights[key].mistakeCount - 0.5);
    weights[key].lastSeen = new Date().toISOString();
    saveWordWeights(weights);
  }
}

/**
 * Weighted random selection algorithm
 * Words with more mistakes have higher probability of being selected
 */
export function selectWordsWeighted(
  allWords: Word[],
  count: number,
  excludeWords: string[] = []
): Word[] {
  const weights = getWordWeights();
  const available = allWords.filter(w => !excludeWords.includes(w.word.toLowerCase()));
  
  if (available.length === 0) return [];
  if (available.length <= count) return shuffleArray([...available]);
  
  // Calculate weights for each word
  const BASE_WEIGHT = 1;
  const MISTAKE_MULTIPLIER = 3;
  
  const wordWeights = available.map(word => {
    const key = word.word.toLowerCase();
    const mistakeCount = weights[key]?.mistakeCount || 0;
    const weight = BASE_WEIGHT + (mistakeCount * MISTAKE_MULTIPLIER);
    return { word, weight };
  });
  
  // Weighted random selection
  const selected: Word[] = [];
  const remaining = [...wordWeights];
  
  while (selected.length < count && remaining.length > 0) {
    const totalWeight = remaining.reduce((sum, w) => sum + w.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < remaining.length; i++) {
      random -= remaining[i].weight;
      if (random <= 0) {
        selected.push(remaining[i].word);
        remaining.splice(i, 1);
        break;
      }
    }
  }
  
  // Shuffle final selection to avoid predictable patterns
  return shuffleArray(selected);
}

// Fisher-Yates shuffle
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Get unique units from words
export function getUnits(words: Word[]): number[] {
  return [...new Set(words.map(w => w.unit))].sort((a, b) => a - b);
}

// Filter words by unit
export function filterByUnit(words: Word[], unit: number | 'all'): Word[] {
  if (unit === 'all') return words;
  return words.filter(w => w.unit === unit);
}
