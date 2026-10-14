const socket = window.gameSocket;

const boardElement = document.querySelector("#board");
const ROWS = Number(boardElement.dataset.rows);
const COLS = Number(boardElement.dataset.cols);
const EMPTY = "";
const PLAYERS = ["red", "yellow"];
const PLAYER_NAMES = {
  red: "joueur rouge",
  yellow: "joueur jaune"
};

const lobbyView = document.querySelector("#lobbyView");
const gameView = document.querySelector("#gameView");
const createRoomForm = document.querySelector("#createRoomForm");
const roomNameInput = document.querySelector("#roomNameInput");
const roomsListElement = document.querySelector("#roomsList");
const roomsTotalElement = document.querySelector("#roomsTotal");
const emptyRoomsElement = document.querySelector("#emptyRooms");
const connectionInfoElement = document.querySelector("#connectionInfo");
const lobbyMessageElement = document.querySelector("#lobbyMessage");
const roomTitleElement = document.querySelector("#roomTitle");
const playersCountElement = document.querySelector("#playersCount");
const statusElement = document.querySelector("#status");
const turnChip = document.querySelector("#turnChip");
const resetButton = document.querySelector("#resetButton");
const leaveRoomButton = document.querySelector("#leaveRoomButton");

let board = [];
let currentPlayer = PLAYERS[0];
let myColor = null;
let gameOver = false;
let currentRoomId = null;
let currentRoomName = "";
let roomPlayerCount = 0;
let gameReady = false;

function setupCells() {
  document.querySelectorAll(".cell").forEach((cell) => {
    const col = Number(cell.dataset.col);
    cell.addEventListener("click", () => requestMove(col));
  });
}

function setLobbyMessage(message, isError = false) {
  lobbyMessageElement.textContent = message;
  lobbyMessageElement.classList.toggle("error", isError);
}

function renderRooms(rooms) {
  roomsListElement.replaceChildren();
  roomsTotalElement.textContent = String(rooms.length);
  emptyRoomsElement.hidden = rooms.length > 0;

  rooms.forEach((room) => {
    const card = document.createElement("article");
    card.className = "room-card";

    const details = document.createElement("div");
    details.className = "room-details";

    const name = document.createElement("h3");
    name.textContent = room.name;

    const count = document.createElement("p");
    count.className = "room-count";
    count.textContent = room.players === 1
      ? "1 joueur · en attente d’un adversaire"
      : "Salon complet";

    const joinButton = document.createElement("button");
    joinButton.type = "button";
    joinButton.textContent = room.players >= 2 ? "Complet" : "Rejoindre";
    joinButton.disabled = room.players >= 2;
    joinButton.addEventListener("click", () => {
      setLobbyMessage("");
      socket.emit("joinRoom", room.id, (response) => {
        if (!response || !response.ok) {
          setLobbyMessage(
            response ? response.message : "Impossible de rejoindre ce salon.",
            true
          );
          socket.emit("getRooms");
          return;
        }

        enterRoom(response.room);
      });
    });

    details.append(name, count);
    card.append(details, joinButton);
    roomsListElement.append(card);
  });
}

function enterRoom(room) {
  currentRoomId = room.id;
  currentRoomName = room.name;
  roomPlayerCount = room.players;
  myColor = room.playerColor || null;
  currentPlayer = room.currentTurn || PLAYERS[0];
  gameReady = roomPlayerCount >= 2;

  roomTitleElement.textContent = currentRoomName;
  lobbyView.hidden = true;
  gameView.hidden = false;
  setLobbyMessage("");
  resetGame(true);
  updateRoomPlayers(roomPlayerCount);
}

function updateRoomPlayers(count) {
  roomPlayerCount = count;
  gameReady = count >= 2;
  resetButton.disabled = !gameReady;

  if (count < 2) {
    playersCountElement.textContent = "En attente d’un autre joueur (" + count + "/2)";
    setStatus("En attente d’un adversaire", currentPlayer);
  } else {
    const colorName = PLAYER_NAMES[myColor] || "couleur inconnue";
    playersCountElement.textContent = "2 joueurs connectés · tu es " + colorName;
    updateTurnStatus();
  }

  render();
}

function updateTurnStatus() {
  if (!gameReady || !myColor) {
    setStatus("En attente d’un adversaire", currentPlayer);
    return;
  }

  const message = currentPlayer === myColor
    ? "À toi — " + PLAYER_NAMES[myColor]
    : "Au tour du " + PLAYER_NAMES[currentPlayer];

  setStatus(message, currentPlayer);
}

