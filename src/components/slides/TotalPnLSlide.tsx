import { TradingData } from '../../types';

interface TotalPnLSlideProps {
  data: TradingData;
}

export const TotalPnLSlide: React.FC<TotalPnLSlideProps> = ({ data }) => {
  const formatCurrency = (amount: number) => {
    if (Math.abs(amount) >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    } else if (Math.abs(amount) >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    }
    return Math.abs(amount).toFixed(2);
  };

  const isPositive = data.totalPnL >= 0;
  // totalPnL is always in USD (converted from SOL for Solana chains)
  const currencySymbol = '$';
  const currencyDisplay = '';

  return (
    <div className="slide total-pnl-slide">
      <div className="slide-header">
        <h1 className="slide-title">My Total PnL</h1>
      </div>

      <div className="slide-content">
        <div className="big-number">
          {isPositive ? '+' : '-'}{currencySymbol}{formatCurrency(data.totalPnL)}{currencyDisplay ? ' ' + currencyDisplay : ''}
        </div>
        <div className="highlight-section">
          <div className="highlight-value">
            <span className="detail">
              {isPositive ? 'You made' : 'You lost'} <strong>{currencySymbol}{formatCurrency(data.totalPnL)}{currencyDisplay ? ' ' + currencyDisplay : ''}</strong> {isPositive ? 'in profit' : 'this year'}
              {data.highestPnLDay.pnl !== 0 && (
                <> • Highest PnL day: <span className="date">{data.highestPnLDay.date}</span> with <strong>{currencySymbol}{formatCurrency(data.highestPnLDay.pnl)}{currencyDisplay ? ' ' + currencyDisplay : ''}</strong></>
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
