Here's an improved, Haiku-4.5-optimized version of your prompt. The key changes: tighter constraints, explicit file trees, and concrete code contracts so the model doesn't hallucinate architecture.

---

# Cluedo-Inspired Multiplayer Deduction Game — Full Implementation

## Role & Objective
You are a Senior Full Stack TypeScript Engineer. Implement a complete, working multiplayer deduction game in a monorepo. Write all files. Do not skip implementation details or leave TODOs.

---

## Monorepo File Tree (create exactly this)

```
/
├── shared/
│   └── types.ts
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts          # Express + Socket.io entry
│   │   ├── GameManager.ts    # Room & player lifecycle
│   │   ├── GameLogic.ts      # Deck, dealing, disprove loop
│   │   └── TimerManager.ts   # 60s disprove timer
├── client/
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx          # Home: name input + create/join
│   │   ├── lobby/[roomId]/page.tsx
│   │   └── game/[roomId]/page.tsx
│   └── components/
│       ├── PlayerCircle.tsx
│       ├── MyHand.tsx
│       ├── Notebook.tsx
│       ├── SuggestModal.tsx
│       ├── DisproveModal.tsx  # Forced — cannot be dismissed
│       ├── AccuseModal.tsx
│       └── PrivateChatModal.tsx
```
---

## Architecture — Key Decisions Explained 

### Why server-side disprove calculation?
The server owns all hands. Clients never see each other's cards. If the client calculated "who should disprove next," a cheating client could lie. The server iterates the disprove loop, decides who is next, and only ever sends a player their own hand.

### State broadcasting — per-player stripping
After every mutation, `broadcastState()` runs. It calls `getStateForPlayer(roomId, userId)` for each connected player individually. This function returns a `GameState` where `players[i].hand` is populated only for the receiving player — every other player's hand is an empty array `[]`. This is enforced at the serialization layer, not by trusting clients.

### Single source of truth
`GameManager` holds all room/game state in memory (`Map<roomId, RoomState>`). There is no database. The frontend holds a local copy of `GameState` received from the server and never mutates it directly — all changes go through socket events.

### Reconnection flow
```
Client reconnects → sends auth: { userId }
Server: find userId in GameManager across all rooms
If found: rebind socketId, set isConnected = true, emit GAME_STATE_UPDATE with their hand
If not found: treat as new player
```
The `userId` in `localStorage` is the only identity. If a player clears localStorage they become a new player and cannot reclaim their old hand.

### DisproveContext is the pause mechanism
When the server needs to pause for a disprover, it sets `gameState.disproveContext` and changes `phase = 'DISPROVING'`. The frontend checks: "is phase DISPROVING AND is my userId === disproveContext.currentDisproverUserId?" If yes, show the forced modal. The timer runs against this context. When resolved (card revealed or timer expired), server clears `disproveContext`, advances the loop or ends the suggestion, and sets `phase` back to `IDLE` for the next turn.

### Private chat is stateless
Private messages are never stored server-side. The server receives `private_message` from socket A and immediately forwards it to the current `socketId` of the target `userId`. If the target is disconnected, the message is silently dropped. No history, no queue.

---
---

## Tech Stack
- **Frontend:** Next.js 14 App Router, Tailwind CSS, `socket.io-client`
- **Backend:** Node.js, Express, `socket.io`, TypeScript strict mode
- **Shared:** `shared/types.ts` imported by both via `tsconfig` path alias `@shared/*`

---

## Step 1 — Shared Types (`shared/types.ts`)

Define and export **all** of the following. Do not add extras, do not omit any.

