'use client';

import { useGameSocket } from '../../useGameSocket';
import { SocketEvents } from '@shared/types';
import { useRouter } from 'next/navigation';

interface LobbyPageProps {
  params: {
    roomId: string;
  };
}

export default function LobbyPage({ params }: LobbyPageProps) {
  const router = useRouter();
  const { gameState, emit, isConnected } = useGameSocket();

  const handleStartGame = () => {
    const userId = localStorage.getItem('clue_userId') || '';
    emit(SocketEvents.START_GAME, { roomId: params.roomId, userId }, (result: any) => {
      if (!result.success) {
        alert(`Error: ${result.error}`);
      }
    });
  };

  const isOwner =
    gameState && gameState.players.length > 0
      ? gameState.players[0].userId === localStorage.getItem('clue_userId')
      : false;

  const canStart =
    gameState && gameState.players.length >= 2 && gameState.phase === 'LOBBY';

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4" />
          <p className="text-gray-300">Loading lobby...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-6">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-purple-400 mb-2">Room: {params.roomId}</h1>
          <p className="text-gray-400">Share this code with friends to join!</p>
        </div>

        <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">
            Players ({gameState.players.length}/6)
          </h2>

          <div className="space-y-3">
            {gameState.players.map((player, index) => (
              <div
                key={player.userId}
                className="flex items-center gap-4 p-4 bg-gray-800 rounded-lg border-l-4"
                style={{ borderLeftColor: player.color }}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: player.color }}
                >
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="text-white font-semibold">{player.name}</p>
                  <p className="text-sm text-gray-400">
                    {player.isConnected ? '🟢 Connected' : '🔴 Disconnected'}
                  </p>
                </div>
                {index === 0 && (
                  <span className="px-3 py-1 bg-yellow-600 text-white text-xs font-bold rounded">
                    Host
                  </span>
                )}
              </div>
            ))}
          </div>

          {gameState.players.length < 2 && (
            <div className="mt-6 p-4 bg-blue-900 border border-blue-600 rounded text-blue-200 text-center">
              Need at least 2 players to start the game
            </div>
          )}
        </div>

        <div className="flex gap-4">
          {isOwner && canStart && (
            <button
              onClick={handleStartGame}
              className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-all"
            >
              Start Game
            </button>
          )}

          <button
            onClick={() => router.push('/')}
            className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-all"
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}
