import { TradingData } from '../../types';

interface BiggestWinsSlideProps {
  data: TradingData;
}

export const BiggestWinsSlide: React.FC<BiggestWinsSlideProps> = ({ data }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="slide biggest-wins-slide">
      <div className="slide-header">
        <h1 className="slide-title">My Top Trades</h1>
      </div>

      <div className="slide-content">
        <div className="wins-list">
          {data.biggestWins.map((win, index) => (
            <div key={index} className={`win-item rank-${index + 1}`}>
              <div className="win-rank">{index + 1}</div>
              <div className="coin-info">
                {win.imageUrl ? (
                  <img 
                    src={win.imageUrl} 
                    alt={win.coin}
                    className="coin-image"
                    onError={(e) => {
                      // Fallback if image fails to load
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="coin-image" style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: '2rem',
                    background: '#1db954',
                    borderRadius: '0',
                    border: 'none'
                  }}>
                    {win.coin.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="coin-details">
                  <div className="coin-name">{win.coin}</div>
                  <div className="win-date">{win.date.toLocaleDateString()}</div>
                </div>
              </div>
              <div className="win-amount">+{formatCurrency(win.profit)}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};
