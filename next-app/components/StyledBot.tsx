import React from 'react';

// SVG Illustration of "the styled bot" with tech and analytics icons
const StyledBot: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
    {/* Accessibility: Add role and aria-label for screen readers */}
    <svg
      width="320"
      height="320"
      viewBox="0 0 320 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Illustration of an integrated bot with tech and analytics icons"
    >
      {/* Bot Body */}
      <ellipse cx="160" cy="190" rx="70" ry="90" fill="#e0e7ef" stroke="#6ee7b7" strokeWidth="4" />
      {/* Bot Head */}
      <ellipse cx="160" cy="110" rx="55" ry="50" fill="#a5b4fc" stroke="#6366f1" strokeWidth="4" />
      {/* Eyes */}
      <ellipse cx="140" cy="110" rx="8" ry="12" fill="#fff" />
      <ellipse cx="180" cy="110" rx="8" ry="12" fill="#fff" />
      <ellipse cx="140" cy="110" rx="3" ry="5" fill="#60a5fa" />
      <ellipse cx="180" cy="110" rx="3" ry="5" fill="#60a5fa" />
      {/* Smile */}
      <path d="M145 130 Q160 145 175 130" stroke="#374151" strokeWidth="3" fill="none" />
      {/* Antenna */}
      <rect x="155" y="60" width="10" height="25" rx="5" fill="#6366f1" />
      <circle cx="160" cy="55" r="7" fill="#fbbf24" stroke="#f59e42" strokeWidth="2" />
      {/* Left Arm */}
      <rect x="85" y="170" width="15" height="60" rx="8" fill="#818cf8" />
      {/* Right Arm */}
      <rect x="220" y="170" width="15" height="60" rx="8" fill="#818cf8" />
      {/* Left Hand - React icon */}
      <circle cx="92" cy="240" r="14" fill="#fff" stroke="#60dafc" strokeWidth="3" />
      <text x="84" y="245" fontSize="15" fontFamily="Arial" fill="#60dafc">⚛️</text>
      {/* Right Hand - Python icon */}
      <circle cx="228" cy="240" r="14" fill="#fff" stroke="#ffe066" strokeWidth="3" />
      <text x="220" y="245" fontSize="15" fontFamily="Arial" fill="#ffe066">🐍</text>
      {/* Data/Analytics Bubbles */}
      <ellipse cx="60" cy="100" rx="20" ry="12" fill="#fca5a5" />
      <text x="48" y="105" fontSize="12" fontFamily="Arial" fill="#fff">GA</text>
      <ellipse cx="260" cy="80" rx="18" ry="10" fill="#fbbf24" />
      <text x="250" y="85" fontSize="12" fontFamily="Arial" fill="#fff">FB</text>
      <ellipse cx="70" cy="60" rx="15" ry="9" fill="#60a5fa" />
      <text x="62" y="65" fontSize="12" fontFamily="Arial" fill="#fff">TW</text>
      <ellipse cx="250" cy="40" rx="13" ry="8" fill="#8b5cf6" />
      <text x="243" y="45" fontSize="11" fontFamily="Arial" fill="#fff">TT</text>
      {/* Web3/Blockchain icon */}
      <ellipse cx="160" cy="290" rx="18" ry="10" fill="#f472b6" />
      <text x="150" y="295" fontSize="15" fontFamily="Arial" fill="#fff">⧫</text>
      {/* Notification bubble */}
      <ellipse cx="120" cy="65" rx="10" ry="7" fill="#34d399" />
      <text x="115" y="70" fontSize="10" fontFamily="Arial" fill="#fff">🔔</text>
      {/* Gaming icon bubble */}
      <ellipse cx="200" cy="55" rx="10" ry="7" fill="#fbbf24" />
      <text x="194" y="60" fontSize="13" fontFamily="Arial" fill="#fff">🎮</text>
    </svg>
    {/* Bot label - clear, professional English name, now in a semantic heading for accessibility */}
    <h2 style={{ marginTop: 16, fontWeight: 600, fontSize: 18, color: '#6366f1', fontFamily: 'Arial' }}>
      The Integrated Bot – All Integrations, Data, Gaming & API in One Place
    </h2>
  </div>
);

export default StyledBot;
