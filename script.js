(() => {
  // buscaminas-puro/js/game/engine.js
  function seededRandom(seed) {
    let value = seed >>> 0;
    return () => {
      value += 1831565813;
      let t = value;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function emptyBoard(config) {
    return Array.from({ length: config.rows * config.cols }, () => ({ mine: false, adjacent: 0, revealed: false, flagged: false }));
  }
  function neighbors(index, config) {
    const row = Math.floor(index / config.cols), col = index % config.cols, result = [];
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        const r = row + dr, c = col + dc;
        if ((dr || dc) && r >= 0 && r < config.rows && c >= 0 && c < config.cols)
          result.push(r * config.cols + c);
      }
    return result;
  }
  function countAdjacent(cells, config) {
    return cells.map((cell, index) => ({ ...cell, adjacent: neighbors(index, config).filter((i) => cells[i].mine).length }));
  }
  function generateBoard(config, first, random, previous = emptyBoard(config)) {
    const excluded = /* @__PURE__ */ new Set([first, ...neighbors(first, config)]);
    const candidates = previous.map((_, index) => index).filter((index) => !excluded.has(index));
    if (config.mines > candidates.length)
      throw new Error("Demasiadas minas para una primera jugada segura.");
    const cells = previous.map((cell) => ({ ...cell, mine: false, adjacent: 0 }));
    for (let i = 0; i < config.mines; i++) {
      const draw = random();
      if (!Number.isFinite(draw) || draw < 0 || draw >= 1)
        throw new Error("La aleatoriedad debe estar entre 0 y 1 (exclusivo).");
      const j = i + Math.floor(draw * (candidates.length - i));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
      cells[candidates[i]].mine = true;
    }
    return countAdjacent(cells, config);
  }
  function revealRegion(cells, config, indices) {
    const result = cells.slice(), queue = [...indices], visited = /* @__PURE__ */ new Set();
    let detonated = null;
    for (let head = 0; head < queue.length; head++) {
      const index = queue[head];
      if (visited.has(index) || index < 0 || index >= cells.length)
        continue;
      visited.add(index);
      const cell = result[index];
      if (cell.flagged || cell.revealed)
        continue;
      result[index] = { ...cell, revealed: true };
      if (cell.mine) {
        detonated ?? (detonated = index);
        continue;
      }
      if (cell.adjacent === 0)
        queue.push(...neighbors(index, config));
    }
    return { cells: result, detonated };
  }
  var hasWon = (cells) => cells.every((cell) => cell.mine || cell.revealed);

  // buscaminas-puro/js/game/config.js
  var maxMines = (rows, cols) => Math.min(Math.floor(rows * cols * 0.35), rows * cols - 9);
  function validateConfig(config) {
    const errors = [];
    if (!Number.isInteger(config.rows) || config.rows < 5 || config.rows > 30)
      errors.push("Las filas deben ser un n\xFAmero entero entre 5 y 30.");
    if (!Number.isInteger(config.cols) || config.cols < 5 || config.cols > 30)
      errors.push("Las columnas deben ser un n\xFAmero entero entre 5 y 30.");
    if (!errors.length && (!Number.isInteger(config.mines) || config.mines < 1 || config.mines > maxMines(config.rows, config.cols)))
      errors.push(`Las minas deben ser un n\xFAmero entero entre 1 y ${maxMines(config.rows, config.cols)}.`);
    return errors;
  }
  function isConfig(value) {
    if (typeof value !== "object" || value === null)
      return false;
    const v = value;
    return typeof v.rows === "number" && typeof v.cols === "number" && typeof v.mines === "number" && !validateConfig({ rows: v.rows, cols: v.cols, mines: v.mines }).length;
  }

  // buscaminas-puro/js/game/reducer.js
  function createGame(config, difficulty) {
    const errors = validateConfig(config);
    if (errors.length)
      throw new Error(errors.join(" "));
    return { round: 0, config: { ...config }, difficulty, cells: emptyBoard(config), generated: false, status: "ready", startedAt: null, endedAt: null, detonated: null };
  }
  function gameReducer(state2, action) {
    if (action.type === "reset")
      return { ...createGame(action.config, action.difficulty), round: state2.round + 1 };
    if (state2.status === "won" || state2.status === "lost" || !Number.isInteger(action.index) || action.index < 0 || action.index >= state2.cells.length)
      return state2;
    const cell = state2.cells[action.index];
    if (action.type === "flag") {
      if (cell.revealed)
        return state2;
      const cells = state2.cells.slice();
      cells[action.index] = { ...cell, flagged: !cell.flagged };
      return { ...state2, cells };
    }
    if (cell.flagged)
      return state2;
    let indices = [action.index];
    if (cell.revealed) {
      if (!cell.adjacent)
        return state2;
      const around = neighbors(action.index, state2.config);
      if (around.filter((i) => state2.cells[i].flagged).length !== cell.adjacent)
        return state2;
      indices = around.filter((i) => !state2.cells[i].flagged && !state2.cells[i].revealed);
      if (!indices.length)
        return state2;
    }
    const board2 = state2.generated ? state2.cells : generateBoard(state2.config, action.index, seededRandom(action.seed), state2.cells);
    const result = revealRegion(board2, state2.config, indices);
    const status = result.detonated !== null ? "lost" : hasWon(result.cells) ? "won" : "playing";
    return { ...state2, ...result, generated: true, startedAt: state2.startedAt ?? action.now, endedAt: status === "playing" ? null : action.now, status };
  }

  // buscaminas-puro/js/storage/persistence.js
  var STORAGE_KEY = "buscaminas:v1";
  var defaults = () => ({ difficulty: "easy", custom: { rows: 10, cols: 10, mines: 15 }, records: {} });
  function parseSaved(raw) {
    const fallback = defaults();
    if (!raw)
      return fallback;
    try {
      const value = JSON.parse(raw);
      if (typeof value !== "object" || value === null)
        return fallback;
      const v = value;
      if (["easy", "medium", "expert", "custom"].includes(String(v.difficulty)))
        fallback.difficulty = v.difficulty;
      if (isConfig(v.custom))
        fallback.custom = v.custom;
      if (typeof v.records === "object" && v.records !== null) {
        const records = v.records;
        for (const key of ["easy", "medium", "expert"])
          if (typeof records[key] === "number" && Number.isFinite(records[key]) && records[key] >= 0 && records[key] <= Number.MAX_SAFE_INTEGER)
            fallback.records[key] = records[key];
      }
    } catch {
    }
    return fallback;
  }
  function loadSaved() {
    try {
      return parseSaved(window.localStorage.getItem(STORAGE_KEY));
    } catch {
      return defaults();
    }
  }
  function saveData(data) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
    }
  }
  function improveRecord(data, difficulty, milliseconds) {
    if (difficulty === "custom" || !Number.isFinite(milliseconds) || milliseconds < 0)
      return data;
    const old = data.records[difficulty];
    return old === void 0 || milliseconds < old ? { ...data, records: { ...data.records, [difficulty]: milliseconds } } : data;
  }

  // buscaminas-puro/js/app.js
  var presets = { easy: { rows: 9, cols: 9, mines: 10 }, medium: { rows: 16, cols: 16, mines: 40 }, expert: { rows: 16, cols: 30, mines: 99 } };
  var labels = { easy: "F\xE1cil", medium: "Intermedio", expert: "Experto", custom: "Personalizado" };
  var $ = (id) => document.getElementById(id);
  var saved = loadSaved();
  var state = createGame(presets[saved.difficulty] ?? saved.custom, saved.difficulty);
  var mode = "reveal";
  var active = 0;
  var gesture = null;
  var timer = null;
  var buttons = [];
  var format = (ms) => {
    const s = Math.floor(ms / 1e3);
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  };
  var icon = (name) => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${name === "flag" ? '<path d="M5 21V3m0 1h14l-3 5 3 5H5M2 21h7"/>' : '<circle cx="12" cy="12" r="6" fill="currentColor"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/>'}</svg>`;
  function cancelGesture() {
    if (gesture) clearTimeout(gesture.timeout);
    gesture = null;
  }
  function tick() {
    $("timer").textContent = format(state.startedAt === null ? 0 : (state.endedAt ?? performance.now()) - state.startedAt);
  }
  function dispatch(type, index) {
    const next = gameReducer(state, { type, index, seed: Math.floor(Math.random() * 4294967296), now: performance.now() });
    if (next === state) return;
    state = next;
    if (state.status === "won") {
      saved = improveRecord(saved, state.difficulty, state.endedAt - state.startedAt);
      saveData(saved);
    }
    render();
  }
  function reset(config = state.config, difficulty = state.difficulty) {
    cancelGesture();
    clearInterval(timer);
    timer = null;
    state = gameReducer(state, { type: "reset", config, difficulty });
    active = 0;
    build();
    render();
  }
  function build() {
    const board2 = $("board");
    board2.replaceChildren();
    board2.style.setProperty("--cols", state.config.cols);
    board2.setAttribute("aria-rowcount", state.config.rows);
    board2.setAttribute("aria-colcount", state.config.cols);
    buttons = [];
    for (let r = 0; r < state.config.rows; r++) {
      const row = document.createElement("div");
      row.className = "board-row";
      row.setAttribute("role", "row");
      for (let c = 0; c < state.config.cols; c++) {
        const b = document.createElement("button");
        b.type = "button";
        b.dataset.cell = r * state.config.cols + c;
        b.setAttribute("role", "gridcell");
        row.append(b);
        buttons.push(b);
      }
      board2.append(row);
    }
  }
  function render() {
    const end = ["won", "lost"].includes(state.status);
    state.cells.forEach((cell, i) => {
      const mine = cell.mine && (cell.revealed || state.status === "lost"), wrong = state.status === "lost" && cell.flagged && !cell.mine, flag = cell.flagged || state.status === "won" && cell.mine, det = state.detonated === i;
      const description = wrong ? "bandera incorrecta" : mine ? det ? "mina detonada" : "mina" : flag ? "bandera" : cell.revealed ? cell.adjacent ? `${cell.adjacent} minas vecinas` : "vac\xEDa" : "oculta";
      const b = buttons[i];
      b.tabIndex = i === active ? 0 : -1;
      b.setAttribute("aria-disabled", String(end));
      b.setAttribute("aria-label", `Fila ${Math.floor(i / state.config.cols) + 1}, columna ${i % state.config.cols + 1}: ${description}`);
      const cls = `cell n${cell.adjacent}${cell.revealed ? " open" : ""}${mine ? " mine" : ""}${flag ? " flagged" : ""}${wrong ? " wrong" : ""}${det ? " detonated" : ""}`;
      if (b.className !== cls) b.className = cls;
      const content = (mine ? icon("mine") : flag ? icon("flag") : cell.revealed && cell.adjacent ? String(cell.adjacent) : "") + (wrong ? '<span class="wrong-mark" aria-hidden="true">\xD7</span>' : "");
      if (b.innerHTML !== content) b.innerHTML = content;
    });
    $("mines").textContent = String(state.config.mines - state.cells.filter((c) => c.flagged).length).padStart(2, "0");
    $("status").textContent = { ready: "Todo listo para empezar", playing: "Partida en curso", won: "Tablero resuelto", lost: "Partida terminada" }[state.status];
    $("level-info").textContent = `${labels[state.difficulty]} \xB7 ${state.config.rows} \xD7 ${state.config.cols}`;
    $("detail").textContent = `${state.config.rows} \xD7 ${state.config.cols} \xB7 ${state.config.mines} minas`;
    const count = state.cells.filter((c) => c.revealed && !c.mine).length, total = state.cells.length - state.config.mines;
    $("progress-text").textContent = `${count} de ${total} casillas seguras`;
    $("progress").style.width = `${count / total * 100}%`;
    $("record").textContent = state.difficulty === "custom" ? "Sin r\xE9cord en este modo" : saved.records[state.difficulty] === void 0 ? "Todav\xEDa por descubrir" : format(saved.records[state.difficulty]);
    $("record-level").textContent = labels[state.difficulty];
    for (const b of $("levels").children) {
      const selected = b.dataset.level === state.difficulty;
      b.classList.toggle("selected", selected);
      b.setAttribute("aria-pressed", String(selected));
    }
    const result = end ? `<div class="result ${state.status}"><div><h2>${state.status === "won" ? "\xA1Bien jugado!" : "Encontraste una mina"}</h2><p>${state.status === "won" ? `Revelaste todas las casillas seguras en ${format(state.endedAt - state.startedAt)}.` : "Una nueva partida, una nueva oportunidad."}</p></div><button class="secondary" id="again">Volver a jugar</button></div>` : "";
    if ($("result").innerHTML !== result) {
      $("result").innerHTML = result;
      if (end) $("again").onclick = () => reset();
    }
    if (state.status === "playing" && timer === null) timer = setInterval(tick, 200);
    if (state.status !== "playing") {
      clearInterval(timer);
      timer = null;
    }
    tick();
  }
  for (const [key, label] of Object.entries(labels)) {
    const b = document.createElement("button");
    b.className = "difficulty-button";
    b.textContent = label;
    b.dataset.level = key;
    b.onclick = () => {
      if (key === "custom") {
        $("custom").hidden = false;
        choose(key, saved.custom);
      } else {
        $("custom").hidden = true;
        choose(key, presets[key]);
      }
    };
    $("levels").append(b);
  }
  function choose(difficulty, config) {
    saved = { ...saved, difficulty, custom: difficulty === "custom" ? config : saved.custom };
    saveData(saved);
    reset(config, difficulty);
  }
  var form = $("custom");
  for (const k of ["rows", "cols", "mines"]) form.elements[k].value = saved.custom[k];
  form.hidden = saved.difficulty !== "custom";
  function updateLimit() {
    const max = maxMines(Number(form.elements.rows.value), Number(form.elements.cols.value));
    form.elements.mines.max = Math.max(1, max);
    $("limit").textContent = `M\xE1ximo: ${max} minas (35 % y \xE1rea segura).`;
  }
  form.oninput = updateLimit;
  updateLimit();
  form.noValidate = true;
  form.onsubmit = (e) => {
    e.preventDefault();
    const config = Object.fromEntries(["rows", "cols", "mines"].map((k) => [k, Number(form.elements[k].value)]));
    const errors = validateConfig(config);
    $("errors").textContent = errors.join(" ");
    if (!errors.length) choose("custom", config);
  };
  $("restart").onclick = () => reset();
  for (const m of ["reveal", "flag"]) $(m + "-mode").onclick = () => {
    cancelGesture();
    mode = m;
    for (const n of ["reveal", "flag"]) {
      $(n + "-mode").classList.toggle("active", n === m);
      $(n + "-mode").setAttribute("aria-pressed", String(n === m));
    }
  };
  $("help").onclick = () => {
    cancelGesture();
    $("help-dialog").showModal();
  };
  $("close-help").onclick = () => $("help-dialog").close();
  var scroll = $("scroll");
  var board = $("board");
  var target = (e) => {
    const b = e.target.closest("[data-cell]");
    return b && board.contains(b) ? Number(b.dataset.cell) : null;
  };
  scroll.oncontextmenu = (e) => {
    e.preventDefault();
    cancelGesture();
    const i = target(e);
    if (i !== null) dispatch("flag", i);
  };
  scroll.addEventListener("pointerdown", (e) => {
    cancelGesture();
    const index = target(e);
    if (index === null || e.button !== 0 || !e.isPrimary || ["won", "lost"].includes(state.status)) return;
    gesture = { id: e.pointerId, index, x: e.clientX, y: e.clientY, long: false, moved: false, touch: e.pointerType !== "mouse", timeout: null };
    if (gesture.touch) {
      const g = gesture;
      g.timeout = setTimeout(() => {
        if (gesture === g && !g.moved) {
          g.long = true;
          dispatch("flag", g.index);
        }
      }, 400);
    }
  });
  window.addEventListener("pointermove", (e) => {
    if (gesture && gesture.id === e.pointerId && Math.hypot(e.clientX - gesture.x, e.clientY - gesture.y) > 8) {
      gesture.moved = true;
      clearTimeout(gesture.timeout);
    }
  });
  window.addEventListener("pointerup", (e) => {
    if (!gesture || gesture.id !== e.pointerId) return;
    const g = gesture;
    cancelGesture();
    if (!g.long && !g.moved && target(e) === g.index) dispatch(g.touch && mode === "flag" ? "flag" : "reveal", g.index);
  });
  window.addEventListener("pointercancel", cancelGesture);
  window.addEventListener("blur", cancelGesture);
  window.addEventListener("pagehide", () => {
    cancelGesture();
    clearInterval(timer);
  });
  scroll.addEventListener("scroll", () => {
    if (gesture) {
      gesture.moved = true;
      clearTimeout(gesture.timeout);
    }
  });
  board.addEventListener("click", (e) => {
    if (e.detail === 0) {
      const i = target(e);
      if (i !== null) dispatch("reveal", i);
    }
  });
  board.addEventListener("focusin", (e) => {
    const i = target(e);
    if (i !== null) {
      buttons[active].tabIndex = -1;
      active = i;
      buttons[active].tabIndex = 0;
    }
  });
  board.onkeydown = (e) => {
    let next = active;
    const row = Math.floor(active / state.config.cols), col = active % state.config.cols;
    switch (e.key) {
      case "ArrowRight":
        if (col < state.config.cols - 1) next++;
        break;
      case "ArrowLeft":
        if (col > 0) next--;
        break;
      case "ArrowDown":
        if (row < state.config.rows - 1) next += state.config.cols;
        break;
      case "ArrowUp":
        if (row > 0) next -= state.config.cols;
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (!e.repeat) dispatch("reveal", active);
        return;
      case "f":
      case "F":
        e.preventDefault();
        if (!e.repeat) dispatch("flag", active);
        return;
      default:
        return;
    }
    e.preventDefault();
    buttons[active].tabIndex = -1;
    active = next;
    buttons[active].tabIndex = 0;
    buttons[active].focus();
  };
  build();
  render();
})();
