import { useState } from 'react'
import { WalletInput } from './components/WalletInput'
import { Slideshow } from './components/Slideshow'
import { slides } from './mockData'
import { TradingData } from './types'
import { fetchTradingData } from './services/api'
import './App.css'

function App() {
  const [currentView, setCurrentView] = useState<'wallet' | 'slideshow'>('wallet')
  const [tradingData, setTradingData] = useState<TradingData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleWalletSubmit = async (walletAddress: string, network: 'solana' | 'evm') => {
    setIsLoading(true)
    setError(null)

    try {
      // Try to fetch real data from API
      console.log('Fetching trading data for:', walletAddress, network);
      const data = await fetchTradingData(walletAddress, network)
      console.log('Fetched data:', {
        totalTrades: data.totalTrades,
        totalVolume: data.totalVolume,
        totalPnL: data.totalPnL,
        wins: data.biggestWins.length,
        losses: data.biggestLosses.length
      });
      
      // Check if we got meaningful data
      if (data.totalTrades === 0 && data.totalVolume === 0) {
        throw new Error('No trading activity found for this wallet address.');
      }
      
      setTradingData(data)
      setCurrentView('slideshow')
    } catch (err) {
      console.error('API fetch failed:', err)
      const errorMessage = err instanceof Error ? err.message : 'Could not fetch trading data';
      
      // Show error to user
      setError(errorMessage)
      
      // Don't automatically fall back to mock data - let user see the error
      // They can try again or check their API keys
      setIsLoading(false)
      
      // Optionally, you can still show mock data after a delay or user action
      // For now, we'll just show the error
    }
  }

  const handleRestart = () => {
    setCurrentView('wallet')
    setTradingData(null)
  }

  if (currentView === 'wallet') {
    return (
      <>
        <WalletInput onWalletSubmit={handleWalletSubmit} />
        {isLoading && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            color: 'white',
            fontSize: '1.5rem'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div>Loading your trading data...</div>
              <div style={{ marginTop: '1rem', fontSize: '1rem', opacity: 0.8 }}>
                This may take a moment
              </div>
            </div>
          </div>
        )}
        {error && (
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: '#000',
            color: '#fff',
            padding: '2rem 3rem',
            borderRadius: '0',
            zIndex: 1001,
            maxWidth: '600px',
            width: '90%',
            border: '2px solid #FF5B49',
            textAlign: 'center',
            fontFamily: 'Spotify Mix, sans-serif'
          }}>
            <h2 style={{ 
              fontSize: '1.5rem', 
              fontWeight: 'bold', 
              marginBottom: '1rem',
              color: '#FF5B49'
            }}>
              Setup Required
            </h2>
            <p style={{ 
              fontSize: '1rem', 
              lineHeight: '1.6',
              marginBottom: '1.5rem'
            }}>
              {error.includes('API key') || error.includes('Cielo') ? (
                <>
                  To use this app, you need to configure the Cielo API key:
                  <br /><br />
                  <strong>1. Get your API key from:</strong>
                  <br />
                  <a href="https://cielo.finance/" target="_blank" rel="noopener noreferrer" style={{color: '#FF5B49', textDecoration: 'underline'}}>
                    https://cielo.finance/
                  </a>
                  <br /><br />
                  <strong>2. Add to Netlify:</strong>
                  <br />
                  Go to Netlify Dashboard → Site Settings → Environment Variables
                  <br />
                  Add: <code style={{background: '#FF5B49', padding: '2px 6px'}}>VITE_CIELO_API_KEY</code>
                  <br /><br />
                  <strong>3. Redeploy your site</strong>
                </>
              ) : (
                error
              )}
            </p>
            <button
              onClick={() => setError(null)}
              style={{
                background: '#FF5B49',
                color: '#000',
                border: '2px solid #000',
                padding: '0.75rem 2rem',
                fontSize: '1rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontFamily: 'Spotify Mix, sans-serif'
              }}
            >
              Got it
            </button>
          </div>
        )}
      </>
    )
  }

  if (!tradingData) {
    return null
  }

  return <Slideshow data={tradingData} slides={slides} onRestart={handleRestart} />
}

export default App
