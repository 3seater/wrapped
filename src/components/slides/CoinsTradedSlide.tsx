import React from 'react';
import { TradingData } from '../../types';

interface CoinsTradedSlideProps {
  data: TradingData;
}

export const CoinsTradedSlide: React.FC<CoinsTradedSlideProps> = ({ data }) => {
  // Calculate top % of traders (rough estimate based on tokens traded)
  // This is a simplified calculation - you can adjust the formula
  const calculateTopPercent = (tokensTraded: number): number => {
    // Rough estimate: if someone trades 1 token, they're in top 90%
    // If they trade 10 tokens, top 50%
    // If they trade 50 tokens, top 10%
    // If they trade 100+ tokens, top 5%
    if (tokensTraded >= 100) return 5;
    if (tokensTraded >= 50) return 10;
    if (tokensTraded >= 20) return 25;
    if (tokensTraded >= 10) return 50;
    if (tokensTraded >= 5) return 75;
    return 90;
  };

  const topPercent = calculateTopPercent(data.totalTrades);

  return (
    <div className="slide coins-traded-slide">
      <div className="slide-content-inner">
        <h1 className="slide-title">You traded</h1>
        <div className="highlight-value">{data.totalTrades.toLocaleString()}</div>
        <h2 className="slide-subtitle">coins this year</h2>
        <p className="slide-description">
          This puts you in the top <strong>{topPercent}%</strong> of traders
        </p>
      </div>
    </div>
  );
};

