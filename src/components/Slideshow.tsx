import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { TradingData, SlideData } from '../types';

// Import background PNG images (1080x1920)
import bg1 from '../assets/backgrounds/1.png';
import bg2 from '../assets/backgrounds/2.png';
import bg3 from '../assets/backgrounds/3.png';
import bg4 from '../assets/backgrounds/4.png';
import bg5 from '../assets/backgrounds/5.png';
import bg6 from '../assets/backgrounds/6.png';
import bg7 from '../assets/backgrounds/7.png';
import bg8 from '../assets/backgrounds/8.png';
import bg9 from '../assets/backgrounds/9.png';
import bg10 from '../assets/backgrounds/10.png';

// Import icons
import xIcon from '../assets/icons/x.png';

// Map image names to imported assets
const backgroundImageMap: Record<string, string> = {
  '1.png': bg1,
  '2.png': bg2,
  '3.png': bg3,
  '4.png': bg4,
  '5.png': bg5,
  '6.png': bg6,
  '7.png': bg7,
  '8.png': bg8,
  '9.png': bg9,
  '10.png': bg10,
};

// Helper to get background image URL
const getBackgroundImageUrl = (imageName: string): string => {
  return backgroundImageMap[imageName] || '';
};

interface SlideshowProps {
  data: TradingData;
  slides: SlideData[];
  onRestart: () => void;
}

