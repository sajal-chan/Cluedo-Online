// Card types and constants
export type CardCategory = 'SUSPECT' | 'WEAPON' | 'ROOM';

export interface Card {
  category: CardCategory;
  name: string;
}

// Static card lists
export const SUSPECTS = [
  'Miss Scarlett',
  'Col. Mustard',
  'Mrs. White',
  'Mr. Green',
  'Mrs. Peacock',
  'Professor Plum',
];

export const WEAPONS = [
  'Candlestick',
  'Knife',
  'Lead Pipe',
  'Revolver',
  'Rope',
  'Wrench',
];

export const ROOMS = [
  'Kitchen',
  'Ballroom',
  'Conservatory',
  'Dining Room',
  'Billiard Room',
  'Library',
  'Lounge',
  'Hall',
  'Study',
];

// Player
export interface Player {
  userId: string;
  socketId: string;
  name: string;
  color: string;
  hand: Card[];
  isEliminated: boolean;
  isConnected: boolean;
}

// Envelope (solution)
export interface Envelope {
  suspect: Card;
  weapon: Card;
  room: Card;
}

// Game phases
export type GamePhase = 'LOBBY' | 'IDLE' | 'SUGGESTING' | 'DISPROVING' | 'ACCUSING' | 'GAME_OVER';

// Active disprove context
export interface DisproveContext {
  suggestionId: string;
  suggestion: { suspect: Card; weapon: Card; room: Card };
  suggesterUserId: string;
  currentDisproverUserId: string;
  remainingDisprovers: string[];
}

// Full game state
export interface GameState {
  roomId: string;
  phase: GamePhase;
  players: Player[];
  currentTurnIndex: number;
  disproveContext: DisproveContext | null;
  timerEndsAt: number | null;
  log: LogEntry[];
  winnerId: string | null;
}

export interface LogEntry {
  timestamp: number;
  message: string;
  isPrivate: boolean;
  visibleTo: string[];
}

// Socket event names
export const SocketEvents = {
  // Client → Server
  JOIN_ROOM: 'join_room',
  START_GAME: 'start_game',
  MAKE_SUGGESTION: 'make_suggestion',
  REVEAL_CARD: 'reveal_card',
  MAKE_ACCUSATION: 'make_accusation',
  SEND_PRIVATE_MSG: 'send_private_msg',
  RECONNECT_AUTH: 'reconnect_auth',

  // Server → Client
  GAME_STATE_UPDATE: 'game_state_update',
  PRIVATE_REVEAL: 'private_reveal',
  REQUEST_REVEAL: 'request_reveal',
  PRIVATE_MESSAGE: 'private_message',
  ERROR_MSG: 'error_msg',
  TIMER_UPDATE: 'timer_update',
} as const;

// Helper types
export interface JoinResult {
  success: boolean;
  error?: string;
  roomId?: string;
  gameState?: GameState;
}

export interface ReconnectResult {
  found: boolean;
  roomId?: string;
  gameState?: GameState;
}

// Room state maintained server-side
export interface RoomState {
  roomId: string;
  ownerUserId: string;
  players: Player[];
  isLocked: boolean;
  gameStarted: boolean;
  phase: GamePhase;
  currentTurnIndex: number;
  disproveContext: DisproveContext | null;
  envelope: Envelope | null;
  deck: Card[];
  timerEndsAt: number | null;
  log: LogEntry[];
  winnerId: string | null;
}

// Player colors
export const PLAYER_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DDA0DD',
];
