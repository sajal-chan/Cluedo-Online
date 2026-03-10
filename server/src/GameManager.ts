import {
  Card,
  Player,
  GameState,
  RoomState,
  JoinResult,
  ReconnectResult,
  PLAYER_COLORS,
  LogEntry,
  DisproveContext,
} from '@shared/types';
import {
  buildDeck,
  drawEnvelope,
  dealCards,
  getNextDisprover,
  checkAccusation,
} from './GameLogic';
import { TimerManager } from './TimerManager';
import { randomBytes } from 'crypto';

export class GameManager {
  private rooms: Map<string, RoomState> = new Map();//roomid->roomstate
  private userToRoom: Map<string, string> = new Map(); // userId -> roomId
  private timerManager: TimerManager = new TimerManager();
  private broadcastCallback: (roomId: string) => void = () => {}; //empty function that returns void, if we dont do this then we could run into can not call undefined error

  setBroadcastCallback(callback: (roomId: string) => void): void {
    this.broadcastCallback = callback;
  }

  createRoom(ownerUserId: string, ownerName: string): string {
    const roomId = this.generateRoomId();

    const player: Player = {
      userId: ownerUserId,
      socketId: '', // Will be set on connection
      name: ownerName,
      color: PLAYER_COLORS[0],
      hand: [],
      isEliminated: false,
      isConnected: false,
    };

    const room: RoomState = {
      roomId,
      ownerUserId,
      players: [player],
      isLocked: false,
      gameStarted: false,
      phase: 'LOBBY',
      currentTurnIndex: 0,
      disproveContext: null,
      envelope: null,
      deck: [],
      timerEndsAt: null,
      log: [
        {
          timestamp: Date.now(),
          message: `Room created by ${ownerName}`,
          isPrivate: false,
          visibleTo: [],
        },
      ],
      winnerId: null,
    };

    this.rooms.set(roomId, room);
    this.userToRoom.set(ownerUserId, roomId);

    return roomId;
  }

  joinRoom(roomId: string, userId: string, name: string): JoinResult {
    const room = this.rooms.get(roomId);

    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    // Check if room is locked (6 players or game started)
    const isLocked = room.players.length === 6 || room.gameStarted;
    if (isLocked) {
      return { success: false, error: 'Room is full or game has started' };
    }

    // Check if user already in room
    const existingPlayer = room.players.find((p) => p.userId === userId);
    if (existingPlayer) {
      this.userToRoom.set(userId, roomId);
      return {
        success: true,
        roomId,
        gameState: this.getStateForPlayer(roomId, userId),
      };
    }

    // Add new player
    const player: Player = {
      userId,
      socketId: '',
      name,
      color: PLAYER_COLORS[room.players.length % PLAYER_COLORS.length],
      hand: [],
      isEliminated: false,
      isConnected: false,
    };

    room.players.push(player);
    this.userToRoom.set(userId, roomId);

    room.log.push({
      timestamp: Date.now(),
      message: `${name} joined the room`,
      isPrivate: false,
      visibleTo: [],
    });

    return {
      success: true,
      roomId,
      gameState: this.getStateForPlayer(roomId, userId),
    };
  }

  reconnectPlayer(userId: string, newSocketId: string): ReconnectResult {
    const roomId = this.userToRoom.get(userId);

    if (!roomId) {
      return { found: false };
    }

    const room = this.rooms.get(roomId);
    if (!room) {
      this.userToRoom.delete(userId);
      return { found: false };
    }

    const player = room.players.find((p) => p.userId === userId);
    if (!player) {
      this.userToRoom.delete(userId);
      return { found: false };
    }

    player.socketId = newSocketId;
    player.isConnected = true;

    room.log.push({
      timestamp: Date.now(),
      message: `${player.name} reconnected`,
      isPrivate: false,
      visibleTo: [],
    });

    return {
      found: true,
      roomId,
      gameState: this.getStateForPlayer(roomId, userId),
    };
  }

  handleDisconnect(socketId: string): void {
    // Find player with this socketId
    for (const room of this.rooms.values()) {
      const player = room.players.find((p) => p.socketId === socketId);
      if (player) {
        player.isConnected = false;
        room.log.push({
          timestamp: Date.now(),
          message: `${player.name} disconnected`,
          isPrivate: false,
          visibleTo: [],
        });

        // If all players disconnected and game not started, or game over, clean up room
        const hasConnected = room.players.some((p) => p.isConnected);
        if (!hasConnected && (room.phase === 'LOBBY' || room.phase === 'GAME_OVER')) {
          this.rooms.delete(room.roomId);
          room.players.forEach((p) => this.userToRoom.delete(p.userId));
        }
        break;
      }
    }
  }

