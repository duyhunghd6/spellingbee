import React, { useState } from 'react';
import type { Difficulty } from '../types';
import { getRankings } from '../services/storageService';
import { getPlayerSession, updatePlayerName } from '../services/storageService';
import './LeaderboardScreen.css';

interface LeaderboardScreenProps {
  onBack: () => void;
}

export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({ onBack }) => {
  const [difficultyFilter, setDifficultyFilter] = useState<Difficulty | 'all'>('all');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  
  const playerSession = getPlayerSession();
  const allRankings = getRankings();
  
  // Filter rankings by difficulty
  const filteredRankings = difficultyFilter === 'all' 
    ? allRankings
    : allRankings.filter(r => r.difficulty === difficultyFilter);

  const handleStartEdit = () => {
    setEditedName(playerSession?.name || '');
    setIsEditingName(true);
  };

  const handleSaveName = () => {
    if (editedName.trim()) {
      updatePlayerName(editedName.trim());
      setIsEditingName(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingName(false);
    setEditedName('');
  };

  // Format time in minutes and seconds
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins} min${mins > 1 ? 's' : ''}`;
    }
    return `${secs}s`;
  };

  // Format timestamp to show time only (HH:MM)
  const formatPlayTime = (isoString: string): string => {
    const date = new Date(isoString);
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes} ${ampm}`;
  };

  // Format date to show day
  const formatPlayDate = (isoString: string): string => {
    const date = new Date(isoString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  // Get color class based on score percentage
  const getScoreClass = (score: number, total: number): string => {
    const percentage = (score / total) * 100;
    if (percentage >= 80) return 'score-excellent';
    if (percentage >= 60) return 'score-good';
    return 'score-normal';
  };

  // Get difficulty badge
  const getDifficultyBadge = (difficulty: Difficulty): string => {
    const badges = { easy: '🌱', medium: '🌿', hard: '🌳' };
    return badges[difficulty];
  };

  return (
    <div className="leaderboard-screen">
      <header className="leaderboard-header">
        <button className="back-btn" onClick={onBack}>
          ← Back
        </button>
        <h1>🏆 Leaderboard</h1>
      </header>

      <div className="leaderboard-content">
        {/* Player Greeting */}
        {playerSession && (
          <div className="player-greeting">
            {isEditingName ? (
              <div className="edit-name-section">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="name-input"
                  placeholder="Enter your name"
                  maxLength={20}
                />
                <div className="edit-buttons">
                  <button className="btn-save" onClick={handleSaveName}>
                    ✓ Save
                  </button>
                  <button className="btn-cancel" onClick={handleCancelEdit}>
                    ✕ Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h2>Welcome, {playerSession.name}! 👋</h2>
                <button className="btn-edit-name" onClick={handleStartEdit}>
                  ✏️ Edit Name
                </button>
              </>
            )}
          </div>
        )}

        {/* Difficulty Filter Tabs */}
        <div className="filter-tabs">
          <button
            className={`filter-tab ${difficultyFilter === 'all' ? 'active' : ''}`}
            onClick={() => setDifficultyFilter('all')}
          >
            All
          </button>
          <button
            className={`filter-tab ${difficultyFilter === 'easy' ? 'active' : ''}`}
            onClick={() => setDifficultyFilter('easy')}
          >
            🌱 Easy
          </button>
          <button
            className={`filter-tab ${difficultyFilter === 'medium' ? 'active' : ''}`}
            onClick={() => setDifficultyFilter('medium')}
          >
            🌿 Medium
          </button>
          <button
            className={`filter-tab ${difficultyFilter === 'hard' ? 'active' : ''}`}
            onClick={() => setDifficultyFilter('hard')}
          >
            🌳 Hard
          </button>
        </div>

        {/* Game History List */}
        {filteredRankings.length > 0 ? (
          <div className="history-list">
            {filteredRankings.map((result) => (
              <div key={result.id} className="history-item">
                <div className="history-header">
                  <span className="player-name">{result.playerName}</span>
                  <span className="difficulty-badge">
                    {getDifficultyBadge(result.difficulty)}
                  </span>
                </div>
                <div className={`score-display ${getScoreClass(result.score, result.totalQuestions)}`}>
                  {result.score}/{result.totalQuestions}
                  <span className="score-percent">
                    ({Math.round((result.score / result.totalQuestions) * 100)}%)
                  </span>
                </div>
                <div className="game-meta">
                  <span className="time-spent">⏱️ {formatTime(result.totalTimeSeconds)}</span>
                  <span className="play-timestamp">
                    {formatPlayDate(result.completedAt)} at {formatPlayTime(result.completedAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>📝 No games played yet!</p>
            <p className="empty-subtitle">Complete a game to see your history here</p>
          </div>
        )}
      </div>
    </div>
  );
};
