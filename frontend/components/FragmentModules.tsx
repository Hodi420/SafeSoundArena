import React from "react";

// Fragment Modules UI mockup for Nexus: Chaos Core theme
const FragmentModules = () => {
  return (
    <div className="bg-gradient-to-br from-[#1a1a2e] via-[#0f3460] to-[#16213e] rounded-2xl shadow-xl p-8 border-4 border-[#e94560]/40 max-w-3xl mx-auto mt-10 animate-fade-in">
      <h2 className="text-3xl font-extrabold text-[#e94560] tracking-widest mb-6 font-mono drop-shadow-lg">Fragment Modules</h2>
      <div className="grid grid-cols-2 gap-6">
        {/* Example Fragment Card */}
        <div className="bg-[#232946] rounded-xl p-5 flex flex-col items-center border border-[#e94560]/30 hover:scale-105 transition-transform cursor-pointer shadow-lg">
          <div className="w-16 h-16 bg-[#e94560]/20 rounded-full flex items-center justify-center mb-3">
            <span className="text-2xl text-[#e94560] font-bold">⚡</span>
          </div>
          <span className="text-lg font-semibold text-[#e94560] mb-1">Chaos Pulse</span>
          <span className="text-sm text-[#b8c1ec] text-center">Unleash a burst of energy to disrupt enemy bots for 5s.</span>
        </div>
        <div className="bg-[#232946] rounded-xl p-5 flex flex-col items-center border border-[#e94560]/30 hover:scale-105 transition-transform cursor-pointer shadow-lg">
          <div className="w-16 h-16 bg-[#e94560]/20 rounded-full flex items-center justify-center mb-3">
            <span className="text-2xl text-[#e94560] font-bold">🧩</span>
          </div>
          <span className="text-lg font-semibold text-[#e94560] mb-1">Fragment Sync</span>
          <span className="text-sm text-[#b8c1ec] text-center">Synchronize with allies for a temporary stat boost.</span>
        </div>
        {/* Add more fragment cards as needed */}
      </div>
      <div className="mt-8 flex justify-end">
        <button className="bg-[#e94560] text-white px-6 py-2 rounded-lg font-bold shadow hover:bg-[#ff2e63] transition-colors">Manage Fragments</button>
      </div>
    </div>
  );
};

export default FragmentModules;