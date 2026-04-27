# Cluedo Neuro-Symbolic Bot Implementation Plan

## 1. Architectural Overview
I am implementing a single-player bot system for my Cluedo game. My architecture uses a **Neuro-Symbolic** approach: 
* The **Symbolic Engine** (TypeScript) maintains the strict rules of the game and a perfect deduction memory. 
* The **Neural Engine** (LLM API) is used exclusively for strategic decision-making (e.g., bluffing, deducing the next best suggestion). 
* I am intentionally omitting LLM-generated chat to eliminate latency, reduce costs, and focus the AI purely on gameplay logic.

---

## 2. Implementation Phases & Deliverables

### Phase 1: The Symbolic Brain (Memory & Logic)
Before I involve the LLM, my bots need a mathematically perfect memory of the game. I will build the internal data structures to track all game clues.

* **Flow:** When the `GameManager` broadcasts a move, suggestion, or card reveal, my bot instances intercept this data. They update a 2D matrix, marking cards as `HAS`, `DOES_NOT_HAVE`, or `UNKNOWN` for every player in the game.
* **Deliverables:**
    * `BotNotepad.ts`: A class containing the 2D deduction matrix (21 Cards x 6 Players).
    * `updateMatrix(event)`: A method that parses socket events (e.g., "Player 3 showed a card to Player 1") and automatically updates the matrix constraints.
    * `getValidMoves(currentRoom)`: A helper function that returns an array of legally allowed suspects and weapons based on the bot's current board position.

### Phase 2: The Context Pipeline (Prompt Assembly)
To avoid "context bloat" and save on API costs, I will distill my bot's perfect memory into a highly compressed format before sending it to the LLM.

* **Flow:** At the start of a bot's turn, my backend queries the `BotNotepad`. It extracts only the known facts (e.g., "I know the Lead Pipe is innocent") and the legal options. It injects this into a strict JSON-enforced system prompt.
* **Deliverables:**
    * `ContextBuilder.ts`: A utility that formats the `BotNotepad` data into a lightweight JSON string.
    * **System Prompt Template:** A hardcoded instruction set instructing the LLM to act as a Cluedo strategist, strictly defining the required JSON output schema (e.g., `{ "suspect": string, "weapon": string }`).

### Phase 3: The Neural Integration & Circuit Breaker (API Layer)
I need to connect to the external LLM without blocking my Node.js event loop or leaving my human players waiting.

* **Flow:** The `GameManager` triggers an asynchronous API call to the LLM. Simultaneously, a timer starts. If the LLM responds in time, the JSON is passed to the validation layer. If the timer expires first, the API call is aborted.
* **Deliverables:**
    * `LLMService.ts`: The wrapper class for the external API call (e.g., Gemini).
    * **The Circuit Breaker:** A `Promise.race()` implementation that pits the API call against a strict 2500ms `setTimeout`. 
    * **Local Dev Mock:** An environment variable toggle (`USE_MOCK_LLM=true`) that instantly returns a hardcoded JSON response to save API costs during local development.

### Phase 4: Validation & Fallback (The Bouncer)
I cannot trust the LLM. I must sanitize its output to prevent game-breaking hallucinations.

* **Flow:** The LLM returns a JSON object. My validation layer intercepts it. It checks if the suggested cards exist and if the move is legal. If it passes, the move goes to the `GameManager`. If it fails (or if the Circuit Breaker tripped), my system instantly executes a safe fallback.
* **Deliverables:**
    * `Validator.ts`: A strict schema validator (potentially using a library like Zod) to verify the LLM's JSON payload.
    * **Deterministic Fallback Engine:** A pure TypeScript function that uses `Math.random()` to select a valid room, suspect, and weapon from the `getValidMoves()` array if the LLM fails.

### Phase 5: The UX Mask (Frontend Sync)
I need to ensure the human player feels the suspense of the bot "thinking" while my server handles the heavy lifting in the background.

* **Flow:** The moment my server triggers Phase 3, it emits a specific socket event to the room. The frontend receives this and renders a visual indicator. Once Phase 4 completes and the actual move is emitted, the indicator is hidden.
* **Deliverables:**
    * **Backend Socket Event:** Emit `BOT_THINKING` with the active bot's `userId`.
    * **Frontend State Listener:** A `useEffect` in `useGameSocket.ts` that listens for the event and sets an `isBotThinking` React state.
    * **UI Indicator:** A visual component on the game board (e.g., an animated magnifying glass or "Thinking..." text over the bot's avatar) that conditionally renders based on the `isBotThinking` state.

---

## 3. The Complete Turn Sequence
To visualize how these phases interact, here is the exact execution flow for a single bot turn:

1. **Trigger:** `GameManager` sets `activePlayer` to a Bot.
2. **Mask ON:** Server emits `BOT_THINKING`. Frontend displays the loading animation.
3. **Assemble:** Server pulls matrix data and valid moves from `BotNotepad`.
4. **Fetch:** `LLMService` makes the async API call with a 2500ms timeout.
5. **Verify:** `Validator` checks the LLM's JSON response.
    * *Pass:* Proceed with LLM's strategic move.
    * *Fail/Timeout:* Execute `Math.random()` deterministic fallback move.
6. **Execute:** Server applies the final move to the master game state.
7. **Mask OFF:** Server broadcasts `GAME_STATE_UPDATE`. Frontend hides the loading animation and animates the move.