import React from 'react';
import './ScoreDisplay.css';

interface ScoreDisplayProps {
  score: number;
  totalQuestions: number;
  currentQuestion: number;
  totalTime: number;
}

export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({
  score,
  totalQuestions,
  currentQuestion,
  totalTime,
}) => {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="score-display">
      <div className="score-item">
        <span className="score-label">Score</span>
        <span className="score-value">{score}/{totalQuestions}</span>
      </div>
      <div className="score-item">
        <span className="score-label">Question</span>
        <span className="score-value">{currentQuestion}/{totalQuestions}</span>
      </div>
      <div className="score-item">
        <span className="score-label">Total Time</span>
        <span className="score-value time">{formatTime(totalTime)}</span>
      </div>
    </div>
  );
};
