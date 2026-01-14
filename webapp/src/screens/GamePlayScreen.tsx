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
import { markQuestionShown, markQuestionCorrect, markQuestionIncorrect } from '../services/questionSessionService';
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
  const maxWordLength = getMaxWordLength(words);
  
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
  
  // Removed retry state - now only using review round at the end
  
  // Review round state
  const [isReviewRound, setIsReviewRound] = useState(false);
  const [wrongWords, setWrongWords] = useState<Word[]>([]);
  const [reviewScore, setReviewScore] = useState(0);
  
  // Answer history for review
  const [answerHistory, setAnswerHistory] = useState<{word: string; userAnswer: string; correct: boolean}[]>([]);
  
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Use wrongWords array during review round, otherwise use main words array
  const activeWords = isReviewRound ? wrongWords : words;
  const currentWord = activeWords[currentIndex];
  const displayLength = difficulty === 'easy' ? (currentWord?.word.length || 0) : maxWordLength;

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
      // Mark question as shown for session tracking
      markQuestionShown(currentWord);
      
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
    if (isSubmitted || gameComplete || audioLoading) {
      // Clear any existing timer when these states change
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev: number) => {
        if (prev <= 1) {
          // Time's up - trigger submit on next tick
          requestAnimationFrame(() => {
            const submitBtn = document.querySelector('.submit-btn') as HTMLButtonElement;
            submitBtn?.click();
          });
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
    
    // Calculate final score including review round if applicable
    const finalScore = isReviewRound ? score + reviewScore : score + (isCorrect ? 1 : 0);
    
    // Check if player has a name
    const session = getPlayerSession();
    if (!session?.name) {
      setShowNameModal(true);
    } else {
      // Save result
      saveGameResult(
        session.name,
        difficulty,
        finalScore,
        totalQuestions,
        Math.round(totalTimeSpent)
      );
    }
  }, [difficulty, score, reviewScore, isCorrect, totalQuestions, totalTimeSpent, isReviewRound]);

  const moveToNextQuestion = useCallback(() => {
    if (isReviewRound) {
      // In review round, check if we've reviewed all wrong words
      if (currentIndex >= wrongWords.length - 1) {
        endGame();
      } else {
        setCurrentIndex((prev) => prev + 1);
      }
    } else {
      // In main session, check if completed all questions
      if (currentIndex >= totalQuestions - 1) {
        // Check if there are wrong words to review
        if (wrongWords.length > 0) {
          startReviewRound();
        } else {
          endGame();
        }
      } else {
        setCurrentIndex((prev) => prev + 1);
      }
    }
  }, [currentIndex, totalQuestions, wrongWords, isReviewRound, endGame]);

  const handleSubmit = useCallback(() => {
    // Safety check - prevent error if currentWord is undefined
    if (!currentWord) {
      console.error('handleSubmit called with undefined currentWord');
      return;
    }
    
    // Only allow one submission per question
    if (isSubmitted && timeRemaining > 0) return;
    
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
      if (isReviewRound) {
        setReviewScore((prev) => prev + 1);
      } else {
        setScore((prev) => prev + 1);
      }
      recordCorrect(currentWord);
      markQuestionCorrect(currentWord); // Track in session
    } else {
      recordMistake(currentWord);
      markQuestionIncorrect(currentWord); // Track in session
      
      // Add to wrong words list for review round (only in main session, not during review)
      if (!isReviewRound) {
        setWrongWords((prev) => [...prev, currentWord]);
      }
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
  }, [isSubmitted, userAnswer, currentWord, questionStartTime, difficulty, isReviewRound, moveToNextQuestion]);

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



  const startReviewRound = () => {
    // Transition to review round
    setIsReviewRound(true);
    setCurrentIndex(0); // Reset to first question (but now using wrongWords array)
    setReviewScore(0);
    
    // Reset feedback state for new round
    setIsSubmitted(false);
    setIsCorrect(null);
    setShowingFeedback(false);
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (feedbackTimerRef.current) clearInterval(feedbackTimerRef.current);
      stopAudio();
    };
  }, []);

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
      {isReviewRound && (
        <div className="review-round-banner">
          🔄 Review Round - Practice wrong answers ({currentIndex + 1}/{wrongWords.length})
        </div>
      )}
      
      <header className="gameplay-header">
        <button className="back-btn" onClick={onBack}>✕</button>
        <ScoreDisplay
          score={isReviewRound ? reviewScore : score}
          totalQuestions={isReviewRound ? wrongWords.length : totalQuestions}
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
