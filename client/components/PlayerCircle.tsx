'use client';

import { Player } from '@shared/types';

interface PlayerCircleProps {
  players: Player[];
  currentTurnIndex: number;
  onPlayerClick?: (userId: string) => void;
}

export function PlayerCircle({
  players,
  currentTurnIndex,
  onPlayerClick,
}: PlayerCircleProps) {
  const anglePerPlayer = 360 / players.length;

  return (
    <div className="flex justify-center items-center py-8">
      <div className="relative w-96 h-96">
        {players.map((player, index) => {
          const angle = (anglePerPlayer * index - 90) * (Math.PI / 180);
          const radius = 140;
          const x = 192 + radius * Math.cos(angle);
          const y = 192 + radius * Math.sin(angle);

          const isActive = index === currentTurnIndex;
          const isGlowing = isActive && !player.isEliminated;

          return (
            <button
              key={player.userId}
              onClick={() => onPlayerClick?.(player.userId)}
              className="absolute w-24 h-24 rounded-full flex flex-col items-center justify-center text-center text-xs font-semibold transition-all"
              style={{
                backgroundColor: player.color,
                left: `${x - 48}px`,
                top: `${y - 48}px`,
                boxShadow: isGlowing
                  ? `0 0 20px ${player.color}, 0 0 40px ${player.color}`
                  : player.isEliminated
                    ? 'inset 0 0 10px rgba(0,0,0,0.5)'
                    : 'none',
                opacity: player.isEliminated ? 0.5 : 1,
              }}
            >
              <div className="text-white drop-shadow-md">
                {player.isEliminated ? '💀' : player.name.split(' ')[0]}
              </div>
              <div className="text-white text-xs drop-shadow-md">
                {player.hand.length} cards
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
