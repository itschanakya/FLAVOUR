import React from 'react';

export default function TricolorSpinner({ size = 'h-16 w-16' }) {
  return (
    <div className={`relative ${size} flex items-center justify-center`}>
      {/* Outer Orange Clockwise */}
      <div className="absolute inset-0 rounded-full border-[4px] border-[#FF9933] border-t-transparent animate-spin"></div>
      
      {/* Middle White Still */}
      <div className="absolute inset-2 rounded-full border-[4px] border-white shadow-[0_0_8px_rgba(0,0,0,0.1)]"></div>
      
      {/* Inner Green Anti-clockwise */}
      <div 
        className="absolute inset-4 rounded-full border-[4px] border-[#138808] border-b-transparent animate-spin"
        style={{ animationDirection: 'reverse' }}
      ></div>
    </div>
  );
}
