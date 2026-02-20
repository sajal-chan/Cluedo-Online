# Cluedo - Multiplayer Deduction Game

A full-stack web-based multiplayer deduction game inspired by the classic Cluedo board game. Built with TypeScript, Node.js, Express, Socket.io, Next.js, and Tailwind CSS.

## Features

- **Multiplayer Gameplay**: Play with 2-6 players online
- **Real-time Communication**: Instant game state updates using Socket.io
- **Strategic Deduction**: Make suggestions and accusations to deduce who committed the crime
- **Private Messaging**: Send strategic private messages to other players
- **Game Log**: Track all moves and disprove attempts
- **Detective Notebook**: Keep track of clues and eliminate suspects
- **Turn-based**: Follow the classic Cluedo turn order and game flow

## Tech Stack

### Backend
- Node.js + Express
- Socket.io for real-time communication
- TypeScript with strict mode
- CORS enabled for development

### Frontend
- Next.js 14 (App Router)
- React 18
- Tailwind CSS
- Socket.io Client
- TypeScript

### Shared
- Common type definitions
- Card constants and game mechanics

## Project Structure

```
/
├── shared/
│   └── types.ts           # Shared types and constants
├── server/
│   ├── src/
│   │   ├── index.ts       # Express + Socket.io server
│   │   ├── GameManager.ts # Game state management
│   │   ├── GameLogic.ts   # Card dealing and game rules
│   │   └── TimerManager.ts # Disprove timer management
│   ├── package.json
│   └── tsconfig.json
├── client/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx       # Home page
│   │   ├── globals.css
│   │   ├── useGameSocket.ts
│   │   ├── lobby/[roomId]/page.tsx
│   │   └── game/[roomId]/page.tsx
│   ├── components/
│   │   ├── PlayerCircle.tsx
│   │   ├── MyHand.tsx
│   │   ├── Notebook.tsx
│   │   ├── SuggestModal.tsx
│   │   ├── DisproveModal.tsx
│   │   ├── AccuseModal.tsx
│   │   └── PrivateChatModal.tsx
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── next.config.js
│   └── .env.local
└── README.md
```

## Installation

### Prerequisites
- Node.js 18+ and npm/yarn

### Server Setup

```bash
cd server
npm install
```

### Client Setup

```bash
cd client
npm install
```

## Running the Game

### Start the Server

From the `server` directory:

```bash
npm run dev
```

The server will start on `http://localhost:3001`

### Start the Client

From the `client` directory (in a new terminal):

```bash
npm run dev
```

The client will start on `http://localhost:3000`

### Access the Game

Open your browser and navigate to `http://localhost:3000`

## How to Play

1. **Create or Join a Room**
   - Enter your player name
   - Create a new room or join an existing one with a room code
   - Wait for 2-6 players to join

2. **Start the Game**
   - The room owner can start when at least 2 players are in the room
   - Each player receives a hand of cards

3. **Make a Suggestion**
   - On your turn, click "Make Suggestion"
   - Name a suspect, weapon, and room
   - Other players (starting with the player to your left) must disprove if they can
   - If someone has a matching card, only you see which one they reveal

4. **Track Clues**
   - Use the Detective Notebook to track what cards people have
   - Mark cards as "clear" (✗) or "confirmed" (✓)

5. **Make an Accusation**
   - When you're confident, click "Make Accusation"
   - If you're correct, you win!
   - If you're wrong, you're eliminated but stay in the game

6. **Win**
   - Make the correct accusation before other players do
   - You must accurately name the suspect, weapon, and room

## Game Rules

### Suggestion Loop
- The suggester starts with the player to their left
- Each player is checked in clockwise order
- If a player has a matching card, they must show one card to the suggester (private reveal)
- Only those involved know which card was shown; others only see someone disproved

### Accusation
- Final guess of the solution
- If correct: you win immediately
- If incorrect: you're eliminated but remain in play as a regular player

### Elimination
- Players are eliminated when they make an incorrect accusation
- Eliminated players cannot take turns but can still be asked to disprove suggestions
- Game ends when someone makes a correct accusation or all players are eliminated

## Environment Variables

### Client (.env.local)
```
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

### Server
Uses default port 3001. Can be overridden with:
```
PORT=3001
```

## Development

### Building

Server:
```bash
cd server
npm run build
```

Client:
```bash
cd client
npm run build
```

### Production

Server:
```bash
npm run build
npm run start
```

Client:
```bash
npm run build
npm run start
```

## Features Implemented

✅ Multiplayer lobby system  
✅ Real-time game state synchronization  
✅ Card dealing and envelope management  
✅ Suggestion and disprove mechanics  
✅ 60-second disprove timer  
✅ Accusation and elimination system  
✅ Private messaging between players  
✅ Detective notebook for clue tracking  
✅ Game log with public and private messages  
✅ Player reconnection handling  
✅ Dark mode UI with player colors  
✅ Responsive design  

## License

MIT

## Credits

Inspired by the classic board game Cluedo/Clue.
