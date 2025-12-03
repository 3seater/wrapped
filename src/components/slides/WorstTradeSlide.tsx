import React from 'react';
import { TradingData } from '../../types';

interface WorstTradeSlideProps {
  data: TradingData;
}

export const WorstTradeSlide: React.FC<WorstTradeSlideProps> = ({ data }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const worstTrade = data.biggestLosses[0];

  if (!worstTrade) {
    return (
      <div className="slide worst-trade-slide">
        <div className="slide-content-inner">
          <h1 className="slide-title">No worst trade found</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="slide worst-trade-slide">
      <div className="slide-content-inner">
        <h1 className="slide-title">Your Worst Trade was</h1>
        <div className="token-display">
          {worstTrade.imageUrl ? (
            <img 
              src={worstTrade.imageUrl} 
              alt={worstTrade.coin}
              className="token-image-large"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="token-image-large token-placeholder">
              {worstTrade.coin.charAt(0).toUpperCase()}
            </div>
          )}
          <h2 className="token-name-large">"{worstTrade.coin}"</h2>
        </div>
        <p className="slide-description">
          with a PNL of <strong>-{formatCurrency(worstTrade.loss)}</strong>
        </p>
      </div>
    </div>
  );
};

