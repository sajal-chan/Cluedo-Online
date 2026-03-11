'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameState, SocketEvents, Card } from '@shared/types';
import { v4 as uuidv4 } from 'uuid';

interface UseGameSocketReturn {
  gameState: GameState | null;
  socket: Socket | null;
  myHand: Card[];
  isConnected: boolean;
  emit: (event: string, data: any, callback?: (response: any) => void) => void;
}

export function useGameSocket(): UseGameSocketReturn {
  const [userId, setUserId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

  // Initialize userId from localStorage
  useEffect(() => {
    let id = localStorage.getItem('clue_userId');
    if (!id) {
      id = uuidv4();
      localStorage.setItem('clue_userId', id);
    }
    setUserId(id);
  }, []);

  // Connect socket
  useEffect(() => {
    if (!userId) return; // Wait until userId is initialized

    const socket = io(socketUrl, {
      auth: {
        userId,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    });

    socket.on(SocketEvents.GAME_STATE_UPDATE, (state: GameState) => {
      console.log('Game state updated:', state);
      setGameState(state);
    });

    socket.on(SocketEvents.PRIVATE_MESSAGE, (data: { fromUserId: string; fromName: string; message: string; timestamp: number }) => {
      // Message will be handled by GameView listener
      console.log(`Message from ${data.fromName}: ${data.message}`);
    });

    socket.on(SocketEvents.REQUEST_REVEAL, () => {
      console.log('Reveal requested');
    });

    socket.on(SocketEvents.PRIVATE_REVEAL, (data: { card: Card }) => {
      console.log('Private reveal received:', data.card);
    });

    socket.on(SocketEvents.ERROR_MSG, (data: { error: string }) => {
      console.error('Server error:', data.error);
      alert(`Error: ${data.error}`);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [userId, socketUrl]);

  const myHand = gameState?.players.find((p) => p.userId === userId)?.hand || [];

  const emit = useCallback(
    (event: string, data: any, callback?: (response: any) => void) => {
      if (socketRef.current) {
        if (callback) {
          socketRef.current.emit(event, data, callback);
        } else {
          socketRef.current.emit(event, data);
        }
      }
    },
    []
  );

  return {
    gameState,
    socket: socketRef.current,
    myHand,
    isConnected,
    emit,
  };
}
