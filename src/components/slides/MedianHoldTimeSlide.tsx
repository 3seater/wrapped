import React from 'react';
import { TradingData } from '../../types';

interface MedianHoldTimeSlideProps {
  data: TradingData;
}

export const MedianHoldTimeSlide: React.FC<MedianHoldTimeSlideProps> = ({ data }) => {
  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${Math.round(seconds)} seconds`;
    } else if (seconds < 3600) {
      const minutes = Math.round(seconds / 60);
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else if (seconds < 86400) {
      const hours = Math.round(seconds / 3600);
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    } else {
      const days = Math.round(seconds / 86400);
      return `${days} day${days !== 1 ? 's' : ''}`;
    }
  };

  const holdTimeSeconds = data.medianHoldTime || 0;
  const holdTimeFormatted = formatTime(holdTimeSeconds);
  
  // Determine message based on hold time
  const isJeet = holdTimeSeconds >= 10 && holdTimeSeconds < 60; // 10 seconds to 1 minute
  const isDiamondHand = holdTimeSeconds >= 60; // 1 minute or more

  return (
    <div className="slide median-hold-time-slide">
      <div className="slide-content-inner">
        <h1 className="slide-title">Your median hold time was</h1>
        <div className="highlight-value">{holdTimeFormatted}</div>
        {isJeet && (
          <p className="slide-description" style={{ marginTop: '2rem', fontSize: '1.5rem', fontWeight: 'bold' }}>
            Wow, what a jeet
          </p>
        )}
        {isDiamondHand && (
          <p className="slide-description" style={{ marginTop: '2rem', fontSize: '1.5rem', fontWeight: 'bold' }}>
            A real diamond hander you are
          </p>
        )}
      </div>
    </div>
  );
};