export const Slideshow: React.FC<SlideshowProps> = ({ data, slides, onRestart }) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const slideRef = useRef<HTMLDivElement>(null);

  const nextSlide = () => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    }
  };

  const goToSlide = (index: number) => {
    setCurrentSlideIndex(index);
  };


  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        nextSlide();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevSlide();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentSlideIndex]);

  const copyImage = async () => {
    if (!slideRef.current) return;
    
    setIsCapturing(true);
    
    try {
      const canvas = await html2canvas(slideRef.current, {
        backgroundColor: currentSlide.backgroundColor,
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        ignoreElements: (element) => {
          return element.classList.contains('share-btn') ||
                 element.classList.contains('download-btn') ||
                 element.classList.contains('slide-navigation') ||
                 element.classList.contains('progress-bar') ||
                 element.classList.contains('restart-btn');
        }
      });
      
      canvas.toBlob((blob) => {
        if (!blob) return;
        
        // Copy to clipboard
        const item = new ClipboardItem({ 'image/png': blob });
        navigator.clipboard.write([item]).then(() => {
          setToastMessage('📋 Image copied to clipboard!');
          setShowToast(true);
          setTimeout(() => setShowToast(false), 2000);
          setIsCapturing(false);
        }).catch((err) => {
          console.error('Error copying to clipboard:', err);
          // Fallback to download if clipboard fails
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = `wrapped-${currentSlide.id}-${Date.now()}.png`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
          setToastMessage('📥 Image downloaded!');
          setShowToast(true);
          setTimeout(() => setShowToast(false), 2000);
          setIsCapturing(false);
        });
      }, 'image/png');
    } catch (error) {
      console.error('Error copying image:', error);
      setIsCapturing(false);
    }
  };

  const shareToTwitterDirect = async () => {
    if (!slideRef.current) return;
    
    setIsCapturing(true);
    
    try {
      const canvas = await html2canvas(slideRef.current, {
        backgroundColor: currentSlide.backgroundColor,
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        ignoreElements: (element) => {
          return element.classList.contains('share-btn') ||
                 element.classList.contains('download-btn') ||
                 element.classList.contains('slide-navigation') ||
                 element.classList.contains('progress-bar') ||
                 element.classList.contains('restart-btn');
        }
      });
      
      canvas.toBlob((blob) => {
        if (!blob) return;
        
        // Generate tweet text
        let tweetText = '';
        switch (currentSlide.id) {
          case 'coins-traded':
            tweetText = `I traded ${data.totalTrades.toLocaleString()} coins this year! 🚀`;
            break;
          case 'total-volume':
            tweetText = `My total trading volume: $${data.totalVolume.toLocaleString()} 💰`;
            break;
          case 'winrate':
            tweetText = `My winrate: ${Math.round(data.winrate)}% 📈`;
            break;
          case 'median-hold-time':
            const holdTime = data.medianHoldTime < 60 
              ? `${Math.round(data.medianHoldTime)} seconds`
              : `${Math.round(data.medianHoldTime / 60)} minutes`;
            tweetText = `My median hold time: ${holdTime} ⏱️`;
            break;
          case 'top-trade':
            tweetText = `My top trade: ${data.biggestWins[0]?.coin || 'N/A'} with $${data.biggestWins[0]?.profit.toLocaleString() || '0'} PNL 🎯`;
            break;
          case 'worst-trade':
            tweetText = `My worst trade: ${data.biggestLosses[0]?.coin || 'N/A'} with -$${data.biggestLosses[0]?.loss.toLocaleString() || '0'} PNL 😅`;
            break;
          default:
            tweetText = `Check out my Crypto Wrapped! 🎉`;
        }
        
        // Open Twitter with text
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
        window.open(twitterUrl, '_blank');
        
        // Try to copy image to clipboard for user to paste
        try {
          const item = new ClipboardItem({ 'image/png': blob });
          navigator.clipboard.write([item]).then(() => {
            setToastMessage('✅ Image copied! Paste it in Twitter');
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
          }).catch(() => {
            // Clipboard write failed, just show Twitter opened
          });
        } catch (error) {
          // Clipboard API not available
        }
        
        setIsCapturing(false);
      }, 'image/png');
    } catch (error) {
      console.error('Error sharing to Twitter:', error);
      setIsCapturing(false);
    }
  };

  const currentSlide = slides[currentSlideIndex];
  const SlideComponent = currentSlide.component;

  // Get background image URL for current slide
  const backgroundImageUrl = currentSlide.backgroundImage 
    ? getBackgroundImageUrl(currentSlide.backgroundImage)
    : null;

  // Build background style object
  const cardBackgroundStyle = backgroundImageUrl
    ? {
        backgroundImage: `url(${backgroundImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: currentSlide.backgroundColor // Fallback color
      }
    : {
        backgroundColor: currentSlide.backgroundColor
      };

  return (
    <div
      className="slideshow-wrapper"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        background: '#000'
      }}
    >
      <div
        key={`slide-${currentSlideIndex}`} // Force re-render on slide change
        ref={slideRef}
        className="rounded-card-frame"
        style={{
          width: '390px',
          maxWidth: '100%',
          aspectRatio: '9 / 16', // 1080:1920 = 9:16 - matches your image dimensions
          borderRadius: '24px',
          ...cardBackgroundStyle, // Spread the background style
          color: currentSlide.textColor,
          overflow: 'hidden',
          position: 'relative',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
        }}
      >
        
        <div className="slide-content" style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '2rem',
          paddingBottom: '100px' // Space for buttons
        }}>
          <SlideComponent data={data} onRestart={onRestart} />
        </div>
        
        {/* Download and Share Buttons */}
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '12px',
          zIndex: 10,
          width: 'calc(100% - 40px)',
          maxWidth: '320px'
        }}>
            <button
              className="download-btn"
              onClick={copyImage}
              disabled={isCapturing}
              style={{
                flex: 1,
                background: '#000',
                color: '#fff',
                border: '2px solid #fff',
                padding: '12px 20px',
                borderRadius: '0',
                cursor: isCapturing ? 'not-allowed' : 'pointer',
                fontFamily: 'Spotify Mix, sans-serif',
                fontWeight: 'bold',
                fontSize: '14px',
                transition: 'all 0.2s ease',
                opacity: isCapturing ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              {isCapturing ? '...' : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                  Copy Image
                </>
              )}
            </button>
            <button
              className="share-btn"
              onClick={shareToTwitterDirect}
              disabled={isCapturing}
              style={{
                flex: 1,
                background: '#000',
                color: '#fff',
                border: '2px solid #fff',
                padding: '12px 20px',
                borderRadius: '0',
                cursor: isCapturing ? 'not-allowed' : 'pointer',
                fontFamily: 'Spotify Mix, sans-serif',
                fontWeight: 'bold',
                fontSize: '14px',
                transition: 'all 0.2s ease',
                opacity: isCapturing ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              {isCapturing ? '...' : (
                <>
                  <img 
                    src={xIcon} 
                    alt="X" 
                    style={{ 
                      width: '16px', 
                      height: '16px',
                      filter: 'brightness(0) invert(1)' // Always white on black background
                    }} 
                  />
                  Share
                </>
              )}
            </button>
          </div>
      </div>

      {/* Navigation - Sleek left/right arrows only */}
      <div className="slide-navigation" style={{
        position: 'fixed',
        bottom: '30px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        display: 'flex',
        gap: '20px',
        alignItems: 'center'
      }}>
        <button
          className="nav-btn prev-btn"
          onClick={prevSlide}
          disabled={currentSlideIndex === 0}
          style={{ 
            color: '#fff',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: currentSlideIndex === 0 ? 'not-allowed' : 'pointer',
            opacity: currentSlideIndex === 0 ? 0.3 : 1,
            fontSize: '24px',
            transition: 'all 0.2s ease'
          }}
        >
          ‹
        </button>

        <button
          className="nav-btn next-btn"
          onClick={nextSlide}
          disabled={currentSlideIndex === slides.length - 1}
          style={{ 
            color: '#fff',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: currentSlideIndex === slides.length - 1 ? 'not-allowed' : 'pointer',
            opacity: currentSlideIndex === slides.length - 1 ? 0.3 : 1,
            fontSize: '24px',
            transition: 'all 0.2s ease'
          }}
        >
          ›
        </button>
      </div>



      {/* Toast notification */}
      {showToast && (
        <div
          style={{
            position: 'fixed',
            bottom: '100px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 0, 0, 0.9)',
            color: 'white',
            padding: '16px 32px',
            borderRadius: '25px',
            fontSize: '16px',
            fontWeight: 'bold',
            zIndex: 10000,
            animation: 'fadeInOut 3s ease-in-out',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            fontFamily: 'Spotify Mix, sans-serif'
          }}
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
};
