const { Server } = require("socket.io");
const { randomUUID } = require("crypto");

const io = new Server(3000, {
  cors: {
    origin: "*"
  }
});

const rooms = new Map();

function roomPlayerCount(roomId) {
  return io.sockets.adapter.rooms.get(roomId)?.size ?? 0;
}

function roomList() {
  return Array.from(rooms.values()).map((room) => ({
    id: room.id,
    name: room.name,
    players: roomPlayerCount(room.id)
  }));
}

function broadcastRoomList() {
  io.emit("roomsList", roomList());
}

function updateRoom(roomId) {
  const players = roomPlayerCount(roomId);

  if (players === 0) {
    rooms.delete(roomId);
  } else {
    io.to(roomId).emit("roomPlayers", { roomId, players });
  }

  broadcastRoomList();
}

function leaveCurrentRoom(socket) {
  const roomId = socket.data.roomId;
  if (!roomId) return;

  socket.leave(roomId);
  delete socket.data.roomId;
  updateRoom(roomId);
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
      name
    };

    rooms.set(room.id, room);
    socket.join(room.id);
    socket.data.roomId = room.id;

    const joinedRoom = { ...room, players: 1 };
    callback?.({ ok: true, room: joinedRoom });
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
      callback?.({
        ok: true,
        room: { ...room, players: roomPlayerCount(room.id) }
      });
      return;
    }

    if (roomPlayerCount(room.id) >= 2) {
      callback?.({ ok: false, message: "Ce salon est déjà complet." });
      return;
    }

    leaveCurrentRoom(socket);
    socket.join(room.id);
    socket.data.roomId = room.id;

    const players = roomPlayerCount(room.id);
    callback?.({ ok: true, room: { ...room, players } });
    io.to(room.id).emit("roomPlayers", { roomId: room.id, players });

    if (players === 2) {
      io.to(room.id).emit("reset");
    }

    broadcastRoomList();
  });

  socket.on("leaveRoom", () => {
    leaveCurrentRoom(socket);
  });

  socket.on("move", (col) => {
    const roomId = socket.data.roomId;
    if (roomId && roomPlayerCount(roomId) === 2) {
      socket.to(roomId).emit("move", col);
    }
  });

  socket.on("reset", () => {
    const roomId = socket.data.roomId;
    if (roomId && roomPlayerCount(roomId) === 2) {
      socket.to(roomId).emit("reset");
    }
  });

  socket.on("disconnect", () => {
    const roomId = socket.data.roomId;
    if (roomId) {
      updateRoom(roomId);
    }
  });
});

console.log("Serveur Socket.IO lancé sur le port 3000");