```ts
// Card
type CardCategory = 'SUSPECT' | 'WEAPON' | 'ROOM'
interface Card { category: CardCategory; name: string }

// Static card lists (export these as constants)
SUSPECTS: string[6]   // e.g. Miss Scarlett, Col. Mustard, ...
WEAPONS:  string[6]   // e.g. Candlestick, Knife, ...
ROOMS:    string[9]   // e.g. Kitchen, Ballroom, ...

// Player
interface Player {
  userId: string        // persistent (from localStorage)
  socketId: string      // current socket (changes on reconnect)
  name: string
  color: string         // one of 6 neon/pastel hex values, assigned on join
  hand: Card[]
  isEliminated: boolean
  isConnected: boolean
}

// Envelope (solution)
interface Envelope { suspect: Card; weapon: Card; room: Card }

// Game phases
type GamePhase = 'LOBBY' | 'IDLE' | 'SUGGESTING' | 'DISPROVING' | 'ACCUSING' | 'GAME_OVER'

// Active disprove context
interface DisproveContext {
  suggestionId: string
  suggestion: { suspect: Card; weapon: Card; room: Card }
  suggesterUserId: string
  currentDisproverUserId: string
  remainingDisprovers: string[]  // userIds still to check, in clockwise order
}

// Full game state (sent to clients — hand is stripped per-player server-side)
interface GameState {
  roomId: string
  phase: GamePhase
  players: Player[]           // hands are EMPTY ARRAYS except for the receiving player
  currentTurnIndex: number
  disproveContext: DisproveContext | null
  timerEndsAt: number | null  // epoch ms, null if no timer running
  log: LogEntry[]
  winnerId: string | null
}

interface LogEntry {
  timestamp: number
  message: string             // human-readable, e.g. "Player A disproved B's suggestion"
  isPrivate: boolean
  visibleTo: string[]         // userIds. empty = everyone
}

// Socket events — define as a const map for both client and server to import
SocketEvents {
  // Client → Server
  JOIN_ROOM, START_GAME, MAKE_SUGGESTION, REVEAL_CARD,
  MAKE_ACCUSATION, SEND_PRIVATE_MSG, RECONNECT_AUTH

  // Server → Client
  GAME_STATE_UPDATE, PRIVATE_REVEAL, REQUEST_REVEAL,
  PRIVATE_MESSAGE, ERROR_MSG, TIMER_UPDATE
}
```

---

## Game Rules — Detailed Explanation (add after Step 1)

This section exists so the model understands *why* the code works the way it does, not just *what* to build.

### The Core Concept
Three cards are secretly sealed in an envelope at game start: one suspect, one weapon, one room. Every other card is dealt to players. The goal is to deduce what's in the envelope by making suggestions and watching what others can (or can't) disprove.

### The Suggestion Loop — Step by Step
This is the most complex piece of logic in the game. When it's your turn you name any combination of [Suspect, Weapon, Room] — you're allowed to name cards you're already holding, because the point is information gathering, not playing cards you don't have.

