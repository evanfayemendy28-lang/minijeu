<?php
$rows = 6;
$cols = 7;
?>
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Puissance 4</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <main class="game">
    <section class="topbar" aria-label="Informations de partie">
      <div>
        <p class="label">Tour actuel</p>
        <h1>Puissance 4</h1>
      </div>
      <div class="turn">
        <span id="turnChip" class="chip red"></span>
        <span id="status">Joueur rouge</span>
      </div>
      <button id="resetButton" type="button">Recommencer</button>
    </section>

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
            ></button>
          <?php endfor; ?>
        <?php endfor; ?>
      </div>
    </section>
  </main>

  <script src="script.js"></script>
</body>
</html>