  startGame(roomId: string, requestingUserId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    // Only owner can start
    if (room.ownerUserId !== requestingUserId) {
      throw new Error('Only room owner can start game');
    }

    // Need at least 2 players
    if (room.players.length < 2) {
      throw new Error('Need at least 2 players to start');
    }

    room.gameStarted = true;
    room.isLocked = true;
    room.phase = 'IDLE';

    // Build deck and draw envelope
    const deck = buildDeck();
    const { envelope, remaining } = drawEnvelope(deck);

    // Deal cards to players
    const hands = dealCards(remaining, room.players.length);
    room.players.forEach((player, index) => {
      player.hand = hands[index];
    });

    room.envelope = envelope;
    room.deck = remaining;
    room.currentTurnIndex = 0;

    room.log.push({
      timestamp: Date.now(),
      message: 'Game started!',
      isPrivate: false,
      visibleTo: [],
    });

    this.broadcastCallback(roomId);
  }

  handleSuggestion(
    roomId: string,
    userId: string,
    suspect: Card,
    weapon: Card,
    room: Card
  ): void {
    const gameRoom = this.rooms.get(roomId);
    if (!gameRoom) throw new Error('Room not found');

    const suggester = gameRoom.players.find((p) => p.userId === userId);
    if (!suggester) throw new Error('Player not found');

    gameRoom.phase = 'SUGGESTING';

    const suggestion = { suspect, weapon, room };
    const suggesterIndex = gameRoom.players.indexOf(suggester);

    gameRoom.log.push({
      timestamp: Date.now(),
      message: `${suggester.name} suggests ${suspect.name} with ${weapon.name} in the ${room.name}`,
      isPrivate: false,
      visibleTo: [],
    });

    // Find next disprover
    const result = getNextDisprover(
      gameRoom.players,
      suggesterIndex,
      suggestion
    );

    if (!result) {
      // No one could disprove
      gameRoom.log.push({
        timestamp: Date.now(),
        message: 'No one could disprove the suggestion',
        isPrivate: false,
        visibleTo: [],
      });

      // Advance turn
      this.advanceTurn(roomId);
      return;
    }

    // Set up disprove context
    const remainingDisprovers = result.skipped
      .map((p) => p.userId)
      .concat(result.disprover.userId)
      .slice(1); // Remove first disprover from remaining

    gameRoom.disproveContext = {
      suggestionId: this.generateId(),
      suggestion,
      suggesterUserId: userId,
      currentDisproverUserId: result.disprover.userId,
      remainingDisprovers,
    };

    gameRoom.phase = 'DISPROVING';
    gameRoom.timerEndsAt = Date.now() + 60000; // 60 second timer

    // Start timer for this disprover
    this.timerManager.start(roomId, 60000, () => {
      this.handleDisproveTimeout(roomId);
    });

    this.broadcastCallback(roomId);
  }

  handleReveal(roomId: string, revealerUserId: string, card: Card): void {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Room not found');

    if (!room.disproveContext) throw new Error('No active disprove context');

    if (room.disproveContext.currentDisproverUserId !== revealerUserId) {
      throw new Error('Not your turn to disprove');
    }

    const disprover = room.players.find((p) => p.userId === revealerUserId);
    const suggester = room.players.find(
      (p) => p.userId === room.disproveContext!.suggesterUserId
    );

    if (!disprover || !suggester) throw new Error('Player not found');

    // Log to suggester only
    room.log.push({
      timestamp: Date.now(),
      message: `${disprover.name} disproved your suggestion with ${card.name}`,
      isPrivate: true,
      visibleTo: [suggester.userId],
    });

    // Public log
    room.log.push({
      timestamp: Date.now(),
      message: `${disprover.name} disproved ${suggester.name}'s suggestion`,
      isPrivate: false,
      visibleTo: [],
    });

    // Clear timer and disprove context
    this.timerManager.clear(roomId);
    room.disproveContext = null;
    room.phase = 'IDLE';

    // Advance turn
    this.advanceTurn(roomId);
  }

  handleDisproveTimeout(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    if (!room.disproveContext) return;

    const disprover = room.players.find(
      (p) => p.userId === room.disproveContext!.currentDisproverUserId
    );

    if (disprover) {
      room.log.push({
        timestamp: Date.now(),
        message: `${disprover.name} ran out of time, skipped`,
        isPrivate: false,
        visibleTo: [],
      });
    }

    // Continue disprove loop
    this.continueDisproveLoop(roomId);
  }

  private continueDisproveLoop(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room || !room.disproveContext) return;

    const { remainingDisprovers, suggesterUserId, suggestion } =
      room.disproveContext;

    if (remainingDisprovers.length === 0) {
      // All checked, no one disproved
      room.log.push({
        timestamp: Date.now(),
        message: 'No one could disprove the suggestion',
        isPrivate: false,
        visibleTo: [],
      });

      this.timerManager.clear(roomId);
      room.disproveContext = null;
      room.phase = 'IDLE';

      // Advance turn
      this.advanceTurn(roomId);
      this.broadcastCallback(roomId);
      return;
    }

    // Get next disprover
    const nextDisproverUserId = remainingDisprovers[0];
    const nextDisprover = room.players.find(
      (p) => p.userId === nextDisproverUserId
    );

    if (!nextDisprover) {
      // Shouldn't happen, but skip if it does
      remainingDisprovers.shift();
      this.continueDisproveLoop(roomId);
      return;
    }

