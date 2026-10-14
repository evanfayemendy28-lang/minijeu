const { Server } = require("socket.io");

const io = new Server(3000, {
  cors: {
    origin: "*"
  }
});

io.on("connection", (socket) => {
  console.log("Joueur connecté :", socket.id);

  socket.on("move", (col) => {
    socket.broadcast.emit("move", col);
  });

  socket.on("reset", () => {
    socket.broadcast.emit("reset");
  });

  socket.on("disconnect", () => {
    console.log("Joueur déconnecté :", socket.id);
  });
});

console.log("Serveur Socket.IO lancé sur le port 3000");