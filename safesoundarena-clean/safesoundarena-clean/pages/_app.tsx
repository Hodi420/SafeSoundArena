import '../styles/globals.css';
import '../styles/theme.css';
import type { AppProps } from 'next/app';
import { useJailTime } from '../src/hooks/useJailTime';
import { motion } from 'framer-motion';
import { useThemeStore } from '../store/useThemeStore';
import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ExternalSDKs from '../src/lib/ExternalSDKs';
// Only import devtools and DebugPanel in dev or sandbox
const isDevOrSandbox = process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_PI_SANDBOX === 'true';
import DebugPanel from '../src/components/DebugPanel';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Import fonts
import '@fontsource/fira-code';
import '@fontsource/orbitron';
import '@fontsource/rajdhani';


function PioneerPathways({ Component, pageProps, router }: AppProps) {
  // TODO: Replace with real user profile logic
  const profile = { username: 'YourUser', avatar: '', profileData: {} };
  useJailTime(profile);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { font, uiStyle, animationSpeed, primaryColor, secondaryColor } = useThemeStore();
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    // Convert hex to RGB for CSS variables
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
        : null;
    };
    document.documentElement.style.setProperty('--primary-color-rgb', hexToRgb(primaryColor));
    document.documentElement.style.setProperty('--secondary-color-rgb', hexToRgb(secondaryColor));
  }, [primaryColor, secondaryColor]);

  return (
    <QueryClientProvider client={queryClient}>
      <ExternalSDKs />
      <motion.div
        key={router?.route}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={{
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: -20 },
        }}
        transition={{ duration: 0.3 }}
        className={`font-${font} theme-${uiStyle} animation-${animationSpeed}`}
      >
        {/* Sandbox Mode Banner */}
        {process.env.NEXT_PUBLIC_PI_SANDBOX === 'true' && (
          <div style={{ width: '100%', background: '#ff9800', color: '#222', textAlign: 'center', padding: '8px 0', fontWeight: 'bold', letterSpacing: 1, zIndex: 1000 }}>
            SANDBOX MODE - TESTING ENVIRONMENT
          </div>
        )}
        {/* Modern Sticky Navbar */}
        <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
            {/* Left: Logo */}
            <div className="flex items-center space-x-3">
              <img src="/pioneer-logo.png" alt="SafeSoundArena Logo" className="h-10 w-auto" />
              <span className="font-bold text-xl text-blue-600">Pioneer Pathways</span>
            </div>
            {/* Center: Nav Links */}
            <div className="hidden md:flex space-x-6">
              <a href="/" className="text-gray-700 hover:text-blue-600 font-medium transition">Home</a>
              <a href="/dashboard" className="text-gray-700 hover:text-blue-600 font-medium transition">Dashboard</a>
              <a href="/about" className="text-gray-700 hover:text-blue-600 font-medium transition">About</a>
              <a href="/contact" className="text-gray-700 hover:text-blue-600 font-medium transition">Contact</a>
            </div>
            {/* Right: Hamburger for mobile */}
            <div className="md:hidden">
              <button
                aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                className="p-2 rounded hover:bg-blue-50 focus:ring-2 focus:ring-blue-400"
                onClick={() => setMobileMenuOpen((open: boolean) => !open)}
              >
                {mobileMenuOpen ? (
                  <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
              {/* Mobile Drawer Menu */}
              <div
                className={`fixed top-0 left-0 w-full h-full bg-black/40 z-50 transition-opacity duration-200 ${mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setMobileMenuOpen(false)}
                aria-hidden={!mobileMenuOpen}
              >
                <nav
                  className={`absolute top-0 right-0 bg-white shadow-lg w-64 h-full p-8 flex flex-col gap-6 transition-transform duration-300 ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
                  onClick={e => e.stopPropagation()}
                  role="menu"
                  aria-label="Mobile navigation menu"
                >
                  <a href="/" className="text-gray-700 hover:text-blue-600 font-medium transition text-lg" onClick={() => setMobileMenuOpen(false)}>Home</a>
                  <a href="/dashboard" className="text-gray-700 hover:text-blue-600 font-medium transition text-lg" onClick={() => setMobileMenuOpen(false)}>Dashboard</a>
                  <a href="/about" className="text-gray-700 hover:text-blue-600 font-medium transition text-lg" onClick={() => setMobileMenuOpen(false)}>About</a>
                  <a href="/contact" className="text-gray-700 hover:text-blue-600 font-medium transition text-lg" onClick={() => setMobileMenuOpen(false)}>Contact</a>
                </nav>
              </div>
            </div>
          </div>
        </nav>
        <Component {...pageProps} />
        {/* Modern Footer */}
        <footer className="w-full bg-gray-100 border-t border-gray-200 py-6 mt-12">
          <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between text-sm text-gray-500">
            <div className="mb-2 md:mb-0">&copy; {new Date().getFullYear()} Pioneer Pathways. All rights reserved.</div>
            <div className="flex space-x-4">
              <a href="/privacy" className="hover:text-blue-600 transition">Privacy Policy</a>
              <a href="/contact" className="hover:text-blue-600 transition">Contact</a>
            </div>
          </div>
        </footer>
      </motion.div>
      {isDevOrSandbox && DebugPanel && <DebugPanel />}
      {isDevOrSandbox && ReactQueryDevtools && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

export default PioneerPathways;
