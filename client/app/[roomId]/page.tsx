'use client';

import { useGameSocket } from '../GameSocketContext';
import { SocketEvents } from '@shared/types';
import { useEffect } from 'react';
import { LobbyView } from '@/components/LobbyView';
import { GameView } from '@/components/GameView';

interface RoomPageProps {
  params: {
    roomId: string;
  };
}

export default function RoomPage({ params }: RoomPageProps) {
  const { gameState, emit, isConnected } = useGameSocket();

  // Join the room when component mounts and socket is connected
  useEffect(() => {
    if (isConnected && !gameState) {
      const userId = localStorage.getItem('clue_userId') || '';
      const playerName = `Player ${Math.random().toString(36).substr(2, 9)}`;
      
      emit(SocketEvents.JOIN_ROOM, 
        {
          roomId: params.roomId,
          userId,
          name: playerName,
        }, 
        (result: any) => {
          if (!result.success) {
            console.error("Failed to auto-join room:", result.error);
            alert(`Failed to Join the Room: ${result.error}`);
          } else {
            console.log("Successfully synced with room:", result.roomId);
          }
        }
      );
    }
  }, [isConnected, gameState, params.roomId, emit]);

  // Loading state
  if (!gameState) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4" />
          <p className="text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  // Conditional rendering based on phase
  if (gameState.phase === 'LOBBY') {
    return <LobbyView gameState={gameState} roomId={params.roomId} emit={emit} />;
  }

  // All other phases (IDLE, DISPROVING, GAME_OVER, etc.) show the game view
  return <GameView gameState={gameState} roomId={params.roomId} emit={emit} />;
}
