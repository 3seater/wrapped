import { useState } from 'react'
import { WalletInput } from './components/WalletInput'
import { Slideshow } from './components/Slideshow'
import { mockTradingData, slides } from './mockData'
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
      const data = await fetchTradingData(walletAddress, network)
      setTradingData(data)
      setCurrentView('slideshow')
    } catch (err) {
      console.error('API fetch failed, using mock data:', err)
      // Fallback to mock data if API fails
      setError('Could not fetch real data. Showing demo data instead.')
      const data = {
        ...mockTradingData,
        walletAddress,
        currency: network === 'solana' ? 'SOL' as const : 'USD' as const
      }
      setTradingData(data)
      setCurrentView('slideshow')
    } finally {
      setIsLoading(false)
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
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#ff6b6b',
            color: 'white',
            padding: '1rem 2rem',
            borderRadius: '8px',
            zIndex: 1001,
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            {error}
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
