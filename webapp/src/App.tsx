import { useState, useEffect } from 'react';
import type { Word, Difficulty } from './types';
import { loadWords } from './services/wordService';
import { selectQuestionsForSession } from './services/questionSessionService';
import { HomeScreen } from './screens/HomeScreen';
import { GameSetupScreen } from './screens/GameSetupScreen';
import { GamePlayScreen } from './screens/GamePlayScreen';
import { LeaderboardScreen } from './screens/LeaderboardScreen';
import './App.css';

type Screen = 'home' | 'setup' | 'game' | 'leaderboard';

function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [allWords, setAllWords] = useState<Word[]>([]);
  const [gameWords, setGameWords] = useState<Word[]>([]);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [totalQuestions, setTotalQuestions] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load words on mount
  useEffect(() => {
    loadWords()
      .then((words) => {
        setAllWords(words);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load words:', err);
        setError('Failed to load word data');
        setLoading(false);
      });
  }, []);

  const handleSelectGame = (game: 'prepare' | 'contest') => {
    if (game === 'prepare') {
      setScreen('setup');
    }
    // Contest mode not implemented yet
  };

  const handleStartGame = (diff: Difficulty, count: number) => {
    setDifficulty(diff);
    setTotalQuestions(count);
    
    // Select words using session-based smart rotation algorithm
    const actualCount = Math.min(count, allWords.length);
    const selected = selectQuestionsForSession(allWords, actualCount);
    setGameWords(selected);
    
    setScreen('game');
  };

  const handleGameComplete = () => {
    setScreen('home');
  };

  const handleBack = () => {
    setScreen('home');
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loader"></div>
        <p>Loading words...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-screen">
        <p>⚠️ {error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="app">
      {screen === 'home' && (
        <HomeScreen
          onSelectGame={handleSelectGame}
          onViewLeaderboard={() => setScreen('leaderboard')}
        />
      )}
      
      {screen === 'setup' && (
        <GameSetupScreen
          onStart={handleStartGame}
          onBack={handleBack}
        />
      )}
      
      {screen === 'game' && gameWords.length > 0 && (
        <GamePlayScreen
          words={gameWords}
          difficulty={difficulty}
          totalQuestions={Math.min(totalQuestions, gameWords.length)}
          onComplete={handleGameComplete}
          onBack={handleBack}
        />
      )}

      {screen === 'leaderboard' && (
        <LeaderboardScreen onBack={() => setScreen('home')} />
      )}
    </div>
  );
}

export default App;