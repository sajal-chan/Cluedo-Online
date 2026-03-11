'use client';

import { useState, useEffect, useRef } from 'react';

export interface ChatMessage {
  id: string;
  fromName: string;
  fromUserId: string;
  message: string;
  timestamp: number;
  isPrivate: boolean;
  visibleTo?: string[]; // For private messages, array of user IDs who can see it
}

interface ChatWindowProps {
  messages: ChatMessage[];
  onSendMessage: (message: string, targetUserId?: string | null) => void;
  players: any[];
  currentUserId: string;
}

export function ChatWindow({
  messages,
  onSendMessage,
  players,
  currentUserId,
}: ChatWindowProps) {
  const [messageInput, setMessageInput] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [messageType, setMessageType] = useState<'global' | 'private'>('global');
  const [privateTarget, setPrivateTarget] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (!isCollapsed) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isCollapsed]);

  const handleSend = () => {
    if (messageInput.trim()) {
      if (messageType === 'private' && privateTarget) {
        onSendMessage(messageInput, privateTarget);
      } else {
        onSendMessage(messageInput, null);
      }
      setMessageInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Filter messages visible to current user
  const visibleMessages = messages.filter((msg) => {
    if (!msg.isPrivate) return true; // Global messages visible to all
    // Private messages only visible to sender and recipient
    return (
      msg.fromUserId === currentUserId ||
      msg.visibleTo?.includes(currentUserId)
    );
  });

  const otherPlayers = players.filter(
    (p) => p.userId !== currentUserId && !p.isEliminated
  );

  if (isCollapsed) {
    return (
      <div className="fixed bottom-4 right-4 z-40">
        <button
          onClick={() => setIsCollapsed(false)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all shadow-lg"
        >
          💬 Chat ({visibleMessages.length})
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 h-96 bg-gray-900 border border-gray-700 rounded-lg flex flex-col shadow-lg z-40">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 rounded-t-lg flex justify-between items-center">
        <h3 className="text-lg font-bold text-white">💬 Chat</h3>
        <button
          onClick={() => setIsCollapsed(true)}
          className="text-gray-400 hover:text-white text-xl transition-colors"
          title="Collapse chat"
        >
          −
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {visibleMessages.length === 0 ? (
          <p className="text-gray-500 text-center text-sm">No messages yet</p>
        ) : (
          visibleMessages.map((msg) => (
            <div
              key={msg.id}
              className={`text-sm p-2 rounded ${
                msg.fromUserId === currentUserId
                  ? 'bg-blue-900 text-blue-100 ml-8'
                  : msg.isPrivate
                  ? 'bg-purple-900 text-purple-200 border-l-2 border-purple-500'
                  : 'bg-gray-800 text-gray-200'
              }`}
            >
              <div className="font-semibold text-xs mb-1">
                {msg.isPrivate && '🔒 '}{msg.fromName}
                {msg.isPrivate &&
                  msg.fromUserId !== currentUserId &&
                  ` → You`}
              </div>
              <div className="break-words text-xs">{msg.message}</div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Type & Target Selection */}
      <div className="border-t border-gray-700 px-3 pt-2 bg-gray-800">
        <div className="flex gap-2 mb-2">
          <label className="flex items-center gap-2 flex-1">
            <input
              type="radio"
              value="global"
              checked={messageType === 'global'}
              onChange={(e) => {
                setMessageType(e.target.value as 'global' | 'private');
                setPrivateTarget(null);
              }}
              className="w-4 h-4"
            />
            <span className="text-xs text-gray-300">Global</span>
          </label>
          <label className="flex items-center gap-2 flex-1">
            <input
              type="radio"
              value="private"
              checked={messageType === 'private'}
              onChange={(e) =>
                setMessageType(e.target.value as 'global' | 'private')
              }
              className="w-4 h-4"
            />
            <span className="text-xs text-gray-300">Private</span>
          </label>
        </div>

        {messageType === 'private' && (
          <select
            value={privateTarget || ''}
            onChange={(e) => setPrivateTarget(e.target.value || null)}
            className="w-full mb-2 bg-gray-700 border border-gray-600 rounded p-1 text-white text-xs focus:outline-none focus:border-gray-500"
          >
            <option value="">Select player...</option>
            {otherPlayers.map((player) => (
              <option key={player.userId} value={player.userId}>
                {player.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-gray-700 p-3 bg-gray-800 rounded-b-lg">
        <textarea
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message... (Enter to send)"
          className="chat-input w-full h-12 bg-gray-700 border border-gray-600 rounded p-2 text-white placeholder-gray-400 focus:outline-none focus:border-gray-500 resize-none text-sm"
        />
      </div>
    </div>
  );
}
