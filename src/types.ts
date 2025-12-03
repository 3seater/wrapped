import type { ComponentType } from 'react';

export interface Trade {
  id: string;
  coin: string;
  amount: number;
  price: number;
  timestamp: Date;
  type: 'buy' | 'sell';
  pnl?: number;
}

export interface TradingData {
  walletAddress: string;
  totalTrades: number; // Number of unique tokens traded
  totalVolume: number;
  currency: 'SOL' | 'USD'; // USD for EVM chains (aggregated)
  chains?: string[]; // Which chains were analyzed (e.g., ['eth-mainnet', 'bsc-mainnet', 'base-mainnet'])
  winrate: number; // Winrate as a percentage (0-100)
  medianHoldTime: number; // Median hold time in seconds
  biggestLosses: Array<{
    coin: string;
    loss: number;
    date: Date;
    chain?: string; // Which chain this loss occurred on
    imageUrl?: string; // Token image URL
    mintAddress?: string; // Token mint address for image fetching
  }>;
  biggestWins: Array<{
    coin: string;
    profit: number;
    date: Date;
    chain?: string; // Which chain this win occurred on
    imageUrl?: string; // Token image URL
    mintAddress?: string; // Token mint address for image fetching
  }>;
  paperhands: Array<{
    coin: string;
    soldAt: number;
    athPrice: number;
    potentialProfit: number;
    chain?: string; // Which chain this occurred on
  }>;
  totalPnL: number; // Always in USD (converted from SOL for Solana chains)
  biggestTradingDay: {
    date: string;
    trades: number;
  };
  highestPnLDay: {
    date: string;
    pnl: number;
  };
}

export interface SlideData {
  id: string;
  title: string;
  subtitle?: string;
  backgroundColor: string;
  textColor: 'black' | 'white';
  backgroundImage?: string; // Optional background PNG filename
  component: ComponentType<{ data?: TradingData; onRestart?: () => void }>;
}
