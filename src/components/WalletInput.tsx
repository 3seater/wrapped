import { useState } from 'react';
import floralBg from '../assets/background/Floral.svg';

interface WalletInputProps {
  onWalletSubmit: (wallet: string, network: 'solana' | 'evm') => void;
}

export const WalletInput: React.FC<WalletInputProps> = ({ onWalletSubmit }) => {
  const [walletAddress, setWalletAddress] = useState('');
  const [network, setNetwork] = useState<'solana' | 'evm'>('solana');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress.trim()) return;

    setIsLoading(true);
    try {
      await onWalletSubmit(walletAddress.trim(), network);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="wallet-input-container">
      <div 
        className="wallet-input-bg-decoration"
        style={{
          backgroundImage: `url(${floralBg})`
        }}
      />
      <div className="wallet-input-content">
        <h1 className="wallet-title">Trenches Wrapped</h1>
        <p className="wallet-subtitle">Your 2024 Trading Recap</p>

        <form onSubmit={handleSubmit} className="wallet-form">
          <div className="network-selector">
            <button
              type="button"
              className={`network-btn ${network === 'solana' ? 'active' : ''}`}
              onClick={() => setNetwork('solana')}
            >
              Solana
            </button>
            <button
              type="button"
              className={`network-btn ${network === 'evm' ? 'active' : ''}`}
              onClick={() => setNetwork('evm')}
            >
              EVM
            </button>
          </div>

          <div className="input-group">
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder={network === 'evm' ? 'Enter your EVM wallet address' : 'Enter your Solana wallet address'}
              className="wallet-input"
              disabled={isLoading}
            />
            <button
              type="submit"
              className="submit-btn"
              disabled={!walletAddress.trim() || isLoading}
            >
              {isLoading ? 'Loading...' : 'Get My Wrapped'}
            </button>
          </div>
        </form>

        <div className="disclaimer">
          <p>We analyze your trading activity to create your personalized recap.</p>
          <p>Your wallet address is never stored and all data is processed client-side.</p>
        </div>
      </div>
    </div>
  );
};
