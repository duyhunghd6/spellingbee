import React from 'react';
import './HomeScreen.css';

interface HomeScreenProps {
  onSelectGame: (game: 'prepare' | 'contest') => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onSelectGame }) => {
  return (
    <div className="home-screen">
      <div className="home-header">
        <h1 className="home-title">
          <span className="emoji">🐝</span>
          SpellingBee Practicing
        </h1>
        <p className="home-subtitle">Practice makes perfect!</p>
      </div>

      <div className="game-cards">
        <button
          className="game-card prepare-card"
          onClick={() => onSelectGame('prepare')}
        >
          <span className="card-emoji">📚</span>
          <h2>Game 1: Prepare</h2>
          <p>Practice spelling words with audio hints</p>
          <span className="card-badge">Available</span>
        </button>

        <button
          className="game-card contest-card"
          onClick={() => onSelectGame('contest')}
          disabled
        >
          <span className="card-emoji">🎤</span>
          <h2>Game 2: Contest</h2>
          <p>Speak with AI examiner</p>
          <span className="card-badge">Coming Soon</span>
        </button>
      </div>

      <footer className="home-footer">
        <p>Stage 4 - Grade 3 • Global English Unit 1-5</p>
        <p className="credit">
          <a href="https://github.com/duyhunghd6/spellingbee" target="_blank" rel="noopener noreferrer">GitHub</a>
          {' • '}
          <a href="mailto:hungbd@gscfin.com">hungbd@gscfin.com</a>
        </p>
      </footer>
    </div>
  );
};
