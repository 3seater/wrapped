import { useState } from 'react';
import longLogo from '../assets/logos/long logo.png';

interface WalletInputProps {
  onWalletSubmit: (wallet: string, network: 'solana' | 'evm') => void;
}

export const WalletInput: React.FC<WalletInputProps> = ({ onWalletSubmit }) => {
  const [walletAddress, setWalletAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress.trim()) return;

    setIsLoading(true);
    try {
      await onWalletSubmit(walletAddress.trim(), 'solana');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="wallet-input-container">
      <div className="wallet-input-content">
        <img 
          src={longLogo} 
          alt="Trenches Wrapped" 
          className="wallet-logo"
          style={{
            maxWidth: '100%',
            height: 'auto',
            marginBottom: '3rem'
          }}
        />

        <form onSubmit={handleSubmit} className="wallet-form">
          <div className="input-group">
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder="Enter your Solana wallet address"
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
      </div>
    </div>
  );
};
