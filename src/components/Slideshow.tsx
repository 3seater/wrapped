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
  const [showShareModal, setShowShareModal] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string>('');
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [tweetText, setTweetText] = useState('');
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

  const shareToTwitter = async () => {
    if (!slideRef.current) return;
    
    setIsCapturing(true);
    
    // Track original styles for restoration
    const originalStyles: Array<{ element: HTMLElement; animation: string; opacity: string }> = [];
    
    try {
      // Temporarily remove animation and force full opacity on all elements
      const slideElements = slideRef.current.querySelectorAll('.slide, .detail, .slide-subtitle, .highlight-value, .loss-date, .win-date');
      
      slideElements.forEach(el => {
        const htmlEl = el as HTMLElement;
        // Store original styles
        originalStyles.push({
          element: htmlEl,
          animation: htmlEl.style.animation,
          opacity: htmlEl.style.opacity
        });
        // Force no animation and full opacity
        htmlEl.style.animation = 'none';
        htmlEl.style.opacity = '1';
      });
      
      // Wait a moment for styles to apply
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Capture the slide container with proper settings
      const canvas = await html2canvas(slideRef.current, {
        backgroundColor: currentSlide.backgroundColor,
        scale: 2, // Higher quality (2x resolution)
        logging: false,
        useCORS: true,
        allowTaint: true,
        ignoreElements: (element) => {
          return element.classList.contains('share-btn') ||
                 element.classList.contains('slide-navigation') ||
                 element.classList.contains('progress-bar') ||
                 element.classList.contains('restart-btn');
        }
      });
      
      // Crop to a better aspect ratio (4:5 like Instagram/Twitter optimal)
      const targetWidth = 1080;
      const targetHeight = 1350; // 4:5 ratio
      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = targetWidth;
      cropCanvas.height = targetHeight;
      const ctx = cropCanvas.getContext('2d');
      
      if (ctx) {
        // Calculate crop area (center crop)
        const scale = Math.max(targetWidth / canvas.width, targetHeight / canvas.height);
        const scaledWidth = canvas.width * scale;
        const scaledHeight = canvas.height * scale;
        const x = (targetWidth - scaledWidth) / 2;
        const y = (targetHeight - scaledHeight) / 2;
        
        ctx.fillStyle = currentSlide.backgroundColor;
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        ctx.drawImage(canvas, x, y, scaledWidth, scaledHeight);
      }
      
      // Use the cropped canvas
      const finalCanvas = cropCanvas;
      
      // Convert to blob and data URL
      finalCanvas.toBlob(async (blob) => {
        if (!blob) return;
        
        // Create data URL for preview
        const dataUrl = finalCanvas.toDataURL('image/png');
        
        // Generate tweet text based on slide
        let generatedTweetText = '';
        
        switch (currentSlide.id) {
          case 'trades-made':
            generatedTweetText = `I made ${data.totalTrades.toLocaleString()} trades this year!\n\nPowered by @trencheswrapped`;
            break;
          case 'total-volume':
            generatedTweetText = `Total trading volume: ${data.totalVolume.toLocaleString()} ${data.currency}!\n\nPowered by @trencheswrapped`;
            break;
          case 'biggest-wins':
            generatedTweetText = `My biggest win: ${data.biggestWins[0]?.coin || 'N/A'}\n\nPowered by @trencheswrapped`;
            break;
          case 'biggest-losses':
            generatedTweetText = `Lessons learned from my trades\n\nPowered by @trencheswrapped`;
            break;
          case 'total-pnl':
            const pnlSign = data.totalPnL >= 0 ? '+' : '';
            generatedTweetText = `My 2024 Crypto Wrapped: ${pnlSign}$${Math.abs(data.totalPnL).toLocaleString()} PnL\n\nPowered by @trencheswrapped`;
            break;
          default:
            generatedTweetText = `Check out my Crypto Wrapped!\n\nPowered by @trencheswrapped`;
        }
        
        // Restore original styles
        originalStyles.forEach(({ element, animation, opacity }) => {
          element.style.animation = animation;
          element.style.opacity = opacity;
        });
        
        // Store image and text, show modal
        setCapturedImage(dataUrl);
        setCapturedBlob(blob);
        setTweetText(generatedTweetText);
        setShowShareModal(true);
        setIsCapturing(false);
        
      }, 'image/png');
      
    } catch (error) {
      console.error('Error capturing slide:', error);
      alert('Failed to capture slide. Please try again.');
      setIsCapturing(false);
      
      // Restore original styles on error too
      originalStyles.forEach(({ element, animation, opacity }) => {
        element.style.animation = animation;
        element.style.opacity = opacity;
      });
    }
  };

  const copyImage = async () => {
    if (!capturedBlob) return;
    
    try {
      const item = new ClipboardItem({ 'image/png': capturedBlob });
      await navigator.clipboard.write([item]);
      setToastMessage('✅ Image copied to clipboard!');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch (error) {
      console.error('Failed to copy image:', error);
      // Fallback: download the image
      const url = URL.createObjectURL(capturedBlob);
      const link = document.createElement('a');
      link.download = `crypto-wrapped-${currentSlide.id}.png`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      setToastMessage('📥 Image downloaded!');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    }
  };

  const openTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(twitterUrl, '_blank');
    setShowShareModal(false);
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

      {/* Share Modal - Spotify Wrapped Themed */}
      {showShareModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
            backdropFilter: 'blur(10px)'
          }}
          onClick={() => setShowShareModal(false)}
        >
          <div
            style={{
              background: '#FF5B49',
              borderRadius: '0',
              padding: '48px 40px',
              maxWidth: '500px',
              width: '100%',
              position: 'relative',
              border: '4px solid #000'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setShowShareModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: '#000',
                border: 'none',
                width: '40px',
                height: '40px',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#FF5B49',
                padding: '0',
                lineHeight: 1,
                fontWeight: 'bold'
              }}
            >
              ×
            </button>

            <h2 style={{
              fontFamily: 'Spotify Mix, sans-serif',
              fontSize: '36px',
              fontWeight: 'bold',
              marginBottom: '8px',
              color: '#000',
              textAlign: 'center',
              letterSpacing: '-1px'
            }}>
              Share Your Wrapped
            </h2>

            <p style={{
              fontFamily: 'Spotify Mix, sans-serif',
              fontSize: '16px',
              color: '#000',
              textAlign: 'center',
              marginBottom: '32px',
              opacity: 0.8
            }}>
              to 𝕏
            </p>

            {/* Image preview */}
            <div style={{
              width: '100%',
              overflow: 'hidden',
              marginBottom: '32px',
              border: '4px solid #000',
              background: '#000'
            }}>
              <img
                src={capturedImage}
                alt="Your Wrapped"
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block'
                }}
              />
            </div>

            {/* Action buttons */}
            <div style={{
              display: 'flex',
              gap: '16px',
              flexDirection: 'column'
            }}>
              <button
                onClick={copyImage}
                style={{
                  background: '#000',
                  color: '#FF5B49',
                  border: '4px solid #000',
                  padding: '20px',
                  borderRadius: '0',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontFamily: 'Spotify Mix, sans-serif',
                  transition: 'all 0.2s ease',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#000';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#000';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                1. Copy Image
              </button>

              <button
                onClick={openTwitter}
                style={{
                  background: '#000',
                  color: '#FF5B49',
                  border: '4px solid #000',
                  padding: '20px',
                  borderRadius: '0',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontFamily: 'Spotify Mix, sans-serif',
                  transition: 'all 0.2s ease',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#000';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#000';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                2. Post to 𝕏 (Paste Image)
              </button>
            </div>
          </div>
        </div>
      )}

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
