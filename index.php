<?php
$rows = 6;
$cols = 7;
?>
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Puissance 4 multijoueur</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <main class="game">
    <section id="lobbyView" class="lobby-view">
      <header class="lobby-header">
        <p class="label">Puissance 4 multijoueur</p>
        <h1>Choisis ton salon</h1>
        <p class="intro">Crée une partie ou rejoins un salon en attente d’un joueur.</p>
      </header>

      <section class="lobby-panel" aria-label="Créer un salon">
        <form id="createRoomForm" class="create-room-form">
          <label for="roomNameInput">Nom du salon</label>
          <div class="create-room-controls">
            <input id="roomNameInput" name="roomName" type="text" maxlength="30"
              placeholder="Ex. Les champions" required>
            <button type="submit">Créer un salon</button>
          </div>
        </form>
        <p id="connectionInfo" class="connection-status" aria-live="polite">Connexion au serveur…</p>
        <p id="lobbyMessage" class="lobby-message" aria-live="polite"></p>
      </section>

      <section class="rooms-section" aria-label="Salons disponibles">
        <div class="rooms-heading">
          <h2>Salons disponibles</h2>
          <span id="roomsTotal" class="rooms-total">0</span>
        </div>
        <p id="emptyRooms" class="empty-rooms">Aucun salon pour le moment. Crée le premier !</p>
        <div id="roomsList" class="rooms-list"></div>
      </section>
    </section>

    <section id="gameView" class="game-view" hidden>
      <section class="topbar game-topbar" aria-label="Informations de partie">
        <div>
          <p class="label">Salon</p>
          <h1 id="roomTitle">Puissance 4</h1>
        </div>

        <div class="turn">
          <span id="turnChip" class="chip red"></span>
          <span id="status">Joueur rouge</span>
        </div>

        <button id="resetButton" type="button" disabled>Recommencer</button>
        <button id="leaveRoomButton" class="secondary-button" type="button">Quitter</button>
      </section>

      <p id="playersCount" class="connection-status" aria-live="polite">En attente d’un autre joueur (1/2)</p>

      <section class="board-wrap" aria-label="Plateau de Puissance 4">
        <div id="board" class="board" data-rows="<?= $rows ?>" data-cols="<?= $cols ?>">
          <?php for ($row = 0; $row < $rows; $row += 1): ?>
            <?php for ($col = 0; $col < $cols; $col += 1): ?>
              <button
                class="cell"
                type="button"
                data-row="<?= $row ?>"
                data-col="<?= $col ?>"
                aria-label="Colonne <?= $col + 1 ?>, ligne <?= $row + 1 ?>"
                disabled
              ></button>
            <?php endfor; ?>
          <?php endfor; ?>
        </div>
      </section>
    </section>
  </main>

  <script>
    document.write(
      '<script src="' +
      window.location.protocol +
      "//" +
      window.location.hostname +
      ':3000/socket.io/socket.io.js"><\/script>'
    );
  </script>
  <script>
    window.gameSocket = io(
      window.location.protocol + "//" + window.location.hostname + ":3000"
    );
  </script>
  <script src="script.js"></script>
</body>
</html>
