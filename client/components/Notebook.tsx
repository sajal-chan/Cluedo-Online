'use client';

import { useState } from 'react';
import { SUSPECTS, WEAPONS, ROOMS } from '@shared/types';

type CellState = 'unknown' | 'clear' | 'marked';

interface NotebookState {
  suspects: Record<string, CellState>;
  weapons: Record<string, CellState>;
  rooms: Record<string, CellState>;
}

export function Notebook() {
  const [isOpen, setIsOpen] = useState(false);
  const [notebook, setNotebook] = useState<NotebookState>({
    suspects: Object.fromEntries(SUSPECTS.map((s) => [s, 'unknown'])),
    weapons: Object.fromEntries(WEAPONS.map((w) => [w, 'unknown'])),
    rooms: Object.fromEntries(ROOMS.map((r) => [r, 'unknown'])),
  });

  const toggleCell = (category: keyof NotebookState, name: string) => {
    setNotebook((prev) => {
      const current = prev[category][name] as CellState;
      const next: CellState =
        current === 'unknown' ? 'clear' : current === 'clear' ? 'marked' : 'unknown';

      return {
        ...prev,
        [category]: {
          ...prev[category],
          [name]: next,
        },
      };
    });
  };

  const getCellColor = (state: CellState) => {
    switch (state) {
      case 'unknown':
        return 'bg-gray-700 hover:bg-gray-600';
      case 'clear':
        return 'bg-red-700 hover:bg-red-600';
      case 'marked':
        return 'bg-green-700 hover:bg-green-600';
    }
  };

  const getCellLabel = (state: CellState) => {
    switch (state) {
      case 'unknown':
        return '?';
      case 'clear':
        return '✗';
      case 'marked':
        return '✓';
    }
  };

  const renderSection = (title: string, category: keyof NotebookState, items: string[]) => (
    <div className="mb-4">
      <h4 className="text-sm font-semibold text-gray-300 mb-2">{title}</h4>
      <div className="grid grid-cols-2 gap-1">
        {items.map((item) => (
          <button
            key={item}
            onClick={() => toggleCell(category, item)}
            className={`p-2 rounded text-xs font-semibold transition-all ${getCellColor(
              notebook[category][item]
            )}`}
          >
            <div className="text-left">
              <div className="truncate">{item}</div>
              <div className="text-gray-300">{getCellLabel(notebook[category][item])}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed right-4 top-4 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded font-semibold transition-all z-40"
      >
        {isOpen ? 'Close' : 'Notebook'}
      </button>

      {isOpen && (
        <div className="fixed right-4 top-16 w-80 bg-gray-900 border border-gray-700 rounded-lg p-4 max-h-96 overflow-y-auto z-40">
          <h3 className="text-lg font-bold text-white mb-4">Detective Notebook</h3>

          {renderSection('Suspects', 'suspects', SUSPECTS)}
          {renderSection('Weapons', 'weapons', WEAPONS)}
          {renderSection('Rooms', 'rooms', ROOMS)}

          <div className="text-xs text-gray-400 mt-4">
            <p>? = Unknown</p>
            <p>✗ = Not the culprit</p>
            <p>✓ = It's the one!</p>
          </div>
        </div>
      )}
    </>
  );
}
