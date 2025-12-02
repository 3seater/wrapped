import { TradingData } from '../../types';

interface TotalPnLSlideProps {
  data: TradingData;
}

export const TotalPnLSlide: React.FC<TotalPnLSlideProps> = ({ data }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const isPositive = data.totalPnL >= 0;

  return (
    <div className="slide total-pnl-slide">
      <div className="slide-header">
        <h1 className="slide-title">Total PnL</h1>
        <div className={`pnl-display ${isPositive ? 'positive' : 'negative'}`}>
          <span className="big-number">{formatCurrency(Math.abs(data.totalPnL))}</span>
          <span className="pnl-indicator">{isPositive ? '+' : '-'}</span>
        </div>
      </div>

      <div className="slide-content">
        <div className="highlight-section">
          <h2 className="highlight-title">Highest PnL Day</h2>
          <div className="highlight-value">
            <span className="date">{data.highestPnLDay.date}</span>
            <span className="detail"><strong>{formatCurrency(data.highestPnLDay.pnl)}</strong> profit</span>
          </div>
        </div>

        <div className="pnl-breakdown">
          <div className="breakdown-grid">
            <div className="breakdown-item">
              <span className="breakdown-label">Win Rate</span>
              <span className="breakdown-value"><strong>68%</strong></span>
            </div>
            <div className="breakdown-item">
              <span className="breakdown-label">Avg Win</span>
              <span className="breakdown-value"><strong>{formatCurrency(250)}</strong></span>
            </div>
            <div className="breakdown-item">
              <span className="breakdown-label">Avg Loss</span>
              <span className="breakdown-value"><strong>{formatCurrency(-180)}</strong></span>
            </div>
            <div className="breakdown-item">
              <span className="breakdown-label">Best Streak</span>
              <span className="breakdown-value"><strong>12</strong> wins</span>
            </div>
          </div>
        </div>

        <div className="final-message">
          <p className="congrats-text">
            {isPositive
              ? "Congratulations on your profitable year! The trenches were kind to you. 🎉"
              : "The trenches were tough this year, but every loss is a lesson. Stay strong! 💪"
            }
          </p>
          <p className="share-text">Share your Trenches Wrapped with fellow degens!</p>
        </div>
      </div>
    </div>
  );
};
