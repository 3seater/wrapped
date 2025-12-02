import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { TradingData, SlideData } from '../types';

// Import background SVG images
import floralBg from '../assets/background/Floral.svg';
import greenWiggleBg from '../assets/background/GREEN_WIGGLE2 1.svg';
import lavenderPixelBg from '../assets/background/LAVENDER_PIXEL.svg';
import redPixelBg from '../assets/background/RED_PIXEL.svg';
import greenShapeBg from '../assets/background/GREEN_SHAPE2.svg';
import silverWiggleBg from '../assets/background/SILVER_WIGGLE2 1.svg';
import graphicsBg from '../assets/background/Graphics 1.svg';
import redPixelBg2 from '../assets/background/Red-Pixel.svg';

// Map image names to imported assets
const backgroundImageMap: Record<string, string> = {
  'Floral.svg': floralBg,
  'GREEN_WIGGLE2 1.svg': greenWiggleBg,
  'LAVENDER_PIXEL.svg': lavenderPixelBg,
  'RED_PIXEL.svg': redPixelBg,
  'GREEN_SHAPE2.svg': greenShapeBg,
  'SILVER_WIGGLE2 1.svg': silverWiggleBg,
  'Graphics 1.svg': graphicsBg,
  'Red-Pixel.svg': redPixelBg2,
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

  const shareToTwitter = async () => {
    if (!slideRef.current) return;
    
    setIsCapturing(true);
    
    try {
      // Capture the slide as a canvas
      const canvas = await html2canvas(slideRef.current, {
        backgroundColor: currentSlide.backgroundColor,
        scale: 2, // Higher quality
        logging: false,
        useCORS: true
      });
      
      // Convert to blob
      canvas.toBlob((blob) => {
        if (!blob) return;
        
        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `crypto-wrapped-${currentSlide.id}.png`;
        link.href = url;
        link.click();
        
        // Clean up
        URL.revokeObjectURL(url);
        
        // Generate tweet text based on slide
        let tweetText = '';
        
        switch (currentSlide.id) {
          case 'trades-made':
            tweetText = `I made ${data.totalTrades.toLocaleString()} trades this year! 📊 #CryptoWrapped`;
            break;
          case 'total-volume':
            tweetText = `Total trading volume: ${data.totalVolume.toLocaleString()} ${data.currency}! 💰 #CryptoWrapped`;
            break;
          case 'biggest-wins':
            tweetText = `My biggest win: ${data.biggestWins[0]?.coin || 'N/A'} 🚀 #CryptoWrapped`;
            break;
          case 'biggest-losses':
            tweetText = `Lessons learned from my trades 📚 #CryptoWrapped`;
            break;
          case 'total-pnl':
            const pnlSign = data.totalPnL >= 0 ? '+' : '';
            tweetText = `My 2024 Crypto Wrapped: ${pnlSign}$${Math.abs(data.totalPnL).toLocaleString()} PnL 🎯 #CryptoWrapped`;
            break;
          default:
            tweetText = `Check out my Crypto Wrapped! #CryptoWrapped`;
        }
        
        // Open Twitter with pre-filled text
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
        window.open(twitterUrl, '_blank');
        
      }, 'image/png');
      
    } catch (error) {
      console.error('Error capturing slide:', error);
      alert('Failed to capture slide. Please try again.');
    } finally {
      setIsCapturing(false);
    }
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

  const currentSlide = slides[currentSlideIndex];
  const SlideComponent = currentSlide.component;

  return (
    <div
      ref={slideRef}
      className="slide-container"
      style={{
        backgroundColor: currentSlide.backgroundColor,
        color: currentSlide.textColor
      }}
    >
      {/* Background decorative images */}
      {currentSlide.backgroundImage && (
        <div 
          className="slide-background-image"
          style={{
            backgroundImage: `url(${getBackgroundImageUrl(currentSlide.backgroundImage)})`,
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1,
            opacity: 0.9,
            pointerEvents: 'none'
          }}
        />
      )}
      
      {/* Share Button */}
      <button
        className="share-btn"
        onClick={shareToTwitter}
        disabled={isCapturing}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          zIndex: 10,
          background: currentSlide.textColor === 'white' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
          color: currentSlide.textColor,
          border: `2px solid ${currentSlide.textColor}`,
          padding: '10px 20px',
          borderRadius: '25px',
          cursor: isCapturing ? 'not-allowed' : 'pointer',
          fontFamily: 'Spotify Mix, sans-serif',
          fontWeight: 'bold',
          fontSize: '14px',
          transition: 'all 0.2s ease',
          opacity: isCapturing ? 0.5 : 1
        }}
        onMouseEnter={(e) => {
          if (!isCapturing) {
            e.currentTarget.style.background = currentSlide.textColor === 'white' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = currentSlide.textColor === 'white' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)';
        }}
      >
        {isCapturing ? 'Capturing...' : '𝕏 Share'}
      </button>
      
      <div className="slide-content">
        <SlideComponent data={data} />
      </div>

      {/* Navigation */}
      <div className="slide-navigation">
        <button
          className="nav-btn prev-btn"
          onClick={prevSlide}
          disabled={currentSlideIndex === 0}
          style={{ color: currentSlide.textColor }}
        >
          ‹
        </button>

        <div className="slide-indicators">
          {slides.map((_, index) => (
            <button
              key={index}
              className={`indicator ${index === currentSlideIndex ? 'active' : ''}`}
              onClick={() => goToSlide(index)}
              style={{
                backgroundColor: index === currentSlideIndex ? currentSlide.textColor : 'rgba(255,255,255,0.3)'
              }}
            />
          ))}
        </div>

        <button
          className="nav-btn next-btn"
          onClick={nextSlide}
          disabled={currentSlideIndex === slides.length - 1}
          style={{ color: currentSlide.textColor }}
        >
          ›
        </button>
      </div>

      {/* Progress bar */}
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{
            width: `${((currentSlideIndex + 1) / slides.length) * 100}%`,
            backgroundColor: currentSlide.textColor
          }}
        />
      </div>

      {/* Restart button (only show on last slide) */}
      {currentSlideIndex === slides.length - 1 && (
        <button
          className="restart-btn"
          onClick={onRestart}
          style={{
            color: currentSlide.textColor,
            borderColor: currentSlide.textColor
          }}
        >
          Create Another Wrapped
        </button>
      )}
    </div>
  );
};
