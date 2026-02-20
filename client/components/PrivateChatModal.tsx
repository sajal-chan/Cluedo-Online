'use client';

import { useState } from 'react';

interface PrivateChatModalProps {
  isOpen: boolean;
  playerName: string;
  onClose: () => void;
  onSendMessage: (message: string) => void;
}

export function PrivateChatModal({
  isOpen,
  playerName,
  onClose,
  onSendMessage,
}: PrivateChatModalProps) {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-sm w-full mx-4">
        <h2 className="text-2xl font-bold text-white mb-4">Message {playerName}</h2>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a private message..."
          className="w-full h-24 bg-gray-800 border border-gray-700 rounded p-3 text-white placeholder-gray-500 focus:outline-none focus:border-gray-500 mb-4"
        />

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-semibold transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={!message.trim()}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded font-semibold transition-all"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
