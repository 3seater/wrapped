import { TradingData, SlideData } from './types';
import { CoinsTradedSlide } from './components/slides/CoinsTradedSlide';
import { TotalVolumeSlide } from './components/slides/TotalVolumeSlide';
import { WinrateSlide } from './components/slides/WinrateSlide';
import { MedianHoldTimeSlide } from './components/slides/MedianHoldTimeSlide';
import { TopTradeSlide } from './components/slides/TopTradeSlide';
import { TopTradesListSlide } from './components/slides/TopTradesListSlide';
import { WorstTradeSlide } from './components/slides/WorstTradeSlide';
import { CreateAnotherSlide } from './components/slides/CreateAnotherSlide';

export const mockTradingData: TradingData = {
  walletAddress: '7xKXtg2CW87Zd1rPjDL1kQe2g7pQqVzKPQ4tKdQH3P',
  totalTrades: 1247,
  totalVolume: 250000,
  currency: 'SOL',
  winrate: 65.5,
  medianHoldTime: 45, // 45 seconds
  biggestLosses: [
    { coin: 'BONK', loss: -5000, date: new Date('2024-03-15') },
    { coin: 'PEPE', loss: -3200, date: new Date('2024-05-22') },
    { coin: 'SHIB', loss: -2800, date: new Date('2024-07-08') },
    { coin: 'FLOKI', loss: -2100, date: new Date('2024-09-12') },
    { coin: 'WIF', loss: -1800, date: new Date('2024-11-03') },
  ],
  biggestWins: [
    { coin: 'BONK', profit: 15000, date: new Date('2024-01-20') },
    { coin: 'WIF', profit: 12500, date: new Date('2024-02-14') },
    { coin: 'MEW', profit: 9800, date: new Date('2024-04-18') },
    { coin: 'POPCAT', profit: 8700, date: new Date('2024-06-25') },
    { coin: 'BRETT', profit: 7200, date: new Date('2024-08-30') },
  ],
  paperhands: [
    { coin: 'BONK', soldAt: 0.000012, athPrice: 0.000045, potentialProfit: 8500 },
    { coin: 'PEPE', soldAt: 0.0000012, athPrice: 0.0000045, potentialProfit: 6200 },
    { coin: 'FLOKI', soldAt: 0.000035, athPrice: 0.000089, potentialProfit: 4800 },
  ],
  totalPnL: 25600,
  biggestTradingDay: {
    date: 'September 24th',
    trades: 156
  },
  highestPnLDay: {
    date: 'September 24th',
    pnl: 3200
  }
};

// Use all 10 PNG backgrounds (1080x1920) from backgrounds folder
// Cycle through them and assign text colors (white or black based on background)
const backgroundImages = [
  { bg: '#000000', text: 'white' as const, bgImage: '1.png' },
  { bg: '#000000', text: 'white' as const, bgImage: '2.png' },
  { bg: '#000000', text: 'white' as const, bgImage: '3.png' },
  { bg: '#000000', text: 'white' as const, bgImage: '4.png' },
  { bg: '#000000', text: 'white' as const, bgImage: '5.png' },
  { bg: '#000000', text: 'white' as const, bgImage: '6.png' },
  { bg: '#000000', text: 'white' as const, bgImage: '7.png' },
  { bg: '#000000', text: 'white' as const, bgImage: '8.png' },
  { bg: '#000000', text: 'white' as const, bgImage: '9.png' },
  { bg: '#000000', text: 'white' as const, bgImage: '10.png' },
];

// Function to generate slides cycling through all 10 backgrounds
const generateSlides = (): SlideData[] => {
  // Shuffle backgrounds to ensure variety
  const shuffled = [...backgroundImages].sort(() => Math.random() - 0.5);
  let bgIndex = 0;
  
  const getNextBackground = () => {
    const bg = shuffled[bgIndex % shuffled.length];
    bgIndex++;
    const result = { 
      backgroundColor: bg.bg, 
      textColor: bg.text,
      backgroundImage: bg.bgImage
    };
    console.log(`Slide: bg=${bg.bg}, text=${bg.text}, bgImage=${bg.bgImage}`);
    return result;
  };

  return [
    {
      id: 'coins-traded',
      title: 'Coins Traded',
      ...getNextBackground(),
      component: CoinsTradedSlide
    },
    {
      id: 'total-volume',
      title: 'Total Volume',
      ...getNextBackground(),
      component: TotalVolumeSlide
    },
    {
      id: 'winrate',
      title: 'Winrate',
      ...getNextBackground(),
      component: WinrateSlide
    },
    {
      id: 'median-hold-time',
      title: 'Median Hold Time',
      ...getNextBackground(),
      component: MedianHoldTimeSlide
    },
    {
      id: 'top-trade',
      title: 'Top Trade',
      ...getNextBackground(),
      component: TopTradeSlide
    },
    {
      id: 'top-trades-list',
      title: 'Top Trades',
      ...getNextBackground(),
      component: TopTradesListSlide
    },
    {
      id: 'worst-trade',
      title: 'Worst Trade',
      ...getNextBackground(),
      component: WorstTradeSlide
    },
    {
      id: 'create-another',
      title: 'Create Another Wrapped',
      ...getNextBackground(),
      component: CreateAnotherSlide
    }
  ];
};

export const slides: SlideData[] = generateSlides();
