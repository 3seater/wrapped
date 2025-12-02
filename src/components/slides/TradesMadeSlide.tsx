import { TradingData } from '../../types';

interface TradesMadeSlideProps {
  data: TradingData;
}

export const TradesMadeSlide: React.FC<TradesMadeSlideProps> = ({ data }) => {
  return (
    <div className="slide trades-made-slide">
      <div className="slide-header">
        <h1 className="slide-title">My Trades Made</h1>
      </div>

      <div className="slide-content">
        <div className="big-number">{data.totalTrades.toLocaleString()}</div>
        <div className="highlight-section">
          <div className="highlight-value">
            <span className="detail">Biggest trading day: <span className="date">{data.biggestTradingDay.date}</span> with <strong>{data.biggestTradingDay.trades}</strong> trades</span>
          </div>
        </div>
      </div>
    </div>
  );
};
