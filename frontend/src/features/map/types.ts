export interface PlayerPosition {
  x: number;
  y: number;
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  position: PlayerPosition;
  status: 'online' | 'offline' | 'busy';
}