    // Check if they have matching cards
    const hasMatch = nextDisprover.hand.some(
      (card) =>
        card.name === suggestion.suspect.name ||
        card.name === suggestion.weapon.name ||
        card.name === suggestion.room.name
    );

    if (!hasMatch) {
      // Skip this player
      room.log.push({
        timestamp: Date.now(),
        message: `${nextDisprover.name} couldn't disprove`,
        isPrivate: false,
        visibleTo: [],
      });

      remainingDisprovers.shift();
      this.continueDisproveLoop(roomId);
      return;
    }

    // Found a disprover, update context and start timer
    room.disproveContext.currentDisproverUserId = nextDisproverUserId;
    room.disproveContext.remainingDisprovers = remainingDisprovers.slice(1);
    room.phase = 'DISPROVING';
    room.timerEndsAt = Date.now() + 60000;

    this.timerManager.start(roomId, 60000, () => {
      this.handleDisproveTimeout(roomId);
    });

    this.broadcastCallback(roomId);
  }

  handleAccusation(
    roomId: string,
    userId: string,
    suspect: Card,
    weapon: Card,
    room: Card
  ): void {
    const gameRoom = this.rooms.get(roomId);
    if (!gameRoom) throw new Error('Room not found');

    const accuser = gameRoom.players.find((p) => p.userId === userId);
    if (!accuser) throw new Error('Player not found');

    if (accuser.isEliminated) throw new Error('Eliminated players cannot accuse');

    if (!gameRoom.envelope) throw new Error('No envelope found');

    const isCorrect = checkAccusation(gameRoom.envelope, {
      suspect,
      weapon,
      room,
    });

    if (isCorrect) {
      gameRoom.winnerId = userId;
      gameRoom.phase = 'GAME_OVER';

      gameRoom.log.push({
        timestamp: Date.now(),
        message: `${accuser.name} correctly accused ${suspect.name} with ${weapon.name} in the ${room.name}!`,
        isPrivate: false,
        visibleTo: [],
      });

      this.timerManager.clear(roomId);
    } else {
      accuser.isEliminated = true;

      gameRoom.log.push({
        timestamp: Date.now(),
        message: `${accuser.name} incorrectly accused ${suspect.name} with ${weapon.name} in the ${room.name} and is eliminated`,
        isPrivate: false,
        visibleTo: [],
      });

      // Check if all players are eliminated
      const activePlayers = gameRoom.players.filter(
        (p) => !p.isEliminated
      );
      if (activePlayers.length === 0) {
        gameRoom.phase = 'GAME_OVER';
        gameRoom.winnerId = null;
        gameRoom.log.push({
          timestamp: Date.now(),
          message: 'All players eliminated. No winner.',
          isPrivate: false,
          visibleTo: [],
        });
      } else {
        // Advance turn to next non-eliminated player
        this.advanceTurn(roomId);
      }
    }

    this.timerManager.clear(roomId);
    this.broadcastCallback(roomId);
  }

  private advanceTurn(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    if (room.phase === 'GAME_OVER') return;

    // Find next non-eliminated player
    const playerCount = room.players.length;
    for (let i = 0; i < playerCount; i++) {
      const nextIndex = (room.currentTurnIndex + 1) % playerCount;
      room.currentTurnIndex = nextIndex;

      if (!room.players[nextIndex].isEliminated) {
        break;
      }
    }

    room.phase = 'IDLE';
    room.timerEndsAt = Date.now() + 60000; // 60 second timer for player's turn
  }

  getStateForPlayer(roomId: string, userId: string): GameState | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;

    const playersWithStrippedHands = room.players.map((player) => ({
      ...player,
      hand: player.userId === userId ? player.hand : [],
    }));

    return {//manually return all these things so we dont leake any of the card data to an opponent
      roomId: room.roomId,
      phase: room.phase,
      players: playersWithStrippedHands,
      currentTurnIndex: room.currentTurnIndex,
      disproveContext: room.disproveContext,
      timerEndsAt: room.timerEndsAt,
      log: room.log,
      winnerId: room.winnerId,
    };
  }

  private generateRoomId(): string {
    return randomBytes(3).toString('hex').toUpperCase().slice(0, 6);
  }

  private generateId(): string {
    return randomBytes(8).toString('hex');
  }

  getRoom(roomId: string): RoomState | undefined {
    return this.rooms.get(roomId);
  }

  getRoomByUserId(userId: string): RoomState | undefined {
    const roomId = this.userToRoom.get(userId);
    return roomId ? this.rooms.get(roomId) : undefined;
  }

  getAllRooms(): RoomState[] {
    return Array.from(this.rooms.values());
  }

  getRoomPlayers(roomId: string): Player[] {
    const room = this.rooms.get(roomId);
    return room ? room.players : [];
  }

  setPlayerSocketId(userId: string, socketId: string): void {
    const roomId = this.userToRoom.get(userId);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room) return;

    const player = room.players.find((p) => p.userId === userId);
    if (player) {
      player.socketId = socketId;
      player.isConnected = true;
    }
  }
}
