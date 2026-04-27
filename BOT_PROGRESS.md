# Cluedo Bot Implementation Progress

## Project Goal
Implement a Neuro-Symbolic Cluedo bot.
- **Symbolic Brain:** TypeScript logic for perfect memory and inference.
- **Neural Engine:** LLM (via Groq/Llama 3) for strategic decision-making.
- **Safety:** 2500ms circuit breaker with a deterministic math-based fallback.

## Current Status: Phase 5 (UX Mask) Complete & Verified
The frontend is updated with AI badges and thinking overlays. Backend features a 6-8s human-like delay for all bot actions.

## Completed Components
0.  **Environment:** Integrated `dotenv` to correctly load `GROQ_API` and other secrets.
1.  **Shared Types:** Added `isBot` to `Player`, included `Mrs. Peacock`, and added `ADD_BOT`, `BOT_THINKING` events.
2.  **BotNotepad.ts:** 2D matrix (Cards x Players) for perfect memory and logical inference.
3.  **ContextBuilder.ts:** Converts notepad data into compact LLM briefings.
4.  **LLMService.ts:** Handles API calls with 2500ms timeout, detailed Axios error logging, and automatic fallbacks.
5.  **Validator.ts:** Ensures LLM output is valid and provides informed random fallbacks.
6.  **GameManager.ts:** Full integration of bot turns, automatic disprovals, knowledge updates, and thinking state management. Enforces 6-8s delay for human-like pace.
7.  **Frontend UI:** Added "Add AI Bot" button (Lobby) and "Bot Thinking" overlay (Game).

## Pending Tasks
1.  **Final Polish:** Monitor server logs during play to tune the LLM system prompt if needed.


## Architecture Reminders
- **Stateless LLM:** Provide a full game snapshot in every prompt; do not rely on LLM memory.
- **Precise Comments:** Keep code comments minimal and high-signal.
- **Fallback First:** If the AI fails or is too slow, the game must proceed instantly with a random move.
