import React, { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

interface RoomContextValue {
  roomId: string;
  setRoomId: (id: string) => void;
}

const RoomContext = createContext<RoomContextValue | undefined>(undefined);

export const RoomProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [roomId, setRoomId] = useState<string>(() => {
    // Try to restore from sessionStorage
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('roomId');
      if (stored) return stored;
    }
    const newId = uuidv4();
    if (typeof window !== 'undefined') sessionStorage.setItem('roomId', newId);
    return newId;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') sessionStorage.setItem('roomId', roomId);
  }, [roomId]);

  return (
    <RoomContext.Provider value={{ roomId, setRoomId }}>
      {children}
    </RoomContext.Provider>
  );
};

export const useRoom = () => {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error('useRoom must be used within a RoomProvider');
  return ctx;
};
