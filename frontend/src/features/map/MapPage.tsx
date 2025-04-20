import React from 'react';
import { usePlayers } from './usePlayers';
import PlayerMap from './PlayerMap';

const MAP_WIDTH = 800;
const MAP_HEIGHT = 600;
const MAP_BACKGROUND = '/images/map-background.png'; // Supply your own image here

/**
 * MapPage renders the PlayerMap with real-time player data and a custom background.
 * To use a different map image, change MAP_BACKGROUND.
 */
const MapPage: React.FC = () => {
  const { players, loading, error } = usePlayers('/src/features/map/players.json');

  if (loading) return <div>Loading map...</div>;
  if (error) return <div>Error loading players: {error}</div>;

  return (
    <PlayerMap
      players={players}
      mapWidth={MAP_WIDTH}
      mapHeight={MAP_HEIGHT}
      mapBackgroundUrl={MAP_BACKGROUND}
    />
  );
};

export default MapPage;
