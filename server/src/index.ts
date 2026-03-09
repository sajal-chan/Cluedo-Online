import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { GameManager } from './GameManager';
import { SocketEvents, GameState, Card, JoinResult } from '@shared/types';

const app = express();// for HHTP request
const httpServer = createServer(app); //first thing to touch the incoming traffic decides between io or http 
const io = new Server(httpServer, { //for socket.io connections
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
});

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  })
);
app.use(express.json());

const gameManager = new GameManager();

// Set up broadcast callback
gameManager.setBroadcastCallback(
  (roomId: string) => {
    const room = gameManager.getRoom(roomId);
    if (!room) return;

    // Send state to each connected player (with hand stripping)
    room.players.forEach((player) => {
      if (player.socketId) {
        const socket = io.sockets.sockets.get(player.socketId);
        if (socket) {
          const state = gameManager.getStateForPlayer(roomId, player.userId);
          socket.emit(SocketEvents.GAME_STATE_UPDATE, state);
        }
      }
    });
  }
);

// Socket.io connection
io.on('connection', (socket) => {
  const userId = socket.handshake.auth.userId as string;

  if (!userId) {
    socket.disconnect(true);
    return;
  }

  console.log(`Player ${userId} connected with socket ${socket.id}`);

  // Try to reconnect
  const reconnectResult = gameManager.reconnectPlayer(userId, socket.id);
  if (reconnectResult.found && reconnectResult.roomId && reconnectResult.gameState) {
    console.log(`Player ${userId} reconnected to room ${reconnectResult.roomId}`);
    socket.join(reconnectResult.roomId);
    socket.emit(SocketEvents.GAME_STATE_UPDATE, reconnectResult.gameState);
    gameManager.setBroadcastCallback((roomId: string) => {
      const room = gameManager.getRoom(roomId);
      if (!room) return;
      room.players.forEach((player) => {
        if (player.socketId) {
          const s = io.sockets.sockets.get(player.socketId);
          if (s) {
            const state = gameManager.getStateForPlayer(roomId, player.userId);
            s.emit(SocketEvents.GAME_STATE_UPDATE, state);
          }
        }
      });
    });
  }

  // JOIN_ROOM event
   socket.on(SocketEvents.JOIN_ROOM, (data: { roomId?: string; userId: string; name: string }, callback) => {
    try {
      let result:JoinResult;

      if (data.roomId) {
        // Join existing room
        result = gameManager.joinRoom(data.roomId, data.userId, data.name);
      } else {
        // Create new room
        const newRoomId = gameManager.createRoom(data.userId, data.name);
        result = gameManager.joinRoom(newRoomId, data.userId, data.name);
      }

      if (result.success && result.roomId) {
        gameManager.setPlayerSocketId(data.userId, socket.id);
        socket.join(result.roomId);

        // Send updated state to all players in the room
        const room = gameManager.getRoom(result.roomId);
        if (room) {
          room.players.forEach((player) => {
            if (player.socketId) {
              const s = io.sockets.sockets.get(player.socketId);
              if (s) {
                const state = gameManager.getStateForPlayer(result.roomId!, player.userId);
                s.emit(SocketEvents.GAME_STATE_UPDATE, state);
              }
            }
          });
        }

        callback({ success: true, roomId: result.roomId });
      } else {
        callback({ success: false, error: result.error });
      }
    } catch (error) {
      console.error('Error in JOIN_ROOM:', error);
      callback({ success: false, error: (error as Error).message });
    }
  });

  // START_GAME event
  socket.on(SocketEvents.START_GAME, (data: { roomId: string; userId: string }, callback) => {
    try {
      gameManager.startGame(data.roomId, data.userId);
      callback({ success: true });
    } catch (error) {
      console.error('Error in START_GAME:', error);
      callback({ success: false, error: (error as Error).message });
    }
  });

  // MAKE_SUGGESTION event
  socket.on(SocketEvents.MAKE_SUGGESTION,
    (
      data: {
        roomId: string;
        userId: string;
        suspect: Card;
        weapon: Card;
        room: Card;
      },
      callback
    ) => {
      try {
        gameManager.handleSuggestion(
          data.roomId,
          data.userId,
          data.suspect,
          data.weapon,
          data.room
        );
        callback({ success: true });
      } catch (error) {
        console.error('Error in MAKE_SUGGESTION:', error);
        callback({ success: false, error: (error as Error).message });
      }
    }
  );

  // REVEAL_CARD event
  socket.on(SocketEvents.REVEAL_CARD,
    (
      data: {
        roomId: string;
        userId: string;
        card: Card;
      },
      callback
    ) => {
      try {
        gameManager.handleReveal(data.roomId, data.userId, data.card);
        callback({ success: true });
      } catch (error) {
        console.error('Error in REVEAL_CARD:', error);
        callback({ success: false, error: (error as Error).message });
      }
    }
  );

  // MAKE_ACCUSATION event
  socket.on(SocketEvents.MAKE_ACCUSATION,
    (
      data: {
        roomId: string;
        userId: string;
        suspect: Card;
        weapon: Card;
        room: Card;
      },
      callback
    ) => {
      try {
        gameManager.handleAccusation(
          data.roomId,
          data.userId,
          data.suspect,
          data.weapon,
          data.room
        );
        callback({ success: true });
      } catch (error) {
        console.error('Error in MAKE_ACCUSATION:', error);
        callback({ success: false, error: (error as Error).message });
      }
    }
  );

  // SEND_PRIVATE_MSG event
  socket.on(
    SocketEvents.SEND_PRIVATE_MSG,
    (data: { roomId: string; fromUserId: string; toUserId: string; message: string }, callback) => {
      try {
        const room = gameManager.getRoom(data.roomId);
        if (!room) {
          callback({ success: false, error: 'Room not found' });
          return;
        }

        const recipient = room.players.find((p) => p.userId === data.toUserId);
        if (!recipient || !recipient.socketId) {
          callback({ success: false, error: 'Recipient not found or disconnected' });
          return;
        }

        const sender = room.players.find((p) => p.userId === data.fromUserId);
        if (!sender) {
          callback({ success: false, error: 'Sender not found' });
          return;
        }

        const recipientSocket = io.sockets.sockets.get(recipient.socketId);
        if (recipientSocket) {
          recipientSocket.emit(SocketEvents.PRIVATE_MESSAGE, {
            fromName: sender.name,
            message: data.message,
          });
        }

        callback({ success: true });
      } catch (error) {
        console.error('Error in SEND_PRIVATE_MSG:', error);
        callback({ success: false, error: (error as Error).message });
      }
    }
  );

  socket.on('disconnect', () => {
    console.log(`Player ${userId} disconnected`);
    gameManager.handleDisconnect(socket.id);
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = parseInt(process.env.PORT || '3001', 10);
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
