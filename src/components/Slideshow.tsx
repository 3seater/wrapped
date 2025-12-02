import React, { useState, useEffect } from 'react';
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

  const currentSlide = slides[currentSlideIndex];
  const SlideComponent = currentSlide.component;

  return (
    <div
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
