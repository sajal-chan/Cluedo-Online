'use client';

import { Card } from '@shared/types';

interface MyHandProps {
  hand: Card[];
  onCardSelect?: (card: Card) => void;
  selectedCards?: Card[];
}

export function MyHand({
  hand,
  onCardSelect,
  selectedCards = [],
}: MyHandProps) {
  const groupedCards = {
    SUSPECT: hand.filter((c) => c.category === 'SUSPECT'),
    WEAPON: hand.filter((c) => c.category === 'WEAPON'),
    ROOM: hand.filter((c) => c.category === 'ROOM'),
  };

  const renderCards = (cards: Card[]) => (
    <div className="flex flex-wrap gap-2">
      {cards.map((card) => {
        const isSelected = selectedCards.some((c) => c.name === card.name);
        return (
          <button
            key={card.name}
            onClick={() => onCardSelect?.(card)}
            className={`px-3 py-2 rounded border-2 text-sm font-semibold transition-all ${
              isSelected
                ? 'border-green-400 bg-green-900 text-white'
                : 'border-gray-600 bg-gray-800 text-gray-100 hover:border-gray-400'
            }`}
          >
            {card.name}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
      <h3 className="text-lg font-bold text-white mb-4">Your Hand</h3>

      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-gray-300 mb-2">Suspects</h4>
          {renderCards(groupedCards.SUSPECT)}
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-300 mb-2">Weapons</h4>
          {renderCards(groupedCards.WEAPON)}
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-300 mb-2">Rooms</h4>
          {renderCards(groupedCards.ROOM)}
        </div>
      </div>
    </div>
  );
}