After you submit, the server runs the disprove loop:
1. Starting from the player immediately clockwise of you, check if they hold *any* of the three named cards.
2. If they hold zero matching cards → automatically skip them, log it publicly ("Player B couldn't disprove"), move to the next player clockwise.
3. If they hold one or more matching cards → pause the game. Send `REQUEST_REVEAL` only to that player. Everyone else sees nothing yet.
4. That player must choose exactly one card to reveal. They might have two matching cards — they pick strategically.
5. The revealed card is sent *only* to the suggester via `PRIVATE_REVEAL`. Everyone else receives a public log entry: "Player C disproved Player A's suggestion" — they don't see which card.
6. After resolution, the disprove loop ends (you don't continue checking the remaining players).
7. If the loop goes all the way around with no one disproving → public announcement: "No one could disprove."

This asymmetry of information — suggester learns the specific card, everyone else only learns that *someone* disproved it — is the entire strategic depth of the game.

### Accusation vs Suggestion
- A **suggestion** is safe. You can suggest every turn. You learn one piece of info.
- An **accusation** is final. You're claiming you know the exact envelope contents. If correct, you win. If wrong, you're eliminated — but critically, you're not removed from the game. You stay at the table, you still participate in disprove loops (you still hold your cards and must show them when asked), you just can't take turns or make further accusations. This prevents the strategy of "accuse wrong on purpose to deny others information."

### Turn Order & Elimination Nuance
Turn order is strictly clockwise by `players[]` array index. When advancing turns, skip any player where `isEliminated === true`. However, the disprove loop must **not** skip eliminated players — they still hold cards that could disprove a suggestion.

### Win / End Conditions
- A player makes a correct accusation → they win, `phase = GAME_OVER`, `winnerId` set.
- All players are eliminated → `phase = GAME_OVER`, `winnerId = null`, log "No winner."


---



## Step 2 — Backend

### `GameManager.ts`

Implement these methods with exact signatures:

```ts
class GameManager {
  createRoom(ownerUserId: string, ownerName: string): string  // returns roomId (6-char uppercase)
  joinRoom(roomId: string, userId: string, name: string): JoinResult
  reconnectPlayer(userId: string, newSocketId: string): ReconnectResult
  handleDisconnect(socketId: string): void
  startGame(roomId: string, requestingUserId: string): void
  handleSuggestion(roomId, userId, suspect: Card, weapon: Card, room: Card): void
  handleReveal(roomId, revealerUserId, card: Card): void
  handleAccusation(roomId, userId, suspect: Card, weapon: Card, room: Card): void
}
```

**Room locking rule:** `room.isLocked = players.length === 6 || gameStarted === true`. `joinRoom` must reject if locked.

**Reconnect rule:** If `userId` exists in any active room, rebind `socketId`, set `isConnected = true`, and emit `GAME_STATE_UPDATE` with that player's hand included.

**`getStateForPlayer(roomId, userId)`** — strips all other players' hands before sending.

### `GameLogic.ts`

```ts
function buildDeck(): Card[]                               // all 21 cards
function drawEnvelope(deck: Card[]): { envelope: Envelope; remaining: Card[] }
function dealCards(cards: Card[], playerCount: number): Card[][]  // uneven OK, last player(s) get fewer
function getNextDisprover(
  players: Player[],
  suggesterIndex: number,
  suggestion: { suspect: Card; weapon: Card; room: Card }
): { disprover: Player; skipped: Player[] } | null         // null = no one can disprove
function checkAccusation(envelope: Envelope, accusation: { suspect: Card; weapon: Card; room: Card }): boolean
```

**Disprove loop rule:** Iterate clockwise from `(suggesterIndex + 1) % players.length`. Skip `isEliminated` players **only for turn order** — eliminated players **must still be checked** as potential disprovers (they still hold cards).

### `TimerManager.ts`

```ts
class TimerManager {
  start(roomId: string, durationMs: number, onExpire: () => void): void
  clear(roomId: string): void
}
```

On expire: auto-skip the disprover (treat as "no matching card shown"), advance disprove loop.

### `index.ts`

- Express serves `/health`
- Socket.io on same port (default `3001`)
- On `connection`: read `socket.handshake.auth.userId` and call `reconnectPlayer`
- Wire all `SocketEvents` to `GameManager` methods
- After every state mutation, call `broadcastState(roomId)` which sends `getStateForPlayer` to each player individually

---

## Step 3 — Frontend

### `useGameSocket.ts` (custom hook)

```ts
// On mount:
// 1. Read or generate UUID from localStorage key 'clue_userId'
// 2. Connect socket with auth: { userId }
// 3. Listen to all Server→Client events and update local state
// Returns: { gameState, myHand, emit helpers }
```

### Pages

**`app/page.tsx` (Home)**
- Input: player name
- Buttons: "Create Room" / "Join Room" (with room code input)
- On create: emit `JOIN_ROOM` with a new roomId, redirect to `/lobby/[roomId]`

**`app/lobby/[roomId]/page.tsx`**
- List connected players with their assigned color dot
- "Start Game" button visible only to room owner (`players[0]`)
- Show "Waiting..." if < 2 players

**`app/game/[roomId]/page.tsx`**
- Render `<PlayerCircle>`, `<MyHand>`, `<Notebook>`, action buttons, log
- Show `<DisproveModal>` when `gameState.phase === 'DISPROVING'` and it's your turn to disprove — **this modal cannot be closed until a card is selected**
- Show turn timer countdown derived from `timerEndsAt`

### Component specs

**`PlayerCircle.tsx`** — SVG or CSS circle layout. Highlight active player with a glowing ring matching their color. Show skull icon on eliminated players. Click avatar → open `PrivateChatModal`.

**`Notebook.tsx`** — Frontend only, no socket. Collapsible sidebar. Three sections (Suspects, Weapons, Rooms). Each item has 3-state toggle: unknown → clear → marked.

**`DisproveModal.tsx`** — Receives `matchingCards: Card[]`. Renders each as a clickable card. Emits `REVEAL_CARD` on click. No close button.

---

## Styling Rules

- Dark mode only: background `#0f0f0f`, surface `#1a1a1a`, border `#2a2a2a`
- Player colors (assign in order): `['#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#FFEAA7','#DDA0DD']`
- Font: Inter or system-ui
- All modals: backdrop blur, centered, `z-50`

---

## Constraints & Edge Cases to Handle

1. **Uneven deal:** If 18 cards / 5 players, distribute as `[4,4,4,3,3]` — no card left undealt.
2. **Eliminated player in disprove loop:** Still checked for matching cards. Only skipped for *taking turns*.
3. **Solo disprove:** If only one player has a matching card and they have multiple matching cards, they choose which one to reveal.
4. **Timer expiry:** Log "Player X ran out of time, skipped." and advance loop.
5. **All eliminated:** If all players are eliminated without a correct accusation, emit game over with no winner.
6. **Reconnect mid-disprove:** If the disprover reconnects, re-emit `REQUEST_REVEAL` with `DisproveContext`.

---

## Output Order

Generate files in this exact order:
1. `shared/types.ts`
2. `server/src/GameLogic.ts`
3. `server/src/TimerManager.ts`
4. `server/src/GameManager.ts`
5. `server/src/index.ts`
6. `client/components/` (all)
7. `client/app/` pages
8. Both `package.json` files with exact dependency versions

Do not truncate any file. Each file must be complete and runnable.

---

This version will perform significantly better with Haiku 4.5 because it eliminates ambiguity at every decision point — the model just needs to fill in implementations, not make architectural choices.

Good call. Here are the two sections to add, plus a few other gaps I noticed:




## Additional Gaps from the Original Prompt Worth Covering

**Package versions to pin** — add this to avoid Haiku guessing:
```json
// server
"socket.io": "4.7.x", "express": "4.18.x", "typescript": "5.x"
// client  
"next": "14.x", "socket.io-client": "4.7.x", "tailwindcss": "3.x"
```

**Environment config** — tell the model to use a `.env` with `PORT=3001` and `NEXT_PUBLIC_SOCKET_URL=http://localhost:3001`, and read these via `process.env` with fallbacks. Otherwise Haiku will hardcode values.

**CORS** — explicitly tell it: `cors({ origin: 'http://localhost:3000', credentials: true })` on the Express server, otherwise the socket connection will silently fail in development.

**tsconfig path alias** — both `client/tsconfig.json` and `server/tsconfig.json` need `"paths": { "@shared/*": ["../shared/*"] }`. Without this instruction the model will likely use relative imports like `../../shared/types` inconsistently.

**The `START_GAME` guard** — add explicitly: only the room owner (index 0) can start, and the server must validate this, not just the UI. Minimum 2 players required to start.

---

Adding these sections should close the main failure modes: the model misunderstanding the disprove loop direction, broadcasting full hands to all clients, or producing frontend validation only. The architecture section in particular gives Haiku the *reasoning* behind the constraints so it doesn't "simplify" them away.