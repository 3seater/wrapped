import { TradingData } from '../../types';

interface PaperhandsSlideProps {
  data: TradingData;
}

export const PaperhandsSlide: React.FC<PaperhandsSlideProps> = ({ data }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="slide paperhands-slide">
      <div className="slide-header">
        <h1 className="slide-title">Paperhands</h1>
        <p className="slide-subtitle">Coins you sold too early</p>
      </div>

      <div className="slide-content">
        <div className="paperhands-list">
          {data.paperhands.map((paperhand, index) => (
            <div key={index} className="paperhand-item">
              <div className="paperhand-coin">
                <span className="coin-name">{paperhand.coin}</span>
                <span className="sold-at">Sold at <strong>{formatCurrency(paperhand.soldAt)}</strong></span>
              </div>
              <div className="paperhand-potential">
                <div className="ath-price">ATH: <strong>{formatCurrency(paperhand.athPrice)}</strong></div>
                <div className="missed-profit">
                  Missed: <strong>{formatCurrency(paperhand.potentialProfit)}</strong>
                </div>
              </div>
              <div className="paperhand-emoji">😭</div>
            </div>
          ))}
        </div>

        <div className="paperhands-insight">
          <p className="insight-text">
            Remember, HODLing isn't always the answer, but sometimes the chart just needs more time.
          </p>
          <p className="paperhands-quote">
            "Diamond hands or paper hands - you decide your fate in the crypto game."
          </p>
        </div>
      </div>
    </div>
  );
};
