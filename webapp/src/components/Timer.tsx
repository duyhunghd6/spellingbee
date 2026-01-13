import React from 'react';
import './Timer.css';

interface TimerProps {
  timeRemaining: number;
  maxTime: number;
  label?: string;
}

export const Timer: React.FC<TimerProps> = ({
  timeRemaining,
  maxTime,
  label = 'Time',
}) => {
  const percentage = (timeRemaining / maxTime) * 100;
  const isLow = timeRemaining <= 10;
  const isCritical = timeRemaining <= 5;

  return (
    <div className={`timer ${isLow ? 'low' : ''} ${isCritical ? 'critical' : ''}`}>
      <div className="timer-label">{label}</div>
      <div className="timer-display">
        <span className="timer-value">{timeRemaining}</span>
        <span className="timer-unit">s</span>
      </div>
      <div className="timer-bar">
        <div 
          className="timer-bar-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
