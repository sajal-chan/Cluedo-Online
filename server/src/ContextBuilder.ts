import { Card } from '@shared/types';
import { BotNotepad } from './BotNotepad';

export interface BotContext {
  knownInEnvelope: string[];
  possibleCards: {
    suspects: string[];
    weapons: string[];
    rooms: string[];
  };
  myHand: string[];
}

export class ContextBuilder {
  static build(notepad: BotNotepad, myHand: Card[]): string { //explain this line, what does static build do in general, 
    const context: BotContext = {
      knownInEnvelope: notepad.getDeductions(),
      possibleCards: notepad.getPossibleCards(),
      myHand: myHand.map(c => c.name),
    };

    return JSON.stringify(context);
  }
}
