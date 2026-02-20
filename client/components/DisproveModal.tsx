'use client';

import { Card } from '@shared/types';

interface DisproveModalProps {
  isOpen: boolean;
  matchingCards: Card[];
  onReveal: (card: Card) => void;
}

export function DisproveModal({ isOpen, matchingCards, onReveal }: DisproveModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50"
      style={{ pointerEvents: 'auto' }}
    >
      <div className="bg-gray-900 border-4 border-red-500 rounded-lg p-8 max-w-sm w-full mx-4">
        <h2 className="text-3xl font-bold text-red-400 mb-2">DISPROVE NOW!</h2>
        <p className="text-gray-300 mb-6">
          You have a matching card. Choose one to reveal to the suggester.
        </p>

        <div className="space-y-3">
          {matchingCards.map((card) => (
            <button
              key={card.name}
              onClick={() => onReveal(card)}
              className="w-full p-4 bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded-lg transition-all text-lg"
            >
              {card.name}
              {card.category === 'SUSPECT' && ' 🧑'} 
              {card.category === 'WEAPON' && ' 🔫'} 
              {card.category === 'ROOM' && ' 🏠'}
            </button>
          ))}
        </div>

        <p className="text-xs text-gray-500 mt-6 text-center">
          You cannot close this modal. Pick a card to continue.
        </p>
      </div>
    </div>
  );
}
