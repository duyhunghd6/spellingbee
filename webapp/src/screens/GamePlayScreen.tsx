import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Word, Difficulty } from '../types';
import { GAME_CONSTANTS } from '../types';
import { CharacterInput } from '../components/CharacterInput';
import { AudioControls, stopAudio } from '../components/AudioControls';
import { Timer } from '../components/Timer';
import { ScoreDisplay } from '../components/ScoreDisplay';
import { PlayerNameModal } from '../components/PlayerNameModal';
import { playWholeWord } from '../services/audioService';
import { recordMistake, recordCorrect, getMaxWordLength } from '../services/wordService';
import { getPlayerSession, saveGameResult, updatePlayerName } from '../services/storageService';
import './GamePlayScreen.css';

interface GamePlayScreenProps {
  words: Word[];
  difficulty: Difficulty;
  totalQuestions: number;
  onComplete: () => void;
  onBack: () => void;
}

export const GamePlayScreen: React.FC<GamePlayScreenProps> = ({
  words,
  difficulty,
  totalQuestions,
  onComplete,
  onBack,
}) => {
  // Filter words to only include those with audio files
  const [filteredWords, setFilteredWords] = useState<Word[]>([]);
  const [isFilteringWords, setIsFilteringWords] = useState(true);
  
  const maxWordLength = getMaxWordLength(filteredWords.length > 0 ? filteredWords : words);
  
  // Game state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [totalTimeSpent, setTotalTimeSpent] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  
  // Timer state
  const [timeRemaining, setTimeRemaining] = useState<number>(GAME_CONSTANTS.MAX_TIME_PER_QUESTION);
  
  // Feedback state
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showingFeedback, setShowingFeedback] = useState(false);
  const [nextQuestionCountdown, setNextQuestionCountdown] = useState(0);
  const [audioLoading, setAudioLoading] = useState(false);
  
  // Game complete state
  const [gameComplete, setGameComplete] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [showReview, setShowReview] = useState(false);
  
  // Answer history for review
  const [answerHistory, setAnswerHistory] = useState<{word: string; userAnswer: string; correct: boolean}[]>([]);
  
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Filter words on mount to only include those with audio
  useEffect(() => {
    const filterWordsWithAudio = async () => {
      setIsFilteringWords(true);
      const wordsWithAudio: Word[] = [];
      
      for (const word of words) {
        const paths = { wholeWord: `/audio/${word.word.toLowerCase().replace(/\s+/g, '_').replace(/\./g, '').replace(/-/g, '_').replace(/[^a-z0-9_]/g, '')}_1_whole_word.wav` };
        try {
          const response = await fetch(paths.wholeWord, { method: 'HEAD' });
          if (response.ok) {
            wordsWithAudio.push(word);
          }
        } catch {
          // Skip words without audio
        }
      }
      
      setFilteredWords(wordsWithAudio);
      setIsFilteringWords(false);
    };
    
    filterWordsWithAudio();
  }, [words]);
  
  const currentWord = filteredWords[currentIndex];
  const displayLength = difficulty === 'easy' ? currentWord.word.length : maxWordLength;

  // Initialize answer array when word changes
  useEffect(() => {
    setUserAnswer(Array(displayLength).fill(''));
    setTimeRemaining(GAME_CONSTANTS.MAX_TIME_PER_QUESTION);
    setQuestionStartTime(Date.now());
    setIsSubmitted(false);
    setIsCorrect(null);
    setShowingFeedback(false);
    setNextQuestionCountdown(0);
    
  // Auto-play word pronunciation and handle missing audio
    if (currentWord) {
      setAudioLoading(true);
      // Small delay to allow UI to settle
      const timer = setTimeout(async () => {
        try {
          await playWholeWord(currentWord.word);
          setAudioLoading(false);
        } catch (err) {
          // Only skip if the file is genuinely missing (not a playback error)
          const errorMessage = err instanceof Error ? err.message : String(err);
          if (errorMessage.includes('Audio file not found')) {
            console.warn(`Audio missing for ${currentWord.word}, skipping...`);
            setAudioLoading(false);
            // If audio is missing, wait briefly and skip to next question
            setTimeout(() => {
              moveToNextQuestion();
            }, 1500);
          } else {
            // Just log playback errors but don't skip
            console.error(`Failed to play word audio:`, err);
            setAudioLoading(false);
          }
        }
      }, 500);
      
      return () => {
        clearTimeout(timer);
        setAudioLoading(false);
      };
    }
  }, [currentIndex, currentWord, displayLength]);

  // Timer countdown - only start after audio finishes loading
  useEffect(() => {
    if (isSubmitted || gameComplete || audioLoading) return;
    
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev: number) => {
        if (prev <= 1) {
          // Time's up - auto submit
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isSubmitted, gameComplete, currentIndex, audioLoading]);

  const endGame = useCallback(() => {
    setGameComplete(true);
    
    // Check if player has a name
    const session = getPlayerSession();
    if (!session?.name) {
      setShowNameModal(true);
    } else {
      // Save result
      saveGameResult(
        session.name,
        difficulty,
        score + (isCorrect ? 1 : 0), // Include current question if correct
        totalQuestions,
        Math.round(totalTimeSpent)
      );
    }
  }, [difficulty, score, isCorrect, totalQuestions, totalTimeSpent]);

  const moveToNextQuestion = useCallback(() => {
    if (currentIndex >= totalQuestions - 1) {
      // Game complete
      endGame();
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, totalQuestions, endGame]);

  const handleSubmit = useCallback(() => {
    if (isSubmitted) return;
    
    stopAudio();
    
    const normalize = (str: string) => str.toLowerCase().replace(/[\s-]/g, '');
    const userWord = userAnswer.join('').toLowerCase().trim();
    const correctWord = currentWord.word.toLowerCase();
    
    // Compare normalized versions (ignoring spaces and hyphens)
    const correct = normalize(userWord) === normalize(correctWord);
    
    setIsSubmitted(true);
    setIsCorrect(correct);
    setShowingFeedback(true);
    
    // Calculate time spent on this question
    const timeSpent = (Date.now() - questionStartTime) / 1000;
    setTotalTimeSpent((prev) => prev + timeSpent);
    
    // Update score and word weights
    if (correct) {
      setScore((prev) => prev + 1);
      recordCorrect(currentWord);
    } else {
      recordMistake(currentWord);
    }
    
    // Track answer for review
    setAnswerHistory(prev => [...prev, {
      word: currentWord.word,
      userAnswer: userWord,
      correct
    }]);
    
    // Calculate feedback duration
    // If correct, wait only 1 second. If incorrect, wait based on difficulty
    const revealTime = correct ? 1000 : GAME_CONSTANTS.ANSWER_REVEAL_MS[difficulty];
    const countdownSeconds = Math.ceil(revealTime / 1000);
    setNextQuestionCountdown(countdownSeconds);
    
    // Start countdown
    let countdown = countdownSeconds;
    feedbackTimerRef.current = setInterval(() => {
      countdown--;
      setNextQuestionCountdown(countdown);
      
      if (countdown <= 0) {
        if (feedbackTimerRef.current) clearInterval(feedbackTimerRef.current);
        moveToNextQuestion();
      }
    }, 1000);
  }, [isSubmitted, userAnswer, currentWord, questionStartTime, difficulty, moveToNextQuestion]);

  const handleNameSubmit = (name: string) => {
    updatePlayerName(name);
    saveGameResult(
      name,
      difficulty,
      score,
      totalQuestions,
      Math.round(totalTimeSpent)
    );
    setShowNameModal(false);
  };

  const handleSkipName = () => {
    setShowNameModal(false);
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (feedbackTimerRef.current) clearInterval(feedbackTimerRef.current);
      stopAudio();
    };
  }, []);

  // Show loading while filtering words
  if (isFilteringWords) {
    return (
      <div className="game-complete-screen">
        <div className="complete-content">
          <h1>🔊 Checking Audio Files...</h1>
          <p>Please wait while we verify available questions.</p>
        </div>
      </div>
    );
  }

  // Show error if no words with audio
  if (filteredWords.length === 0) {
    return (
      <div className="game-complete-screen">
        <div className="complete-content">
          <h1>⚠️ No Audio Available</h1>
          <p>No words with audio files were found.</p>
          <button className="btn-primary" onClick={onBack}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (gameComplete && !showNameModal) {
    return (
      <div className="game-complete-screen">
        <div className="complete-content">
          <h1>🎉 Game Complete!</h1>
          
          <div className="final-score">
            <div className="score-big">{score}/{totalQuestions}</div>
            <div className="score-percent">{Math.round((score / totalQuestions) * 100)}%</div>
          </div>
          
          <div className="final-stats">
            <div className="stat">
              <span className="stat-label">Difficulty</span>
              <span className="stat-value">{difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Total Time</span>
              <span className="stat-value">{Math.floor(totalTimeSpent / 60)}:{Math.floor(totalTimeSpent % 60).toString().padStart(2, '0')}</span>
            </div>
          </div>
          
          <div className="complete-buttons">
            <button className="btn-secondary" onClick={() => setShowReview(!showReview)}>
              {showReview ? '📋 Hide Review' : '📋 Review Answers'}
            </button>
            <button className="btn-primary" onClick={onComplete}>
              🏠 Home
            </button>
          </div>
          
          {showReview && (
            <div className="review-list">
              <h3>Question Review</h3>
              {answerHistory.map((item, idx) => (
                <div key={idx} className={`review-item ${item.correct ? 'correct' : 'incorrect'}`}>
                  <span className="review-number">{idx + 1}.</span>
                  <span className="review-word">{item.word}</span>
                  {!item.correct && (
                    <span className="review-user-answer">Your answer: {item.userAnswer || '(empty)'}</span>
                  )}
                  <span className="review-status">{item.correct ? '✓' : '✗'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="gameplay-screen">
      <header className="gameplay-header">
        <button className="back-btn" onClick={onBack}>✕</button>
        <ScoreDisplay
          score={score}
          totalQuestions={totalQuestions}
          currentQuestion={currentIndex + 1}
          totalTime={totalTimeSpent}
        />
        <Timer
          timeRemaining={timeRemaining}
          maxTime={GAME_CONSTANTS.MAX_TIME_PER_QUESTION}
        />
      </header>

      <main className="gameplay-main">
        <div className="word-section">
          {audioLoading && (
            <div className="audio-loading">
              🔊 Loading audio...
            </div>
          )}
          
          {showingFeedback && nextQuestionCountdown > 0 && (
            <div className="next-countdown">
              Next word in {nextQuestionCountdown}s
            </div>
          )}
          
          <AudioControls
            word={currentWord.word}
            difficulty={difficulty}
            disabled={isSubmitted}
          />
        </div>

        <div className="input-section">
          <CharacterInput
            key={currentWord.word} // Force remount on new word to reset focus
            maxLength={maxWordLength}
            actualLength={difficulty === 'easy' ? currentWord.word.length : undefined}
            value={userAnswer}
            onChange={setUserAnswer}
            onSubmit={handleSubmit}
            disabled={isSubmitted}
            showFeedback={showingFeedback}
            correctWord={currentWord.word}
            isCorrect={isCorrect}
          />
        </div>

        {!isSubmitted && (
          <button className="submit-btn" onClick={handleSubmit}>
            ✓ Submit
          </button>
        )}
      </main>

      <PlayerNameModal
        isOpen={showNameModal}
        onSubmit={handleNameSubmit}
        onSkip={handleSkipName}
      />
    </div>
  );
};
