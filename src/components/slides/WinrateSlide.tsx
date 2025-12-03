import React from 'react';
import { TradingData } from '../../types';

interface WinrateSlideProps {
  data?: TradingData;
}

export const WinrateSlide: React.FC<WinrateSlideProps> = ({ data }) => {
  if (!data) return null;
  const winrate = Math.round(data.winrate || 0);

  return (
    <div className="slide winrate-slide">
      <div className="slide-content-inner">
        <h1 className="slide-title">You had a winrate of</h1>
        <div className="highlight-value">{winrate}%</div>
      </div>
    </div>
  );
};

