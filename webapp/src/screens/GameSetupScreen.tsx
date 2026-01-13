import React, { useState } from 'react';
import type { Difficulty } from '../types';
import './GameSetupScreen.css';

interface GameSetupScreenProps {
  onStart: (difficulty: Difficulty, questionCount: number) => void;
  onBack: () => void;
}

export const GameSetupScreen: React.FC<GameSetupScreenProps> = ({
  onStart,
  onBack,
}) => {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [questionCount, setQuestionCount] = useState(30);

  const difficulties: { value: Difficulty; label: string; desc: string }[] = [
    { value: 'easy', label: '🌱 Easy', desc: 'Input boxes match word length' },
    { value: 'medium', label: '🌿 Medium', desc: '+ Definition hints, 4s reveal' },
    { value: 'hard', label: '🌳 Hard', desc: '+ Definition hints, 3s reveal' },
  ];

  const questionOptions = [10, 20, 30, 50];

  return (
    <div className="setup-screen">
      <button className="back-btn" onClick={onBack}>
        ← Back
      </button>

      <div className="setup-content">
        <h1>📚 Game 1: Prepare</h1>
        
        <section className="setup-section">
          <h2>Select Difficulty</h2>
          <div className="difficulty-options">
            {difficulties.map((d) => (
              <button
                key={d.value}
                className={`difficulty-btn ${difficulty === d.value ? 'selected' : ''}`}
                onClick={() => setDifficulty(d.value)}
              >
                <span className="diff-label">{d.label}</span>
                <span className="diff-desc">{d.desc}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="setup-section">
          <h2>Number of Questions</h2>
          <div className="question-options">
            {questionOptions.map((count) => (
              <button
                key={count}
                className={`question-btn ${questionCount === count ? 'selected' : ''}`}
                onClick={() => setQuestionCount(count)}
              >
                {count}
              </button>
            ))}
          </div>
        </section>

        <button
          className="start-btn"
          onClick={() => onStart(difficulty, questionCount)}
        >
          🚀 Start Game
        </button>
      </div>
    </div>
  );
};
