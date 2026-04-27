import { Card, SUSPECTS, WEAPONS, ROOMS } from '@shared/types';
import { LLMResponse } from './LLMService';

export class Validator {
  static validate(response: any): LLMResponse | null {
    try {
      const data = typeof response === 'string' ? JSON.parse(response) : response;
      if (!['SUGGESTION', 'ACCUSATION'].includes(data.type)) return null;
      if (!SUSPECTS.includes(data.suspect)) return null;
      if (!WEAPONS.includes(data.weapon)) return null;
      if (!ROOMS.includes(data.room)) return null;
      return data as LLMResponse;
    } catch {
      return null;
    }
  }

  /**
   * Generates a move using provided possible cards or random ones as a last resort.
   */
  static getFallbackMove(possible?: { suspects: string[], weapons: string[], rooms: string[] }): LLMResponse {
    const suspectList = possible?.suspects.length ? possible.suspects : SUSPECTS;
    const weaponList = possible?.weapons.length ? possible.weapons : WEAPONS;
    const roomList = possible?.rooms.length ? possible.rooms : ROOMS;

    return {
      type: 'SUGGESTION',
      suspect: suspectList[Math.floor(Math.random() * suspectList.length)],
      weapon: weaponList[Math.floor(Math.random() * weaponList.length)],
      room: roomList[Math.floor(Math.random() * roomList.length)],
      reasoning: 'Informed fallback based on remaining possible cards.'
    };
  }
}
