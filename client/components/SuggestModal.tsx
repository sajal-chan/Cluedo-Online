'use client';

import { useState } from 'react';
import { Card, SUSPECTS, WEAPONS, ROOMS } from '@shared/types';

interface SuggestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuggest: (suspect: Card, weapon: Card, room: Card) => void;
}

export function SuggestModal({ isOpen, onClose, onSuggest }: SuggestModalProps) {
  const [selectedSuspect, setSelectedSuspect] = useState<Card | null>(null);
  const [selectedWeapon, setSelectedWeapon] = useState<Card | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Card | null>(null);

  const handleSubmit = () => {
    if (selectedSuspect && selectedWeapon && selectedRoom) {
      onSuggest(selectedSuspect, selectedWeapon, selectedRoom);
      setSelectedSuspect(null);
      setSelectedWeapon(null);
      setSelectedRoom(null);
    }
  };

  if (!isOpen) return null;

  const suspects = SUSPECTS.map((name) => ({ category: 'SUSPECT' as const, name }));
  const weapons = WEAPONS.map((name) => ({ category: 'WEAPON' as const, name }));
  const rooms = ROOMS.map((name) => ({ category: 'ROOM' as const, name }));

  const renderOptions = (options: Card[], selected: Card | null, onSelect: (card: Card) => void) => (
    <div className="grid grid-cols-3 gap-2">
      {options.map((card) => (
        <button
          key={card.name}
          onClick={() => onSelect(card)}
          className={`p-2 rounded text-sm font-semibold transition-all ${
            selected?.name === card.name
              ? 'bg-green-600 text-white'
              : 'bg-gray-700 text-gray-100 hover:bg-gray-600'
          }`}
        >
          {card.name}
        </button>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-white mb-6">Make a Suggestion</h2>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Suspect {selectedSuspect && `✓`}
            </label>
            {renderOptions(suspects, selectedSuspect, setSelectedSuspect)}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Weapon {selectedWeapon && `✓`}
            </label>
            {renderOptions(weapons, selectedWeapon, setSelectedWeapon)}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Room {selectedRoom && `✓`}
            </label>
            {renderOptions(rooms, selectedRoom, setSelectedRoom)}
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-semibold transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedSuspect || !selectedWeapon || !selectedRoom}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded font-semibold transition-all"
          >
            Suggest
          </button>
        </div>
      </div>
    </div>
  );
}