function leaveRoom() {
  socket.emit("leaveRoom");
  currentRoomId = null;
  currentRoomName = "";
  roomPlayerCount = 0;
  myColor = null;
  gameReady = false;
  resetGame(true);
  gameView.hidden = true;
  lobbyView.hidden = false;
  setLobbyMessage("");
  socket.emit("getRooms");
}

function resetGame(fromServer = false) {
  if (!fromServer) {
    if (currentRoomId && gameReady) {
      socket.emit("reset");
    }
    return;
  }

  board = Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY));
  currentPlayer = PLAYERS[0];
  gameOver = false;
  render();
  updateTurnStatus();
}

function requestMove(col) {
  if (!gameReady || gameOver || currentPlayer !== myColor) return;
  if (findOpenRow(col) === -1) return;

  socket.emit("move", col);
}

function applyServerMove(data) {
  if (!currentRoomId || !gameReady || gameOver) return;

  const col = Number(data.col);
  const row = findOpenRow(col);
  if (row === -1) return;

  board[row][col] = data.player;
  currentPlayer = data.nextTurn;
  gameOver = data.gameOver;

  render(data.winningCells || []);

  if (data.gameOver) {
    if (data.isDraw) {
      setStatus("Égalité !", data.player);
    } else {
      setStatus(PLAYER_NAMES[data.player] + " gagne !", data.player);
    }
    return;
  }

  updateTurnStatus();
}

function findOpenRow(col) {
  for (let row = ROWS - 1; row >= 0; row -= 1) {
    if (board[row][col] === EMPTY) {
      return row;
    }
  }

  return -1;
}

function getWinningCells(row, col, player) {
  const directions = [
    { row: 0, col: 1 },
    { row: 1, col: 0 },
    { row: 1, col: 1 },
    { row: 1, col: -1 }
  ];

  for (const direction of directions) {
    const cells = [
      ...collectCells(row, col, player, direction.row, direction.col),
      ...collectCells(row, col, player, -direction.row, -direction.col).slice(1)
    ];

    if (cells.length >= 4) return cells;
  }

  return [];
}

function collectCells(row, col, player, rowStep, colStep) {
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

function isBoardFull() {
  return board[0].every((cell) => cell !== EMPTY);
}

function render(winningCells = []) {
  const winMap = new Set(winningCells.map((cell) => cell.row + "-" + cell.col));

  document.querySelectorAll(".cell").forEach((cell) => {
    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);
    const player = board[row][col];
    const winningCell = winMap.has(row + "-" + col);

    cell.className = "cell" + (player ? " " + player : "") + (winningCell ? " win" : "");
    cell.disabled =
      !gameReady ||
      gameOver ||
      currentPlayer !== myColor ||
      board[0][col] !== EMPTY;
  });
}

function setStatus(message, player) {
  statusElement.textContent = message;
  turnChip.className = "chip " + player;
}

createRoomForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const roomName = roomNameInput.value.trim();
  if (!roomName) {
    setLobbyMessage("Donne un nom au salon.", true);
    return;
  }

  socket.emit("createRoom", roomName, (response) => {
    if (!response || !response.ok) {
      setLobbyMessage(
        response ? response.message : "Impossible de créer le salon.",
        true
      );
      return;
    }

    roomNameInput.value = "";
    enterRoom(response.room);
  });
});

resetButton.addEventListener("click", () => resetGame());
leaveRoomButton.addEventListener("click", leaveRoom);

socket.on("connect", () => {
  connectionInfoElement.textContent = "Connecté au serveur multijoueur";
  socket.emit("getRooms");
});

socket.on("disconnect", () => {
  connectionInfoElement.textContent = "Connexion au serveur perdue";
});

socket.on("connect_error", (error) => {
  connectionInfoElement.textContent = "Impossible de joindre le serveur multijoueur";
  console.error("Erreur Socket.IO :", error.message);
});

socket.on("roomsList", renderRooms);

socket.on("playerRole", (color) => {
  myColor = color;
  if (gameView && !gameView.hidden) {
    updateRoomPlayers(roomPlayerCount);
  }
});

socket.on("roomPlayers", (data) => {
  if (data.roomId === currentRoomId) {
    updateRoomPlayers(data.players);
  }
});

socket.on("move", applyServerMove);

socket.on("reset", () => {
  if (currentRoomId) {
    resetGame(true);
  }
});

setupCells();
socket.emit("getRooms");
