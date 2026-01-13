import React, { useState } from 'react';
import './PlayerNameModal.css';

interface PlayerNameModalProps {
  isOpen: boolean;
  onSubmit: (name: string) => void;
  onSkip?: () => void;
}

export const PlayerNameModal: React.FC<PlayerNameModalProps> = ({
  isOpen,
  onSubmit,
  onSkip,
}) => {
  const [name, setName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim());
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>🏆 Great Job!</h2>
        <p>Enter your name to save your score:</p>
        
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            className="name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name..."
            maxLength={20}
            autoFocus
          />
          
          <div className="modal-buttons">
            <button type="submit" className="btn-primary" disabled={!name.trim()}>
              Save Score
            </button>
            {onSkip && (
              <button type="button" className="btn-secondary" onClick={onSkip}>
                Skip
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
