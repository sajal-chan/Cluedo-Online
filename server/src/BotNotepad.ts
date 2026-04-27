import { Card, SUSPECTS, WEAPONS, ROOMS } from '@shared/types';

export enum Knowledge {
  HAS = 'HAS',
  DOES_NOT_HAVE = 'DOES_NOT_HAVE',
  UNKNOWN = 'UNKNOWN',
}

export class BotNotepad {
  
  // matrix[cardName][userId] = Knowledge
  private matrix: Record<string, Record<string, Knowledge>> = {};
  private allCards: string[];
  private players: string[];

  /**
   * The specific ID of the bot using this notepad.
   */
  private ownUserId: string;

  static create(ownUserId: string, allPlayerUserIds: string[], ownHand: Card[]): BotNotepad {
    return new BotNotepad(ownUserId, allPlayerUserIds, ownHand);
  }

  constructor(ownUserId: string, allPlayerUserIds: string[], ownHand: Card[]) {
    this.allCards = [...SUSPECTS, ...WEAPONS, ...ROOMS];
    this.players = allPlayerUserIds;
    this.ownUserId = ownUserId;

    // 1. Initialize matrix with UNKNOWN for every card/player combination
    for (const card of this.allCards) {
      this.matrix[card] = {};
      for (const userId of this.players) {
        this.matrix[card][userId] = Knowledge.UNKNOWN;
      }
    }

    // 2. Load the bot's own hand into the matrix (Ground Truth)
    this.initializeOwnHand(ownHand);
  }

  private initializeOwnHand(hand: Card[]) {
    const handCardNames = hand.map(c => c.name);
    
    for (const cardName of this.allCards) {
      if (handCardNames.includes(cardName)) {
        // I HAVE this card
        this.setKnowledge(cardName, this.ownUserId, Knowledge.HAS);
        
        // Therefore, NO ONE ELSE can have it
        for (const otherUserId of this.players) {
          if (otherUserId !== this.ownUserId) {
            this.setKnowledge(cardName, otherUserId, Knowledge.DOES_NOT_HAVE);
          }
        }
      } else {
        // I DO NOT have this card
        this.setKnowledge(cardName, this.ownUserId, Knowledge.DOES_NOT_HAVE);
      }
    }
  }

  /**
   * Updates the knowledge for a specific card and player.
   * Triggers the inference engine to see if new facts can be deduced.
   */
  setKnowledge(cardName: string, userId: string, knowledge: Knowledge) {
    if (this.matrix[cardName] && this.matrix[cardName][userId] !== undefined) {
      this.matrix[cardName][userId] = knowledge;
      this.runInference();
    }
  }

  getKnowledge(cardName: string, userId: string): Knowledge {
    return this.matrix[cardName]?.[userId] || Knowledge.UNKNOWN;
  }

  /**
   * Logical inference engine. 
   * Example: If we know Player A HAS the 'Rope', we can deduce that everyone else DOES NOT have it.
   */
  private runInference() {
    for (const cardName of this.allCards) {
      let knownOwnerId: string | null = null;
      
      // Check if we found an owner
      for (const userId of this.players) {
        if (this.matrix[cardName][userId] === Knowledge.HAS) {
          knownOwnerId = userId;
          break;
        }
      }

      // If we know the owner, mark everyone else as DOES_NOT_HAVE
      if (knownOwnerId) {
        for (const userId of this.players) {
          if (userId !== knownOwnerId && this.matrix[cardName][userId] !== Knowledge.DOES_NOT_HAVE) {
            this.matrix[cardName][userId] = Knowledge.DOES_NOT_HAVE;
          }
        }
      }
    }
  }

  /**
   * Returns a list of cards that are 100% known to be in the envelope.
   * This happens when every single player is confirmed to NOT have the card.
   */
  getDeductions(): string[] {
    const envelopeCards: string[] = [];
    
    for (const cardName of this.allCards) {
      const nobodyHasIt = this.players.every(
        userId => this.matrix[cardName][userId] === Knowledge.DOES_NOT_HAVE
      );
      
      if (nobodyHasIt) {
        envelopeCards.push(cardName);
      }
    }
    
    return envelopeCards;
  }

  /**
   * Updates matrix based on suggestion results.
   */
  processSuggestionResult(
    suggesterUserId: string,
    suggestion: { suspect: Card; weapon: Card; room: Card },
    skippedUserIds: string[],
    revealerUserId?: string,
    revealedCard?: Card
  ) {
    const cards = [suggestion.suspect.name, suggestion.weapon.name, suggestion.room.name];

    // Mark skipped players as not having any of the suggested cards
    for (const userId of skippedUserIds) {
      for (const cardName of cards) {
        this.setKnowledge(cardName, userId, Knowledge.DOES_NOT_HAVE);
      }
    }

    if (revealerUserId) {
      if (revealedCard) {
        // Bot knows exactly which card was revealed
        this.setKnowledge(revealedCard.name, revealerUserId, Knowledge.HAS);
      } else {
        // Infer if player must have a specific card from this suggestion
        this.checkIfOnlyOnePossible(revealerUserId, cards);
      }
    }
    
    this.runInference();
  }

  private checkIfOnlyOnePossible(userId: string, cards: string[]) {
    const unknown = cards.filter(c => this.getKnowledge(c, userId) === Knowledge.UNKNOWN);
    const doesNotHave = cards.filter(c => this.getKnowledge(c, userId) === Knowledge.DOES_NOT_HAVE);
    
    // If only one card is unknown and others are confirmed DOES_NOT_HAVE, player MUST have the unknown one
    if (unknown.length === 1 && doesNotHave.length === cards.length - 1) {
      this.setKnowledge(unknown[0], userId, Knowledge.HAS);
    }
  }

  /**
   * Returns remaining possible cards for the envelope.
   */
  getPossibleCards(): { suspects: string[], weapons: string[], rooms: string[] } {
    return {
      suspects: SUSPECTS.filter(c => this.isPossibleEnvelopeCard(c)),
      weapons: WEAPONS.filter(c => this.isPossibleEnvelopeCard(c)),
      rooms: ROOMS.filter(c => this.isPossibleEnvelopeCard(c)),
    };
  }

  private isPossibleEnvelopeCard(cardName: string): boolean {
    // Possible if no player is known to have it
    return this.players.every(userId => this.getKnowledge(cardName, userId) !== Knowledge.HAS);
  }

  getMatrix() {
    return this.matrix;
  }
}
