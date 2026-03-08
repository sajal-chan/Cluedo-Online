'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGameSocket } from './GameSocketContext';
import { SocketEvents } from '@shared/types';

export default function HomePage() {
  const router = useRouter();
  const { emit, isConnected } = useGameSocket();
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const handleCreateRoom = () => {
    if (!playerName) {
      alert('Please enter your name');
      return;
    }

    setIsCreating(true);
    // Get userId from localStorage
    const userId = localStorage.getItem('clue_userId') || '';

    emit(SocketEvents.JOIN_ROOM, { userId, name: playerName }, (result: any) => {
      setIsCreating(false);
      if (result.success) {
        router.push(`/lobby/${result.roomId}`);
      } else {
        alert(`Error: ${result.error}`);
      }
    });
  };

  const handleJoinRoom = () => {
    if (!playerName) {
      alert('Please enter your name');
      return;
    }

    if (!roomCode) {
      alert('Please enter a room code');
      return;
    }

    setIsJoining(true);
    const userId = localStorage.getItem('clue_userId') || '';

    emit(
      SocketEvents.JOIN_ROOM,
      { roomId: roomCode, userId, name: playerName },
      (result: any) => {
        setIsJoining(false);
        if (result.success) {
          router.push(`/lobby/${result.roomId}`);
        } else {
          alert(`Error: ${result.error}`);
        }
      }
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-purple-400 mb-2">🎲 CLUEDO</h1>
          <p className="text-gray-300">Multiplayer Deduction Game</p>
        </div>

        {!isConnected && (
          <div className="bg-yellow-900 border border-yellow-600 rounded-lg p-4 mb-6 text-center text-yellow-200">
            Connecting to server...
          </div>
        )}

        <div className="bg-gray-900 border border-gray-700 rounded-lg p-8 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Player Name</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateRoom()}
              placeholder="Enter your name..."
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
              disabled={!isConnected}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCreateRoom}
              disabled={!playerName || !isConnected || isCreating}
              className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-bold rounded-lg transition-all"
            >
              {isCreating ? 'Creating...' : 'Create Room'}
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-900 text-gray-500">OR</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Room Code</label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
              placeholder="Enter room code..."
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-gray-500 uppercase"
              disabled={!isConnected}
            />
          </div>

          <button
            onClick={handleJoinRoom}
            disabled={!playerName || !roomCode || !isConnected || isJoining}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold rounded-lg transition-all"
          >
            {isJoining ? 'Joining...' : 'Join Room'}
          </button>
        </div>

        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Play with 2-6 players</p>
          <p className="mt-2">Deduce who committed the crime!</p>
        </div>
      </div>
    </div>
  );
}
