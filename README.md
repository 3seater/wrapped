# Trenches Wrapped 🎵📈

A Spotify Wrapped-inspired recap for memecoin traders on Solana and Ethereum. Show off your 2024 trading journey with style!

## Features

- **Wallet Input**: Support for both Solana and Ethereum wallets
- **6 Recap Slides**: Just like Spotify Wrapped, showcasing your trading year
- **Slideshow Navigation**: Click through or use arrow keys/spacebar
- **Responsive Design**: Works on desktop and mobile
- **Spotify-Inspired UI**: Clean, modern design with the signature color scheme

## Slides

1. **Trades Made** - Total trades with biggest trading day
2. **Total Volume** - Trading volume in SOL/ETH
3. **Biggest Losses** - Top 5 losing trades
4. **Biggest Wins** - Top 5 profitable trades
5. **Paperhands** - Coins sold early vs. their ATH potential
6. **Total PnL** - Overall profit/loss with highest PnL day

## Color Scheme

- Yellow: #FEF102
- Red: #E91B03
- Blue: #00adf1
- Black: #000000 (with white text)

## Tech Stack

- **React 18** with TypeScript
- **Vite** for build tooling
- **CSS** for styling (Spotify Mix font placeholder)

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd trenches-wrapped
```

2. Install dependencies
```bash
npm install
```

3. Start development server
```bash
npm run dev
```

4. Open [http://localhost:5173](http://localhost:5173) in your browser

### Build for Production

```bash
npm run build
```

## API Integration (Coming Soon)

Currently using mock data. Will integrate with:

- **Helius** (Solana transactions)
- **Covalent** (Cross-chain data)
- **CoinGecko** (Price data)

See `API_RESEARCH.md` for detailed research.

## Font Setup

The app uses "Spotify Mix Bold" font. Replace the font import in `src/index.css` when you have the font file:

```css
@font-face {
  font-family: 'Spotify Mix';
  src: url('/fonts/SpotifyMix-Bold.woff2') format('woff2');
  font-weight: bold;
}
```

## Project Structure

```
src/
├── components/
│   ├── slides/
│   │   ├── TradesMadeSlide.tsx
│   │   ├── TotalVolumeSlide.tsx
│   │   ├── BiggestLossesSlide.tsx
│   │   ├── BiggestWinsSlide.tsx
│   │   ├── PaperhandsSlide.tsx
│   │   └── TotalPnLSlide.tsx
│   ├── WalletInput.tsx
│   ├── Slideshow.tsx
│   └── index.ts
├── types.ts
├── mockData.ts
├── App.tsx
├── App.css
└── index.css
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Acknowledgments

- Inspired by Spotify Wrapped
- Built for the crypto trading community
- Thanks to all the degens in the trenches! 🚀