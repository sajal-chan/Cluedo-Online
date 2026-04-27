'use client';

import { useState, useEffect } from 'react';
import { SocketEvents, Card, GameState } from '@shared/types';
import { Socket } from 'socket.io-client';
import { PlayerCircle } from '@/components/PlayerCircle';
import { MyHand } from '@/components/MyHand';
import { Notebook } from '@/components/Notebook';
import { SuggestModal } from '@/components/SuggestModal';
import { DisproveModal } from '@/components/DisproveModal';
import { AccuseModal } from '@/components/AccuseModal';
import { ChatWindow, ChatMessage } from '@/components/ChatWindow';
import { v4 as uuidv4 } from 'uuid';

interface GameViewProps {
  gameState: GameState;
  roomId: string;
  emit: (event: string, data: any, callback?: (response: any) => void) => void;
  socket: Socket | null;
}

export function GameView({ gameState, roomId, emit, socket }: GameViewProps) {
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [showAccuseModal, setShowAccuseModal] = useState(false);
  const [matchingCards, setMatchingCards] = useState<Card[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const userId = typeof window !== 'undefined' ? localStorage.getItem('clue_userId') : '';
  const currentPlayer = gameState?.players[gameState.currentTurnIndex];
  const isMyTurn = currentPlayer?.userId === userId;
  const myPlayer = gameState?.players.find((p) => p.userId === userId);
  const isMyTurnToDisprove =
    gameState?.phase === 'DISPROVING' &&
    gameState.disproveContext?.currentDisproverUserId === userId;

  // Listen for incoming chat messages
  useEffect(() => {
    if (!socket) return;

    const handleIncomingMessage = (data: {
      fromUserId: string;
      fromName: string;
      message: string;
      timestamp: number;
      toUserId?: string;
      isPrivate?: boolean;
    }) => {
      const isPrivate = data.toUserId !== undefined && data.toUserId !== null;
      const newMessage: ChatMessage = {
        id: uuidv4(),
        fromName: data.fromName,
        fromUserId: data.fromUserId,
        message: data.message,
        timestamp: data.timestamp,
        isPrivate,
        visibleTo: isPrivate
          ? [data.fromUserId, data.toUserId || '']
          : undefined,
      };
      setChatMessages((prev) => [...prev, newMessage]);
    };

    socket.on(SocketEvents.PRIVATE_MESSAGE, handleIncomingMessage);

    return () => {
      socket.off(SocketEvents.PRIVATE_MESSAGE, handleIncomingMessage);
    };
  }, [socket]);

  // Set matching cards when need to disprove
  useEffect(() => {
    if (
      isMyTurnToDisprove &&
      gameState?.disproveContext?.suggestion &&
      myPlayer?.hand
    ) {
      const suggestion = gameState.disproveContext.suggestion;
      const matching = myPlayer.hand.filter(
        (card) =>
          card.name === suggestion.suspect.name ||
          card.name === suggestion.weapon.name ||
          card.name === suggestion.room.name
      );
      setMatchingCards(matching);
    }
  }, [isMyTurnToDisprove, gameState?.disproveContext, myPlayer?.hand]);

  // Timer logic
  useEffect(() => {
    if (gameState?.timerEndsAt && gameState.timerEndsAt > 0) {
      const interval = setInterval(() => {
        const remaining = Math.max(
          0,
          Math.ceil((gameState.timerEndsAt! - Date.now()) / 1000)
        );
        setTimeRemaining(remaining);

        if (remaining === 0) {
          clearInterval(interval);
          setTimeRemaining(0);
        }
      }, 100);

      // Set initial time
      setTimeRemaining(Math.max(0, Math.ceil((gameState.timerEndsAt - Date.now()) / 1000)));

      return () => clearInterval(interval);
    } else {
      setTimeRemaining(0);
    }
  }, [gameState?.timerEndsAt]);

  const handleSuggest = (suspect: Card, weapon: Card, room: Card) => {
    emit(
      SocketEvents.MAKE_SUGGESTION,
      { roomId, userId, suspect, weapon, room },
      (result: any) => {
        if (result.success) {
          setShowSuggestModal(false);
        } else {
          alert(`Error: ${result.error}`);
        }
      }
    );
  };

  const handleAccuse = (suspect: Card, weapon: Card, room: Card) => {
    emit(
      SocketEvents.MAKE_ACCUSATION,
      { roomId, userId, suspect, weapon, room },
      (result: any) => {
        if (result.success) {
          setShowAccuseModal(false);
        } else {
          alert(`Error: ${result.error}`);
        }
      }
    );
  };

  const handleRevealCard = (card: Card) => {
    emit(
      SocketEvents.REVEAL_CARD,
      { roomId, userId, card },
      (result: any) => {
        if (!result.success) {
          alert(`Error: ${result.error}`);
        }
      }
    );
  };

  const handleSendPrivateMessage = (message: string, targetUserId?: string | null) => {
    if (!message.trim()) return;

    const myPlayer = gameState?.players.find((p) => p.userId === userId);
    const isPrivate = targetUserId !== null && targetUserId !== undefined;

    // Create message for local display
    const newMessage: ChatMessage = {
      id: uuidv4(),
      fromName: myPlayer?.name || 'Unknown',
      fromUserId: userId || '',
      message,
      timestamp: Date.now(),
      isPrivate,
      visibleTo: isPrivate ? [userId || '', targetUserId] : undefined,
    };

    setChatMessages((prev) => [...prev, newMessage]);

    // Send to server
    if (isPrivate) {
      emit(SocketEvents.SEND_PRIVATE_MSG, {
        roomId,
        fromUserId: userId,
        toUserId: targetUserId,
        message,
      });
    } else {
      emit(SocketEvents.SEND_PRIVATE_MSG, {
        roomId,
        fromUserId: userId,
        message,
      });
    }
  };

  const handlePlayerAvatarClick = (targetUserId: string) => {
    if (targetUserId !== userId) {
      // Focus chat and scroll to bottom for private conversation
      const chatInput = document.querySelector('.chat-input') as HTMLTextAreaElement;
      if (chatInput) {
        chatInput.focus();
      }
    }
  };

  // Game over screen
  if (gameState.phase === 'GAME_OVER') {
    const winner = gameState.players.find((p) => p.userId === gameState.winnerId);
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          {gameState.winnerId ? (
            <>
              <h1 className="text-5xl font-bold text-yellow-400 mb-4">🎉 {winner?.name} Wins!</h1>
              <p className="text-xl text-gray-300 mb-4">
                The culprit was correctly identified!
              </p>
            </>
          ) : (
            <>
              <h1 className="text-5xl font-bold text-red-400 mb-4">Game Over</h1>
              <p className="text-xl text-gray-300 mb-4">
                All players eliminated. No winner.
              </p>
            </>
          )}

          <div className="mt-8">
            <a
              href="/"
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-all inline-block"
            >
              Return to Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Main game screen
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-4 relative">
      {gameState.isBotThinking && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-gray-900 border border-purple-500 p-8 rounded-2xl shadow-2xl text-center max-w-sm mx-4">
            <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold text-white mb-2">Bot is Thinking...</h2>
            <p className="text-gray-400 italic">
              {gameState.players.find(p => p.userId === gameState.botThinkingUserId)?.name} is analyzing the evidence.
            </p>
          </div>
        </div>
      )}
      <Notebook />

      {/* Header */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-purple-400">🎲 Cluedo</h1>
          <div className="text-right">
            <p className="text-gray-300">
              {
              (gameState.phase === 'DISPROVING' || (gameState.phase === 'IDLE' && isMyTurn)) && timeRemaining > 0
                ? `Time: ${timeRemaining}s`
                : gameState.phase
              }
            </p>
            {isMyTurn && gameState.phase === 'IDLE' && (
              <p className="text-green-400 font-bold">Your Turn</p>
            )}
          </div>
        </div>
      </div>

      {/* Player Circle */}
      <PlayerCircle
        players={gameState.players}
        currentTurnIndex={gameState.currentTurnIndex}
        onPlayerClick={handlePlayerAvatarClick}
      />

      {/* Main Content */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Left Column - My Hand */}
        <div className="lg:col-span-1">
          {myPlayer && (
            <MyHand
              hand={myPlayer.hand}
              selectedCards={matchingCards}
            />
          )}
        </div>

        {/* Center Column - Game Log */}
        <div className="lg:col-span-1">
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-700 max-h-96 overflow-y-auto">
            <h3 className="text-lg font-bold text-white mb-4">Game Log</h3>
            <div className="space-y-2">
              {gameState.log.slice(-15).map((entry, index) => (
                <div
                  key={index}
                  className={`text-sm p-2 rounded ${
                    entry.isPrivate
                      ? 'bg-purple-900 text-purple-200 border-l-2 border-purple-500'
                      : 'bg-gray-800 text-gray-300'
                  }`}
                >
                  {entry.message}
                </div>
              ))}
            </div>
          </div>
          {isMyTurn && gameState.phase === 'IDLE' && timeRemaining > 0 && (
            <div className="mt-2 text-center text-yellow-400 font-semibold">
              Time remaining: {timeRemaining}s
            </div>
          )}
        </div>

        {/* Right Column - Actions */}
        <div className="lg:col-span-1">
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
            <h3 className="text-lg font-bold text-white mb-4">Actions</h3>

            <div className="space-y-3">
              {isMyTurn && gameState.phase === 'IDLE' && !myPlayer?.isEliminated && (
                <>
                  <button
                    onClick={() => setShowSuggestModal(true)}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold transition-all"
                  >
                    Make Suggestion
                  </button>
                  <button
                    onClick={() => setShowAccuseModal(true)}
                    className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded font-semibold transition-all"
                  >
                    Make Accusation
                  </button>
                </>
              )}

              {myPlayer?.isEliminated && (
                <div className="p-3 bg-red-900 border border-red-600 rounded text-red-200 text-center font-semibold">
                  You have been eliminated
                </div>
              )}

              {!isMyTurn && gameState.phase === 'IDLE' && (
                <div className="p-3 bg-gray-800 border border-gray-700 rounded text-gray-300 text-center">
                  Waiting for {currentPlayer?.name}'s turn...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Disprove Modal */}
      <DisproveModal
        isOpen={isMyTurnToDisprove}
        matchingCards={matchingCards}
        onReveal={handleRevealCard}
      />

      {/* Suggest Modal */}
      <SuggestModal
        isOpen={showSuggestModal}
        onClose={() => setShowSuggestModal(false)}
        onSuggest={handleSuggest}
      />

      {/* Accuse Modal */}
      <AccuseModal
        isOpen={showAccuseModal}
        onClose={() => setShowAccuseModal(false)}
        onAccuse={handleAccuse}
      />

      {/* Chat Window */}
      <ChatWindow
        messages={chatMessages}
        onSendMessage={handleSendPrivateMessage}
        players={gameState.players}
        currentUserId={userId || ''}
      />
    </div>
  );
}
