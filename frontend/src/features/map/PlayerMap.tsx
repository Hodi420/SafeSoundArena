import React, { useState } from 'react';
import { Player } from './types';

interface PlayerMapProps {
  players: Player[];
  mapWidth: number;
  mapHeight: number;
  mapBackgroundUrl?: string;
}

const PlayerMap: React.FC<PlayerMapProps> = ({ players, mapWidth, mapHeight, mapBackgroundUrl }) => {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  return (
    <div
      className="relative border border-blue-500 overflow-hidden"
      style={{
        width: mapWidth,
        height: mapHeight,
        background: mapBackgroundUrl
          ? `url(${mapBackgroundUrl}) center/cover no-repeat`
          : '#1e293b',
      }}
      aria-label="Game Map"
    >
      {players.map((player) => (
        <div
          key={player.id}
          className="absolute flex flex-col items-center cursor-pointer transition-all duration-300"
          style={{
            left: `${(player.position.x / mapWidth) * 100}%`,
            top: `${(player.position.y / mapHeight) * 100}%`,
            transform: 'translate(-50%, -50%)',
            transition: 'left 0.5s, top 0.5s',
            zIndex: selectedPlayer?.id === player.id ? 10 : 1,
          }}
          aria-label={`Player ${player.name} (${player.status})`}
          onClick={() => setSelectedPlayer(player)}
        >
          <img
            src={player.avatar}
            alt={player.name}
            className={`w-8 h-8 rounded-full border-2 shadow-lg ${
              player.status === 'online' ? 'border-green-400' : 'border-gray-500'
            }`}
          />
          <span className="text-xs text-white bg-black bg-opacity-60 px-1 rounded mt-1">
            {player.name}
          </span>
        </div>
      ))}
      {selectedPlayer && (
        <div
          className="fixed bottom-4 right-4 bg-gray-800 p-4 rounded shadow-lg border border-blue-400 z-50 animate-fadeIn"
          style={{ minWidth: 200 }}
        >
          <div className="flex items-center mb-2">
            <img
              src={selectedPlayer.avatar}
              alt={selectedPlayer.name}
              className="w-10 h-10 rounded-full border-2 mr-2 border-blue-400"
            />
            <div>
              <div className="font-bold text-white">{selectedPlayer.name}</div>
              <div className="text-xs text-blue-200">Status: {selectedPlayer.status}</div>
            </div>
          </div>
          <button
            className="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded"
            onClick={() => setSelectedPlayer(null)}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};

export default PlayerMap;
