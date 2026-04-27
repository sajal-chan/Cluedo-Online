import axios from 'axios';
import { Validator } from './Validator';

export interface LLMResponse {
  type: 'SUGGESTION' | 'ACCUSATION';
  suspect: string;
  weapon: string;
  room: string;
  reasoning: string;
}

export class LLMService {
  private static API_KEY = process.env.GROQ_API;
  private static API_URL = process.env.LLM_API_URL || 'https://api.groq.com/openai/v1/chat/completions';
  private static USE_MOCK = process.env.USE_MOCK_LLM === 'true';

  static async fetchMove(
    context: string, 
    possibleCards?: { suspects: string[], weapons: string[], rooms: string[] },
    isBluffing: boolean = false
  ): Promise<LLMResponse> {
    if (this.USE_MOCK) {
      return Validator.getFallbackMove(possibleCards);
    }
    
    const systemPrompt = isBluffing 
      ? `
      You are a Cluedo strategist in BLUFF mode.
      Analyze the game state and return a JSON SUGGESTION.
      Since you are BLUFFING, you MUST include 1 or 2 cards in your suggestion that you ALREADY HAVE in your hand.
      This misleads opponents about what you know.
      
      Return ONLY valid JSON:
      {
        "type": "SUGGESTION",
        "suspect": "string",
        "weapon": "string",
        "room": "string",
        "reasoning": "string"
      }
      `
      : `
      You are a Cluedo strategist.
      Analyze the game state and return a JSON object for your next move.
      Decide whether to make a SUGGESTION or an ACCUSATION.
      Only ACCUSE if you are 100% certain of all 3 cards.
      
      Return ONLY valid JSON:
      {
        "type": "SUGGESTION" | "ACCUSATION",
        "suspect": "string",
        "weapon": "string",
        "room": "string",
        "reasoning": "string"
      }
      `;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    try { //TODO: give the LLM a strict response format which it should match
      const response = await axios.post(
        this.API_URL,
        {
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: context }
          ],
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.API_KEY}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);
      const content = response.data.choices[0].message.content;
      const parsed = typeof content === 'string' ? JSON.parse(content) : content;
      
      console.log(`[LLM] Response received: ${parsed.type}`);

      const validated = Validator.validate(parsed);
      if (!validated) {
        console.log(`[LLM] Validation failed, using fallback`);
        return Validator.getFallbackMove(possibleCards);
      }
      
      return validated;
      
    } catch (error) {
      clearTimeout(timeoutId);
      const isTimeout = axios.isCancel(error);
      if (axios.isAxiosError(error)) {
        console.error(`[LLM] API Error: ${error.response?.status} - ${JSON.stringify(error.response?.data)}`);
      } else {
        console.error(`[LLM] Unexpected Error:`, error);
      }
      console.log(`[LLM] ${isTimeout ? 'Timeout' : 'Error'}, using fallback`);
      return Validator.getFallbackMove(possibleCards);
    }
  }
}
