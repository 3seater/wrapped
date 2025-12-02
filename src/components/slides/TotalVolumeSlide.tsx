import { TradingData } from '../../types';

interface TotalVolumeSlideProps {
  data: TradingData;
}

export const TotalVolumeSlide: React.FC<TotalVolumeSlideProps> = ({ data }) => {
  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K`;
    }
    return volume.toFixed(2);
  };

  const currencySymbol = data.currency === 'USD' ? '$' : '';
  const currencyDisplay = data.currency === 'USD' ? '' : data.currency;

  return (
    <div className="slide total-volume-slide">
      <div className="slide-header">
        <h1 className="slide-title">My Total Volume</h1>
      </div>

      <div className="slide-content">
        <div className="big-number">{currencySymbol}{formatVolume(data.totalVolume)}{currencyDisplay ? ' ' + currencyDisplay : ''}</div>
        <div className="highlight-section">
          <div className="highlight-value">
            <span className="detail">You traded <strong>{currencySymbol}{formatVolume(data.totalVolume)}{currencyDisplay ? ' ' + currencyDisplay : ''}</strong> worth of tokens this year</span>
          </div>
        </div>
      </div>
    </div>
  );
};
