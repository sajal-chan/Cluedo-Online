import { Card, Envelope, SUSPECTS, WEAPONS, ROOMS, Player } from '../../shared/types';

export function buildDeck(): Card[] {
  const deck: Card[] = [];

  // Add suspects
  SUSPECTS.forEach((name) => {
    deck.push({ category: 'SUSPECT', name });
  });

  // Add weapons
  WEAPONS.forEach((name) => {
    deck.push({ category: 'WEAPON', name });
  });

  // Add rooms
  ROOMS.forEach((name) => {
    deck.push({ category: 'ROOM', name });
  });

  return deck;
}

export function drawEnvelope(
  deck: Card[]
): { envelope: Envelope; remaining: Card[] } {
  const shuffled = [...deck].sort(() => Math.random() - 0.5);

  // Draw one suspect, one weapon, one room
  let suspectCard: Card | null = null;
  let weaponCard: Card | null = null;
  let roomCard: Card | null = null;

  const remaining: Card[] = [];

  for (const card of shuffled) {
    if (!suspectCard && card.category === 'SUSPECT') {
      suspectCard = card;
    } else if (!weaponCard && card.category === 'WEAPON') {
      weaponCard = card;
    } else if (!roomCard && card.category === 'ROOM') {
      roomCard = card;
    } else {
      remaining.push(card);
    }
  }

  return {
    envelope: {
      suspect: suspectCard!,
      weapon: weaponCard!,
      room: roomCard!,
    },
    remaining,
  };
}

export function dealCards(cards: Card[], playerCount: number): Card[][] {
  const shuffled = [...cards].sort(() => Math.random() - 0.5);
  const hands: Card[][] = Array.from({ length: playerCount }, () => []);

  shuffled.forEach((card, index) => {
    hands[index % playerCount].push(card);
  });

  return hands;
}

export function getNextDisprover(
  players: Player[],
  suggesterIndex: number,
  suggestion: { suspect: Card; weapon: Card; room: Card }
): { disprover: Player; skipped: Player[] } | null {
  const skipped: Player[] = [];
  const playerCount = players.length;

  // Start from next player clockwise
  for (let i = 1; i < playerCount; i++) {
    const playerIndex = (suggesterIndex + i) % playerCount;
    const player = players[playerIndex];

    // Check if player has any matching card (skip eliminated players for disprove checking only in turn order, but NOT for deciding if they can disprove)
    // Actually, re-reading the rules: "eliminated players must still be checked as potential disprovers"
    // So we check all players, eliminated or not, for matching cards
    const hasMatchingCard = player.hand.some(
      (card) =>
        card.name === suggestion.suspect.name ||
        card.name === suggestion.weapon.name ||
        card.name === suggestion.room.name
    );

    if (hasMatchingCard) {
      return { disprover: player, skipped };
    }

    skipped.push(player);
  }

  // No one could disprove
  return null;
}

export function checkAccusation(
  envelope: Envelope,
  accusation: { suspect: Card; weapon: Card; room: Card }
): boolean {
  return (
    envelope.suspect.name === accusation.suspect.name &&
    envelope.weapon.name === accusation.weapon.name &&
    envelope.room.name === accusation.room.name
  );
}
