/* ==========================================================
   snake.js — mini-jeu Snake jouable depuis toutes les pages.
   Tout élément portant l'attribut data-open-snake ouvre le jeu.
   Contrôles : flèches / ZQSD / WASD, Espace = pause, R = rejouer,
   Échap = fermer. Mobile : swipe sur la grille ou croix directionnelle.
   ========================================================== */
(function () {
  "use strict";

  /* ---------------------------------------------------------
     1. Moteur du jeu (aucune dépendance au DOM, donc testable)
     --------------------------------------------------------- */
  function createEngine(cols, rows, rng) {
    rng = rng || Math.random;
    var s = {
      cols: cols,
      rows: rows,
      snake: [],
      dir: { x: 1, y: 0 },
      queue: [],
      food: null,
      score: 0,
      over: false,
      won: false
    };

    function occupied(x, y) {
      for (var i = 0; i < s.snake.length; i++) {
        if (s.snake[i].x === x && s.snake[i].y === y) return true;
      }
      return false;
    }

    function spawnFood() {
      var free = [];
      for (var y = 0; y < rows; y++) {
        for (var x = 0; x < cols; x++) {
          if (!occupied(x, y)) free.push({ x: x, y: y });
        }
      }
      if (!free.length) return null;
      return free[Math.floor(rng() * free.length)];
    }

    function reset() {
      var cx = Math.floor(cols / 2);
      var cy = Math.floor(rows / 2);
      s.snake = [{ x: cx, y: cy }, { x: cx - 1, y: cy }, { x: cx - 2, y: cy }];
      s.dir = { x: 1, y: 0 };
      s.queue = [];
      s.score = 0;
      s.over = false;
      s.won = false;
      s.food = spawnFood();
    }

    /** Met un changement de direction en file (max 2) ; refuse les demi-tours. */
    function turn(dx, dy) {
      var last = s.queue.length ? s.queue[s.queue.length - 1] : s.dir;
      if (dx === -last.x && dy === -last.y) return false;
      if (dx === last.x && dy === last.y) return false;
      if (s.queue.length >= 2) return false;
      s.queue.push({ x: dx, y: dy });
      return true;
    }

    /** Avance d'une case. Retourne "move", "eat" ou "dead". */
    function step() {
      if (s.over) return "dead";
      if (s.queue.length) s.dir = s.queue.shift();

      var head = { x: s.snake[0].x + s.dir.x, y: s.snake[0].y + s.dir.y };
      var eating = !!s.food && head.x === s.food.x && head.y === s.food.y;

      // Mur
      if (head.x < 0 || head.y < 0 || head.x >= cols || head.y >= rows) {
        s.over = true;
        return "dead";
      }
      // Corps (la queue libère sa case sauf si on mange)
      var body = eating ? s.snake : s.snake.slice(0, -1);
      for (var i = 0; i < body.length; i++) {
        if (body[i].x === head.x && body[i].y === head.y) {
          s.over = true;
          return "dead";
        }
      }

      s.snake.unshift(head);
      if (eating) {
        s.score += 1;
        s.food = spawnFood();
        if (!s.food) {
          s.won = true;
          s.over = true;
        }
        return "eat";
      }
      s.snake.pop();
      return "move";
    }

    reset();
    return { state: s, reset: reset, turn: turn, step: step };
  }

  // Export pour les tests Node ; sans effet dans le navigateur.
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { createEngine: createEngine };
  }
  if (typeof document === "undefined") return;

  /* ---------------------------------------------------------
     2. Interface (modale, canvas, entrées)
     --------------------------------------------------------- */
  var COLS = 20;
  var ROWS = 20;
  var CELL = 20; // taille logique d'une case
  var SIZE = COLS * CELL;

  var DIRS = {
    up: [0, -1],
    down: [0, 1],
    left: [-1, 0],
    right: [1, 0]
  };

  var KEYMAP = {
    ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
    w: "up", z: "up", s: "down", a: "left", q: "left", d: "right"
  };

  var engine = createEngine(COLS, ROWS);
  var ui = null;          // éléments DOM, créés à la première ouverture
  var ctx = null;
  var mode = "ready";     // ready | running | paused | over
  var timer = null;
  var best = 0;
  var opener = null;      // élément qui avait le focus avant l'ouverture

  try { best = parseInt(window.localStorage.getItem("snake-best"), 10) || 0; } catch (e) { best = 0; }

  function saveBest() {
    try { window.localStorage.setItem("snake-best", String(best)); } catch (e) { /* stockage indisponible */ }
  }

  function buildUI() {
    var el = document.createElement("div");
    el.className = "snake-modal";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-labelledby", "snake-title");
    el.innerHTML =
      '<div class="snake-card">' +
        '<div class="snake-top">' +
          '<h2 id="snake-title">Snake</h2>' +
          '<div class="snake-scores" aria-live="polite">' +
            '<span>Score <b data-score>0</b></span>' +
            '<span>Record <b data-best>0</b></span>' +
          '</div>' +
          '<button type="button" class="snake-close" aria-label="Fermer le jeu">×</button>' +
        '</div>' +
        '<div class="snake-stage">' +
          '<canvas aria-label="Grille de jeu du Snake"></canvas>' +
          '<div class="snake-overlay">' +
            '<h3 data-title></h3><p data-text></p>' +
            '<button type="button" class="btn btn-primary" data-action>Jouer</button>' +
          '</div>' +
        '</div>' +
        '<p class="snake-help">Flèches ou ZQSD pour tourner · Espace : pause · R : rejouer · Échap : fermer</p>' +
        '<div class="snake-pad">' +
          '<button type="button" data-dir="up" aria-label="Haut">▲</button>' +
          '<button type="button" data-dir="left" aria-label="Gauche">◀</button>' +
          '<button type="button" data-dir="down" aria-label="Bas">▼</button>' +
          '<button type="button" data-dir="right" aria-label="Droite">▶</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(el);

    var canvas = el.querySelector("canvas");
    var dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ui = {
      root: el,
      canvas: canvas,
      score: el.querySelector("[data-score]"),
      best: el.querySelector("[data-best]"),
      overlay: el.querySelector(".snake-overlay"),
      title: el.querySelector("[data-title]"),
      text: el.querySelector("[data-text]"),
      action: el.querySelector("[data-action]"),
      close: el.querySelector(".snake-close")
    };

    ui.close.addEventListener("click", close);
    ui.action.addEventListener("click", function () {
      if (mode === "paused") resume();
      else startNew();
    });
    el.addEventListener("mousedown", function (e) {
      if (e.target === el) close(); // clic sur le fond
    });

    // Croix directionnelle (mobile)
    el.querySelectorAll(".snake-pad button").forEach(function (b) {
      b.addEventListener("pointerdown", function (e) {
        e.preventDefault();
        input(b.getAttribute("data-dir"));
      });
    });

    // Swipe sur la grille
    var t0 = null;
    ui.canvas.addEventListener("touchstart", function (e) {
      var t = e.changedTouches[0];
      t0 = { x: t.clientX, y: t.clientY };
    }, { passive: true });
    ui.canvas.addEventListener("touchend", function (e) {
      if (!t0) return;
      var t = e.changedTouches[0];
      var dx = t.clientX - t0.x;
      var dy = t.clientY - t0.y;
      t0 = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      input(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
    }, { passive: true });
  }

  /* ---------- Rendu ---------- */

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function draw() {
    var s = engine.state;
    ctx.clearRect(0, 0, SIZE, SIZE);

    // Damier discret
    ctx.fillStyle = "rgba(255,255,255,0.025)";
    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        if ((x + y) % 2 === 0) ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
      }
    }

    // Nourriture
    if (s.food) {
      ctx.save();
      ctx.shadowColor = "rgba(255,180,84,0.8)";
      ctx.shadowBlur = 10;
      ctx.fillStyle = "#ffb454";
      ctx.beginPath();
      ctx.arc(s.food.x * CELL + CELL / 2, s.food.y * CELL + CELL / 2, CELL * 0.34, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Serpent (dégradé de la queue vers la tête)
    var n = s.snake.length;
    for (var i = n - 1; i >= 0; i--) {
      var seg = s.snake[i];
      var k = n > 1 ? 1 - i / (n - 1) : 1; // 0 = queue, 1 = tête
      var light = 42 + Math.round(k * 22);
      ctx.fillStyle = i === 0 ? "#9ad0ff" : "hsl(208 85% " + light + "%)";
      roundRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2, i === 0 ? 7 : 5);
      ctx.fill();
    }

    // Yeux
    var h = s.snake[0];
    var d = s.dir;
    var px = h.x * CELL + CELL / 2;
    var py = h.y * CELL + CELL / 2;
    var ox = d.x * 4;
    var oy = d.y * 4;
    var sx = Math.abs(d.y) * 4; // décalage perpendiculaire
    var sy = Math.abs(d.x) * 4;
    ctx.fillStyle = "#04111f";
    ctx.beginPath();
    ctx.arc(px + ox + sx, py + oy + sy, 1.8, 0, Math.PI * 2);
    ctx.arc(px + ox - sx, py + oy - sy, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  function updateScores() {
    ui.score.textContent = engine.state.score;
    ui.best.textContent = best;
  }

  function showOverlay(title, text, action) {
    ui.title.textContent = title;
    ui.text.textContent = text;
    ui.action.textContent = action;
    ui.overlay.hidden = false;
  }

  /* ---------- Boucle de jeu ---------- */

  function delay() {
    return Math.max(70, 140 - engine.state.score * 3);
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(tick, delay());
  }

  function tick() {
    if (mode !== "running") return;
    var result = engine.step();
    var s = engine.state;

    if (s.score > best) {
      best = s.score;
      saveBest();
    }
    updateScores();
    draw();

    if (result === "dead") {
      mode = "over";
      if (s.won) showOverlay("Grille complète !", "Score parfait : " + s.score + ".", "Rejouer");
      else showOverlay("Perdu", "Score : " + s.score + (s.score && s.score === best ? " — nouveau record !" : "") + ".", "Rejouer");
      return;
    }
    schedule();
  }

  function startNew() {
    clearTimeout(timer);
    engine.reset();
    mode = "running";
    ui.overlay.hidden = true;
    updateScores();
    draw();
    schedule();
  }

  function pause() {
    if (mode !== "running") return;
    mode = "paused";
    clearTimeout(timer);
    showOverlay("Pause", "Appuie sur Espace pour reprendre.", "Reprendre");
  }

  function resume() {
    if (mode !== "paused") return;
    mode = "running";
    ui.overlay.hidden = true;
    schedule();
  }

  function togglePause() {
    if (mode === "running") pause();
    else if (mode === "paused") resume();
    else startNew();
  }

  /** Entrée directionnelle ("up" | "down" | "left" | "right"). */
  function input(name) {
    var v = DIRS[name];
    if (!v) return;
    if (mode === "ready" || mode === "over") {
      startNew();
    } else if (mode === "paused") {
      resume();
    }
    engine.turn(v[0], v[1]);
  }

  /* ---------- Ouverture / fermeture ---------- */

  function isOpen() {
    return !!ui && ui.root.hasAttribute("data-open");
  }

  function open(trigger) {
    if (!ui) buildUI();
    if (isOpen()) return;
    opener = trigger || document.activeElement;
    ui.root.setAttribute("data-open", "");
    document.body.classList.add("snake-lock");

    engine.reset();
    mode = "ready";
    updateScores();
    draw();
    showOverlay("Prêt ?", "Appuie sur une flèche, une direction ou le bouton pour lancer la partie.", "Jouer");
    ui.action.focus();
  }

  function close() {
    if (!isOpen()) return;
    clearTimeout(timer);
    mode = "ready";
    ui.root.removeAttribute("data-open");
    document.body.classList.remove("snake-lock");
    if (opener && opener.focus) opener.focus();
  }

  /* ---------- Clavier ---------- */

  document.addEventListener("keydown", function (e) {
    if (!isOpen()) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }

    var name = KEYMAP[e.key] || KEYMAP[(e.key || "").toLowerCase()];
    if (name) {
      e.preventDefault(); // empêche la page de défiler avec les flèches
      if (!e.repeat) input(name);
      return;
    }

    if (e.key === " " || e.code === "Space") {
      // Laisse Espace activer un bouton ciblé (fermer, jouer, pad) ; sinon pause.
      if (document.activeElement && document.activeElement.tagName === "BUTTON") return;
      e.preventDefault();
      togglePause();
      return;
    }

    if (e.key === "r" || e.key === "R") {
      e.preventDefault();
      startNew();
      return;
    }

    // Garde le focus dans la fenêtre de jeu
    if (e.key === "Tab") {
      var f = ui.root.querySelectorAll("button:not([hidden])");
      var list = Array.prototype.filter.call(f, function (b) { return b.offsetParent !== null; });
      if (!list.length) return;
      var first = list[0];
      var last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // Pause automatique quand l'onglet est masqué
  document.addEventListener("visibilitychange", function () {
    if (document.hidden && isOpen()) pause();
  });

  // Tout élément [data-open-snake] lance le jeu
  document.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target.closest("[data-open-snake]") : null;
    if (t) {
      e.preventDefault();
      open(t);
    }
  });
})();
