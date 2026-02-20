'use client';

import { useState } from 'react';
import { Card, SUSPECTS, WEAPONS, ROOMS } from '@shared/types';

interface AccuseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccuse: (suspect: Card, weapon: Card, room: Card) => void;
}

export function AccuseModal({ isOpen, onClose, onAccuse }: AccuseModalProps) {
  const [selectedSuspect, setSelectedSuspect] = useState<Card | null>(null);
  const [selectedWeapon, setSelectedWeapon] = useState<Card | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Card | null>(null);
  const [showWarning, setShowWarning] = useState(false);

  const handleSubmit = () => {
    if (selectedSuspect && selectedWeapon && selectedRoom) {
      setShowWarning(true);
    }
  };

  const handleConfirm = () => {
    if (selectedSuspect && selectedWeapon && selectedRoom) {
      onAccuse(selectedSuspect, selectedWeapon, selectedRoom);
      setSelectedSuspect(null);
      setSelectedWeapon(null);
      setSelectedRoom(null);
      setShowWarning(false);
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
              ? 'bg-yellow-600 text-white'
              : 'bg-gray-700 text-gray-100 hover:bg-gray-600'
          }`}
        >
          {card.name}
        </button>
      ))}
    </div>
  );

  if (showWarning) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-gray-900 border border-red-600 rounded-lg p-6 max-w-sm w-full mx-4">
          <h2 className="text-2xl font-bold text-red-400 mb-4">⚠️ Final Accusation</h2>
          <p className="text-gray-300 mb-4">
            If you're wrong, you'll be eliminated! Are you sure about:
          </p>
          <div className="bg-gray-800 p-3 rounded mb-6 text-sm">
            <p className="text-yellow-300">
              <strong>{selectedSuspect?.name}</strong> with the <strong>{selectedWeapon?.name}</strong> in the{' '}
              <strong>{selectedRoom?.name}</strong>
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowWarning(false)}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-semibold transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-semibold transition-all"
            >
              Accuse
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-yellow-400 mb-6">Make an Accusation</h2>

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
            className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white rounded font-semibold transition-all"
          >
            Accuse
          </button>
        </div>
      </div>
    </div>
  );
}
