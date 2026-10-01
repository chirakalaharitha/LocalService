import React from 'react';
import { Link } from 'react-router-dom';

const LocalFixLogo = ({
  size = 'md', // 'sm' | 'md' | 'lg'
  variant = 'default', // 'default' | 'light' | 'dark'
  light = false,
  showTagline = false,
  to = '/',
  onClick
}) => {
  const isLight = light || variant === 'light';

  const iconDimensions = {
    sm: { box: 'w-8 h-8', svgSize: 32 },
    md: { box: 'w-10 h-10', svgSize: 40 },
    lg: { box: 'w-12 h-12', svgSize: 48 }
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl sm:text-2xl',
    lg: 'text-2xl sm:text-3xl'
  };

  const currentDim = iconDimensions[size] || iconDimensions.md;

  const content = (
    <div className="flex flex-col">
      <div className="flex items-center gap-2.5 select-none group">
        {/* Custom LocalFix Circular Brand Badge */}
        <div
          className={`${currentDim.box} shrink-0 rounded-full flex items-center justify-center transition-transform duration-200 group-hover:scale-105 shadow-sm`}
        >
          <svg
            viewBox="0 0 44 44"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full"
          >
            {/* Circular White Disk */}
            <circle cx="22" cy="22" r="21" fill="#FFFFFF" stroke={isLight ? "transparent" : "#EDE4EB"} strokeWidth="1.2" />
            
            {/* Top Coral Civic Node */}
            <circle cx="22" cy="13.5" r="5.2" fill="#C65F63" />
            <circle cx="22" cy="13.5" r="1.8" fill="#FFFFFF" fillOpacity="0.85" />
            
            {/* Lower Plum Sprout / Cupped Petals Shape */}
            <path
              d="M22 35.5 C19.8 33.8 12.8 29.5 11.8 21.2 C11.3 17.5 14 16.5 15.5 18.5 C17.8 21.6 20.2 25.5 22 26.5 C23.8 25.5 26.2 21.6 28.5 18.5 C30 16.5 32.7 17.5 32.2 21.2 C31.2 29.5 24.2 33.8 22 35.5 Z"
              fill="#4E3150"
            />
          </svg>
        </div>

        {/* Brand Wordmark */}
        <span
          className={`font-black tracking-tight ${textSizes[size] || textSizes.md} ${
            isLight ? 'text-white' : 'text-[#402A40]'
          }`}
        >
          Local<span className="text-[#C65F63]">Fix</span>
        </span>
      </div>

      {showTagline && (
        <span
          className={`text-[11px] font-semibold tracking-wide mt-0.5 ${
            isLight ? 'text-[#E8D7E6]' : 'text-[#6B4E71]/90'
          }`}
        >
          Stronger Communities • Cleaner Cities • A Better Tomorrow
        </span>
      )}
    </div>
  );

  if (to) {
    return (
      <Link to={to} onClick={onClick} className="inline-flex items-center">
        {content}
      </Link>
    );
  }

  return <div onClick={onClick} className="inline-flex items-center cursor-pointer">{content}</div>;
};

export default LocalFixLogo;
