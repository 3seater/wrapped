import React from 'react';
import { TradingData } from '../../types';

interface TotalVolumeSlideProps {
  data?: TradingData;
}

export const TotalVolumeSlide: React.FC<TotalVolumeSlideProps> = ({ data }) => {
  if (!data) return null;
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="slide total-volume-slide">
      <div className="slide-content-inner">
        <h1 className="slide-title">Your total Volume was</h1>
        <div className="highlight-value">{formatCurrency(data.totalVolume)}</div>
      </div>
    </div>
  );
};
