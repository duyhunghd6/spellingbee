import React, { useRef, useEffect, useCallback } from 'react';
import './CharacterInput.css';

interface CharacterInputProps {
  maxLength: number;
  actualLength?: number; // For easy mode
  value: string[];
  onChange: (value: string[]) => void;
  onSubmit: () => void;
  disabled?: boolean;
  showFeedback?: boolean;
  correctWord?: string;
  isCorrect?: boolean | null;
}

export const CharacterInput: React.FC<CharacterInputProps> = ({
  maxLength,
  actualLength,
  value,
  onChange,
  onSubmit,
  disabled = false,
  showFeedback = false,
  correctWord = '',
  isCorrect = null,
}) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const displayLength = actualLength ?? maxLength;

  // Initialize refs array
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, displayLength);
  }, [displayLength]);

  // Auto-focus first input on mount/remount (key change triggers remount)
  useEffect(() => {
    // Focus immediately after render
    requestAnimationFrame(() => {
      inputRefs.current[0]?.focus();
    });
  }, []);

  const focusInput = useCallback((index: number) => {
    if (index >= 0 && index < displayLength) {
      inputRefs.current[index]?.focus();
    }
  }, [displayLength]);

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit();
      return;
    }

    if (e.key === 'Backspace') {
      e.preventDefault();
      const newValue = [...value];
      if (newValue[index]) {
        newValue[index] = '';
        onChange(newValue);
      } else if (index > 0) {
        newValue[index - 1] = '';
        onChange(newValue);
        focusInput(index - 1);
      }
      return;
    }

    if (e.key === 'Delete') {
      e.preventDefault();
      // Clear entire input
      onChange(Array(displayLength).fill(''));
      focusInput(0);
      return;
    }

    if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      focusInput(index - 1);
      return;
    }

    if (e.key === 'ArrowRight' && index < displayLength - 1) {
      e.preventDefault();
      focusInput(index + 1);
      return;
    }
  };

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;

    const rawChar = e.target.value.slice(-1);
    // Allow letters, hyphen, space, and period
    const char = /^[a-zA-Z]$/.test(rawChar) ? rawChar.toUpperCase() : rawChar;
    if (!/^[A-Z\- .]$/.test(char) && char !== '') return;

    const newValue = [...value];
    newValue[index] = char;
    onChange(newValue);

    // Auto-advance to next input
    if (char && index < displayLength - 1) {
      focusInput(index + 1);
    }
  };

  const handleClearAll = () => {
    if (disabled) return;
    onChange(Array(displayLength).fill(''));
    focusInput(0);
  };

  const getBoxClass = (index: number): string => {
    let className = 'char-box';
    
    if (showFeedback && correctWord) {
      const correctChar = correctWord[index]?.toUpperCase() || '';
      const userChar = value[index]?.toUpperCase() || '';
      
      if (userChar === correctChar) {
        className += ' correct';
      } else if (userChar) {
        className += ' incorrect';
      } else if (correctChar) {
        className += ' missing';
      }
    }
    
    return className;
  };

  return (
    <div className="character-input-container">
      <div className="char-boxes" style={{ '--box-count': displayLength } as React.CSSProperties}>
        {Array.from({ length: displayLength }).map((_, index) => (
          <input
            key={index}
            ref={(el) => { inputRefs.current[index] = el; }}
            type="text"
            className={getBoxClass(index)}
            value={value[index] || ''}
            onChange={(e) => handleChange(index, e)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            disabled={disabled}
            maxLength={1}
            autoComplete="off"
            autoCapitalize="characters"
          />
        ))}
      </div>
      
      {showFeedback && correctWord && (
        <div className={`feedback-answer ${isCorrect ? 'correct' : 'incorrect'}`}>
          {isCorrect ? '✓ Correct!' : `Answer: ${correctWord.toUpperCase()}`}
        </div>
      )}
      
      <button 
        className="clear-btn" 
        onClick={handleClearAll}
        disabled={disabled}
        title="Clear all"
      >
        ← Clear
      </button>
    </div>
  );
};
