import { TradingData } from '../../types';

interface BiggestLossesSlideProps {
  data: TradingData;
}

export const BiggestLossesSlide: React.FC<BiggestLossesSlideProps> = ({ data }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="slide biggest-losses-slide">
      <div className="slide-header">
        <h1 className="slide-title">My Biggest Fumbles</h1>
      </div>

      <div className="slide-content">
        <div className="losses-list">
          {data.biggestLosses.map((loss, index) => (
            <div key={index} className={`loss-item rank-${index + 1}`}>
              <div className="loss-rank">{index + 1}</div>
              <div className="coin-info">
                {loss.imageUrl ? (
                  <img 
                    src={loss.imageUrl} 
                    alt={loss.coin}
                    className="coin-image"
                    style={{
                      width: '80px',
                      height: '80px',
                      objectFit: 'cover',
                      borderRadius: '0',
                      border: 'none',
                      display: 'block'
                    }}
                    onError={(e) => {
                      // Fallback if image fails to load - show initial letter instead
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
                  className="coin-image" 
                  style={{ 
                    display: loss.imageUrl ? 'none' : 'flex',
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: '2rem',
                    background: '#ff6b6b',
                    borderRadius: '0',
                    border: 'none',
                    width: '80px',
                    height: '80px'
                  }}
                >
                  {loss.coin.charAt(0).toUpperCase()}
                </div>
                <div className="coin-details">
                  <div className="coin-name">{loss.coin}</div>
                  <div className="loss-date">{loss.date.toLocaleDateString()}</div>
                </div>
              </div>
              <div className="loss-amount">-{formatCurrency(Math.abs(loss.loss))}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};
