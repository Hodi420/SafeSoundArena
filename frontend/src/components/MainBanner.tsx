import React from 'react';

export default function MainBanner() {
  // Simple Pi connect handler for banner button
  function connectPi() {
    if (typeof window !== 'undefined' && window.Pi) {
      window.Pi.authenticate([])
        .then((auth: any) => {
          alert('Connected as ' + (auth.user?.uid || auth.user?.username || 'unknown'));
        })
        .catch((err: any) => {
          alert('Connection failed: ' + err);
        });
    } else {
      alert('Pi Network SDK not found.');
    }
  }

  return (
    <div className="w-full h-[500px] bg-gradient-to-br from-[#1A1C2C] via-[#292B3E] to-[#3A3E5C] flex items-center justify-center text-white relative overflow-hidden rounded-2xl shadow-2xl animate-fade-in">
      <div className="absolute top-0 left-0 w-full h-full bg-[url('/assets/starfield.svg')] bg-cover opacity-10 animate-pulse"></div>
      <div className="text-center z-10 px-6 max-w-4xl">
        <img src="/assets/logo.png" alt="Pioneer Logo" className="mx-auto mb-4 w-24 h-24 animate-fade-in-down" />
        <h1 className="text-5xl font-bold mb-4 drop-shadow-lg animate-slide-in">Pioneer Pathways</h1>
        <p className="text-xl md:text-2xl text-gray-200 mb-6 animate-fade-in">Explore, Trade, and Conquer the Future of Web3 Gaming – Powered by Pi Network</p>
        <div className="flex justify-center gap-4 animate-fade-in-up">
          <a href="#get-started" className="bg-yellow-400 text-black font-semibold py-3 px-6 rounded-xl hover:bg-yellow-300 transition">Get Started</a>
          <a href="#scrolls" className="border border-white py-3 px-6 rounded-xl hover:bg-white hover:text-black transition">Explore Scrolls</a>
        </div>
        <div className="mt-6 animate-fade-in text-sm text-gray-400">Connect via Pi Network to unlock personalized features</div>
        <button onClick={connectPi} className="mt-2 py-2 px-4 bg-indigo-500 hover:bg-indigo-400 rounded-lg text-white font-medium transition animate-fade-in">Connect with Pi</button>
      </div>
    </div>
  );
}
