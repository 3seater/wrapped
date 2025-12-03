import React from 'react';
import { TradingData } from '../../types';

interface TopTradeSlideProps {
  data?: TradingData;
}

export const TopTradeSlide: React.FC<TopTradeSlideProps> = ({ data }) => {
  if (!data) return null;
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const topTrade = data.biggestWins[0];

  if (!topTrade) {
    return (
      <div className="slide top-trade-slide">
        <div className="slide-content-inner">
          <h1 className="slide-title">No top trade found</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="slide top-trade-slide">
      <div className="slide-content-inner">
        <h1 className="slide-title">Your top trade was</h1>
        <div className="token-display">
          {topTrade.imageUrl ? (
            <img 
              src={topTrade.imageUrl} 
              alt={topTrade.coin}
              className="token-image-large"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="token-image-large token-placeholder">
              {topTrade.coin.charAt(0).toUpperCase()}
            </div>
          )}
          <h2 className="token-name-large">"{topTrade.coin}"</h2>
        </div>
        <p className="slide-description">
          with a PNL of <strong>{formatCurrency(topTrade.profit)}</strong>
        </p>
      </div>
    </div>
  );
};

