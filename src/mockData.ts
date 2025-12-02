import { TradingData, SlideData } from './types';
import { TradesMadeSlide } from './components/slides/TradesMadeSlide';
import { TotalVolumeSlide } from './components/slides/TotalVolumeSlide';
import { BiggestLossesSlide } from './components/slides/BiggestLossesSlide';
import { BiggestWinsSlide } from './components/slides/BiggestWinsSlide';
import { PaperhandsSlide } from './components/slides/PaperhandsSlide';
import { TotalPnLSlide } from './components/slides/TotalPnLSlide';

export const mockTradingData: TradingData = {
  walletAddress: '7xKXtg2CW87Zd1rPjDL1kQe2g7pQqVzKPQ4tKdQH3P',
  totalTrades: 1247,
  totalVolume: 250000,
  currency: 'SOL',
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

// Spotify Wrapped 2023 exact color palette from brand kit
// Colors: FF5B49 (coral red), 400073 (deep purple), AFB1FF (lavender), 16D0A6 (teal), 000000 (black)
// All 8 background assets included to ensure each is used at least once
const backgroundColors = [
  { bg: '#FF5B49', text: 'black' as const, bgImage: 'Floral.svg' }, // Coral red with floral
  { bg: '#16D0A6', text: 'black' as const, bgImage: 'GREEN_WIGGLE2 1.svg' }, // Teal with green wiggle
  { bg: '#400073', text: 'white' as const, bgImage: 'LAVENDER_PIXEL.svg' }, // Deep purple with lavender pixel
  { bg: '#AFB1FF', text: 'black' as const, bgImage: 'RED_PIXEL.svg' }, // Lavender with red pixel
  { bg: '#000000', text: 'white' as const, bgImage: 'GREEN_SHAPE2.svg' }, // Black with green shape
  { bg: '#FF5B49', text: 'black' as const, bgImage: 'SILVER_WIGGLE2 1.svg' }, // Coral red with silver wiggle
  { bg: '#16D0A6', text: 'black' as const, bgImage: 'Graphics 1.svg' }, // Teal with graphics
  { bg: '#400073', text: 'white' as const, bgImage: 'Red-Pixel.svg' }, // Deep purple with red-pixel
];

// Function to generate slides ensuring all background assets are used at least once
const generateSlides = (): SlideData[] => {
  // Shuffle colors to ensure variety - all 8 assets are in backgroundColors array
  const shuffled = [...backgroundColors].sort(() => Math.random() - 0.5);
  let colorIndex = 0;
  
  const getNextColor = () => {
    const color = shuffled[colorIndex % shuffled.length];
    colorIndex++;
    const result = { 
      backgroundColor: color.bg, 
      textColor: color.text,
      backgroundImage: color.bgImage
    };
    console.log(`Slide: bg=${color.bg}, text=${color.text}, bgImage=${color.bgImage}`);
    return result;
  };

  return [
    {
      id: 'trades-made',
      title: 'Trades Made',
      ...getNextColor(),
      component: TradesMadeSlide
    },
    {
      id: 'total-volume',
      title: 'Total Volume',
      ...getNextColor(),
      component: TotalVolumeSlide
    },
    {
      id: 'biggest-losses',
      title: 'Biggest Losses',
      ...getNextColor(),
      component: BiggestLossesSlide
    },
    {
      id: 'biggest-wins',
      title: 'Biggest Wins',
      ...getNextColor(),
      component: BiggestWinsSlide
    },
    {
      id: 'paperhands',
      title: 'Paperhands',
      ...getNextColor(),
      component: PaperhandsSlide
    },
    {
      id: 'total-pnl',
      title: 'Total PnL',
      ...getNextColor(),
      component: TotalPnLSlide
    }
  ];
};

export const slides: SlideData[] = generateSlides();
