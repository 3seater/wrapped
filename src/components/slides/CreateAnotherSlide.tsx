import React from 'react';

interface CreateAnotherSlideProps {
  onRestart?: () => void;
}

export const CreateAnotherSlide: React.FC<CreateAnotherSlideProps> = ({ onRestart }) => {
  if (!onRestart) return null;
  return (
    <div className="slide create-another-slide">
      <div className="slide-content-inner">
        <button
          onClick={onRestart}
          className="create-another-btn"
          style={{
            background: 'transparent',
            border: '2px solid currentColor',
            borderRadius: '0',
            padding: '1.5rem 3rem',
            fontSize: '1.5rem',
            fontFamily: 'Spotify Mix, sans-serif',
            fontWeight: 'bold',
            color: 'inherit',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            textTransform: 'none',
            letterSpacing: '0'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          Create Another Wrapped
        </button>
      </div>
    </div>
  );
};

