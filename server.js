import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Store active games and waiting players
const waitingPlayers = [];
const activeGames = new Map();

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  // Player joins waiting queue
  socket.on('joinGame', (playerData) => {
    console.log('Player joining:', playerData.username);

    // Check if there's someone waiting
    if (waitingPlayers.length > 0) {
      const opponent = waitingPlayers.shift();
      const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create game room
      const gameData = {
        id: gameId,
        players: {
          player1: { id: opponent.id, username: opponent.username, symbol: 'X' },
          player2: { id: socket.id, username: playerData.username, symbol: 'O' }
        },
        board: ["", "", "", "", "", "", "", "", ""],
        currentTurn: 'X',
        status: 'playing',
        winner: null
      };

      activeGames.set(gameId, gameData);

      // Join both players to the game room
      socket.join(gameId);
      io.sockets.sockets.get(opponent.id)?.join(gameId);

      // Notify both players
      io.to(gameId).emit('gameStarted', gameData);

      console.log(`Game ${gameId} started between ${opponent.username} and ${playerData.username}`);
    } else {
      // Add to waiting queue
      waitingPlayers.push({
        id: socket.id,
        username: playerData.username
      });

      socket.emit('waitingForOpponent', { message: 'Waiting for another player...' });
    }
  });

  // Handle moves
  socket.on('makeMove', (data) => {
    const { gameId, position } = data;
    const game = activeGames.get(gameId);

    if (!game || game.status !== 'playing') return;

    // Find which player made the move
    const playerSymbol = game.players.player1.id === socket.id ? 'X' : 'O';

    // Check if it's this player's turn
    if (game.currentTurn !== playerSymbol) {
      socket.emit('invalidMove', { message: 'Not your turn!' });
      return;
    }

    // Check if position is valid
    if (game.board[position] !== "") {
      socket.emit('invalidMove', { message: 'Position already taken!' });
      return;
    }

    // Make the move
    game.board[position] = playerSymbol;

    // Check for winner
    const winner = checkWinner(game.board);
    if (winner) {
      game.status = 'finished';
      game.winner = winner;
    } else if (game.board.every(cell => cell !== "")) {
      game.status = 'finished';
      game.winner = 'draw';
    } else {
      // Switch turns
      game.currentTurn = game.currentTurn === 'X' ? 'O' : 'X';
    }

    // Broadcast updated game state
    io.to(gameId).emit('gameUpdate', game);

    // If game finished, clean up after delay
    if (game.status === 'finished') {
      const player1Id = game.players.player1.id;
      const player2Id = game.players.player2.id;
      setTimeout(() => {
        activeGames.delete(gameId);
        io.to(player1Id).emit('gameEnded');
        io.to(player2Id).emit('gameEnded');
      }, 5000); // 5 seconds to show result
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);

    // Remove from waiting queue
    const waitingIndex = waitingPlayers.findIndex(p => p.id === socket.id);
    if (waitingIndex !== -1) {
      waitingPlayers.splice(waitingIndex, 1);
    }

    // Handle active games
    for (const [gameId, game] of activeGames) {
      if (game.players.player1.id === socket.id || game.players.player2.id === socket.id) {
        const opponentId = game.players.player1.id === socket.id ?
          game.players.player2.id : game.players.player1.id;

        // Notify opponent
        io.to(opponentId).emit('opponentDisconnected');

        // End game
        activeGames.delete(gameId);
        break;
      }
    }
  });
});

// Helper function to check winner
function checkWinner(board) {
  const winConditions = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];

  for (let condition of winConditions) {
    const [a, b, c] = condition;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});