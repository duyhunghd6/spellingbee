import React from 'react';
import { playWholeWord, playDefinition, playSpelling, stopAudio } from '../services/audioService';
import type { Difficulty } from '../types';
import './AudioControls.css';

interface AudioControlsProps {
  word: string;
  difficulty: Difficulty;
  disabled?: boolean;
}

export const AudioControls: React.FC<AudioControlsProps> = ({
  word,
  difficulty,
  disabled = false,
}) => {
  const handlePlayWord = async () => {
    try {
      await playWholeWord(word);
    } catch (e) {
      console.error('Failed to play word audio:', e);
    }
  };

  const handlePlayDefinition = async () => {
    try {
      await playDefinition(word);
    } catch (e) {
      console.error('Failed to play definition audio:', e);
    }
  };

  const handlePlaySpelling = async () => {
    try {
      await playSpelling(word);
    } catch (e) {
      console.error('Failed to play spelling audio:', e);
    }
  };

  const showDefinitionButton = difficulty !== 'easy';

  return (
    <div className="audio-controls">
      <button 
        className="audio-btn word-btn"
        onClick={handlePlayWord}
        disabled={disabled}
      >
        🔊 Read Word
      </button>
      
      {showDefinitionButton && (
        <button 
          className="audio-btn definition-btn"
          onClick={handlePlayDefinition}
          disabled={disabled}
        >
          📖 Read Definition
        </button>
      )}
      
      <button 
        className="audio-btn spelling-btn"
        onClick={handlePlaySpelling}
        disabled={disabled}
      >
        🔤 Read Spelling
      </button>
    </div>
  );
};

// Re-export stopAudio for external use
export { stopAudio };
