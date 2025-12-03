import React from 'react';
import { TradingData } from '../../types';

interface TopTradesListSlideProps {
  data?: TradingData;
}

export const TopTradesListSlide: React.FC<TopTradesListSlideProps> = ({ data }) => {
  if (!data) return null;
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const topTrades = data.biggestWins.slice(0, 5);

  return (
    <div className="slide top-trades-list-slide">
      <div className="slide-content-inner" style={{ width: '100%', alignItems: 'center' }}>
        <h1 className="slide-title">Your Top Trades</h1>
        <div className="wins-list-compact" style={{ width: '100%', maxWidth: '320px' }}>
          {topTrades.map((win, index) => (
            <div key={index} className="win-item-compact">
              <div className="win-rank-compact">{index + 1}</div>
              <div className="coin-info-compact">
                {win.imageUrl ? (
                  <img 
                    src={win.imageUrl} 
                    alt={win.coin}
                    className="coin-image-compact"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      img.style.display = 'none';
                      const fallback = img.nextElementSibling as HTMLElement;
                      if (fallback) {
                        fallback.style.display = 'flex';
                      }
                    }}
                  />
                ) : null}
                <div 
                  className="coin-image-compact" 
                  style={{ 
                    display: win.imageUrl ? 'none' : 'flex',
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                    background: '#1db954',
                    borderRadius: '0',
                    border: 'none',
                    width: '50px',
                    height: '50px'
                  }}
                >
                  {win.coin.charAt(0).toUpperCase()}
                </div>
                <div className="coin-details-compact">
                  <div className="coin-name-compact">{win.coin}</div>
                </div>
              </div>
              <div className="win-amount-compact">+{formatCurrency(win.profit)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

