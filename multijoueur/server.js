const { Server } = require("socket.io");
const { randomUUID } = require("crypto");

const ROWS = 6;
const COLS = 7;
const PLAYERS = ["red", "yellow"];

const io = new Server(3000, {
  cors: {
    origin: "*"
  }
});

const rooms = new Map();

function emptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(""));
}

function roomList() {
  return Array.from(rooms.values()).map((room) => ({
    id: room.id,
    name: room.name,
    players: room.players.length
  }));
}

function broadcastRoomList() {
  io.emit("roomsList", roomList());
}

function findOpenRow(board, col) {
  for (let row = ROWS - 1; row >= 0; row -= 1) {
    if (board[row][col] === "") return row;
  }

  return -1;
}

function collectCells(board, row, col, player, rowStep, colStep) {
  const cells = [];
  let nextRow = row;
  let nextCol = col;

  while (
    nextRow >= 0 &&
    nextRow < ROWS &&
    nextCol >= 0 &&
    nextCol < COLS &&
    board[nextRow][nextCol] === player
  ) {
    cells.push({ row: nextRow, col: nextCol });
    nextRow += rowStep;
    nextCol += colStep;
  }

  return cells;
}

function getWinningCells(board, row, col, player) {
  const directions = [
    { row: 0, col: 1 },
    { row: 1, col: 0 },
    { row: 1, col: 1 },
    { row: 1, col: -1 }
  ];

  for (const direction of directions) {
    const cells = [
      ...collectCells(board, row, col, player, direction.row, direction.col),
      ...collectCells(board, row, col, player, -direction.row, -direction.col).slice(1)
    ];

    if (cells.length >= 4) return cells;
  }

  return [];
}

function resetRoom(room) {
  room.board = emptyBoard();
  room.currentTurn = PLAYERS[0];
  room.gameOver = false;
}

function updateRoomAfterLeave(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  if (room.players.length === 0) {
    rooms.delete(roomId);
  } else {
    room.players.forEach((player, index) => {
      player.color = PLAYERS[index];
      io.to(player.id).emit("playerRole", player.color);
    });
    resetRoom(room);
    io.to(roomId).emit("reset");
    io.to(roomId).emit("roomPlayers", {
      roomId,
      players: room.players.length
    });
  }

  broadcastRoomList();
}

function leaveCurrentRoom(socket) {
  const roomId = socket.data.roomId;
  if (!roomId) return;

  socket.leave(roomId);
  delete socket.data.roomId;
  delete socket.data.playerColor;

  const room = rooms.get(roomId);
  if (room) {
    room.players = room.players.filter((player) => player.id !== socket.id);
    updateRoomAfterLeave(roomId);
  }
}

io.on("connection", (socket) => {
  socket.on("getRooms", () => {
    socket.emit("roomsList", roomList());
  });

  socket.on("createRoom", (rawName, callback) => {
    const name = String(rawName || "").trim().slice(0, 30);

    if (!name) {
      callback?.({ ok: false, message: "Choisis un nom pour le salon." });
      return;
    }

    leaveCurrentRoom(socket);

    const room = {
      id: randomUUID(),
      name,
      players: [{ id: socket.id, color: "red" }],
      board: emptyBoard(),
      currentTurn: "red",
      gameOver: false
    };

    rooms.set(room.id, room);
    socket.join(room.id);
    socket.data.roomId = room.id;
    socket.data.playerColor = "red";

    callback?.({
      ok: true,
      room: {
        id: room.id,
        name: room.name,
        players: 1,
        playerColor: "red",
        currentTurn: room.currentTurn
      }
    });

    socket.emit("playerRole", "red");
    io.to(room.id).emit("roomPlayers", { roomId: room.id, players: 1 });
    broadcastRoomList();
  });

  socket.on("joinRoom", (roomId, callback) => {
    const room = rooms.get(String(roomId || ""));

    if (!room) {
      callback?.({ ok: false, message: "Ce salon n’existe plus." });
      return;
    }

    if (socket.data.roomId === room.id) {
      const player = room.players.find((entry) => entry.id === socket.id);
      callback?.({
        ok: true,
        room: {
          id: room.id,
          name: room.name,
          players: room.players.length,
          playerColor: player?.color || "red",
          currentTurn: room.currentTurn
        }
      });
      return;
    }

    if (room.players.length >= 2) {
      callback?.({ ok: false, message: "Ce salon est déjà complet." });
      return;
    }

    leaveCurrentRoom(socket);

    const color = room.players.some((player) => player.color === "red")
      ? "yellow"
      : "red";

    room.players.push({ id: socket.id, color });
    socket.join(room.id);
    socket.data.roomId = room.id;
    socket.data.playerColor = color;

    resetRoom(room);

    callback?.({
      ok: true,
      room: {
        id: room.id,
        name: room.name,
        players: room.players.length,
        playerColor: color,
        currentTurn: room.currentTurn
      }
    });

    room.players.forEach((player) => {
      io.to(player.id).emit("playerRole", player.color);
    });
    io.to(room.id).emit("roomPlayers", {
      roomId: room.id,
      players: room.players.length
    });
    io.to(room.id).emit("reset");
    broadcastRoomList();
  });

  socket.on("leaveRoom", () => {
    leaveCurrentRoom(socket);
  });

  socket.on("move", (rawCol) => {
    const room = rooms.get(socket.data.roomId);
    if (!room || room.players.length !== 2 || room.gameOver) return;

    const player = room.players.find((entry) => entry.id === socket.id);
    const col = Number(rawCol);

    if (!player || player.color !== room.currentTurn) return;
    if (!Number.isInteger(col) || col < 0 || col >= COLS) return;

    const row = findOpenRow(room.board, col);
    if (row === -1) return;

    room.board[row][col] = player.color;
    const winningCells = getWinningCells(room.board, row, col, player.color);
    const isDraw = !winningCells.length && room.board[0].every((cell) => cell !== "");

    room.gameOver = winningCells.length > 0 || isDraw;
    if (!room.gameOver) {
      room.currentTurn = player.color === PLAYERS[0] ? PLAYERS[1] : PLAYERS[0];
    }

    io.to(room.id).emit("move", {
      col,
      player: player.color,
      nextTurn: room.currentTurn,
      gameOver: room.gameOver,
      isDraw,
      winningCells
    });
  });

  socket.on("reset", () => {
    const room = rooms.get(socket.data.roomId);
    if (!room || room.players.length !== 2) return;

    resetRoom(room);
    io.to(room.id).emit("reset");
  });

  socket.on("disconnect", () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;

    delete socket.data.roomId;
    delete socket.data.playerColor;

    const room = rooms.get(roomId);
    if (room) {
      room.players = room.players.filter((player) => player.id !== socket.id);
      updateRoomAfterLeave(roomId);
    }
  });
});

console.log("Serveur Socket.IO lancé sur le port 3000");
