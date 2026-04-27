# Cluedo Project Understandings

## 1. Overview
This project is a web-based, real-time multiplayer implementation of the classic board game **Cluedo** (or Clue). It supports 2-6 players who join rooms via codes and attempt to solve a murder mystery by making suggestions and accusations.

## 2. Technology Stack
*   **Frontend:** Next.js 14 (App Router), React 18, Tailwind CSS, Socket.io Client.
*   **Backend:** Node.js, Express, Socket.io, TypeScript.
*   **Shared:** A `shared/` directory containing TypeScript interfaces, constants (Suspects, Weapons, Rooms), and socket event names.
*   **Persistence:** In-memory on the server (volatile), `localStorage` on the client for `userId`.

## 3. Core Architecture
*   **Server-Authoritative:** The server holds the master state (`RoomState`). Clients are "dumb" and render based on snapshots sent by the server.
*   **State-Driven UI:** Instead of routing to different pages for lobby/game, the app remains on the same dynamic route (`/[roomId]`) and switches views based on `gameState.phase`.
*   **Fog of War (Security):** The server strips out private information (like other players' cards or private logs) before broadcasting the state to a specific user.
*   **Persistent Identity:** `userId` is stored in `localStorage` and sent in the socket `auth` handshake, allowing for seamless reconnection.

## 4. Backend Structure (`server/src/`)
*   **`index.ts`:** Entry point, sets up Express and Socket.io. Handles socket event listeners.
*   **`GameManager.ts`:** The heart of the backend. Manages rooms, player connections/disconnections, and transitions between game phases.
*   **`GameLogic.ts`:** Pure functions for game rules: building the deck, drawing the solution (envelope), dealing cards, and checking if someone can disprove a suggestion.
*   **`TimerManager.ts`:** Manages turn and disprove timers (60 seconds) to keep the game moving.

## 5. Frontend Structure (`client/`)
*   **`GameSocketContext.tsx`:** Provides a unified socket connection and game state to the entire app via a React Context.
*   **`app/[roomId]/page.tsx`:** Main entry for a game room. Switches between `LobbyView` and `GameView`.
*   **`components/`:**
    *   `GameView.tsx`: The main game dashboard, coordinating the log, hand, actions, and modals.
    *   `Notebook.tsx`: A side panel for players to track their deductions.
    *   `PlayerCircle.tsx`: Visual representation of players and their turn status.
    *   `ChatWindow.tsx`: Handles both public and private messaging.
    *   `Modals/`: `SuggestModal`, `AccuseModal`, `DisproveModal` for interactive game actions.

## 6. Key Game Workflows
### A. Room Join/Create
1. User enters name on `page.tsx`.
2. `JOIN_ROOM` event sent to server.
3. Server creates/finds room and returns a success response.
4. Client navigates to `/[roomId]`.

### B. Suggestion & Disprove Loop
1. Player makes a suggestion.
2. Phase changes to `SUGGESTING` then `DISPROVING`.
3. Server identifies the next player in clockwise order who can disprove.
4. That player is prompted with a `DisproveModal`.
5. If they reveal a card, it's sent privately to the suggester.
6. The turn then advances.

### C. Accusation
1. Player makes an accusation.
2. Server checks against the `envelope`.
3. If correct, phase becomes `GAME_OVER` and they win.
4. If incorrect, player is marked `isEliminated` but remains in the game to disprove others.

## 7. Observations & Notes
*   **Redundancy:** There are two `useGameSocket` implementations (`GameSocketContext.tsx` and `useGameSocket.ts`). The project primarily uses the one in `GameSocketContext.tsx`.
*   **Responsive Design:** Uses Tailwind CSS with a grid layout for the `GameView`, adapting for various screen sizes.
*   **Timer Logic:** Timers are managed server-side but synced to the client via `timerEndsAt` timestamps.
*   **Socket Events:** Strictly defined in `shared/types.ts` to ensure consistency between client and server.
