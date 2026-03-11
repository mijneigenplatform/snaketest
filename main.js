import {
  GRID_SIZE,
  TICK_MS,
  createInitialState,
  pauseGame,
  restartGame,
  setDirection,
  startGame,
  stepGame
} from "./snake-game.js";

const PLAYER_NAME_KEY = "snake.playerName";
const LOCAL_LEADERBOARD_KEY = "snake.leaderboard";
const MAX_LEADERBOARD_ENTRIES = 10;
const REMOTE_NAME_MAX_LENGTH = 24;

const appConfig = window.SNAKE_CONFIG ?? {};
const remoteConfig = {
  supabaseUrl: typeof appConfig.supabaseUrl === "string" ? appConfig.supabaseUrl.trim().replace(/\/$/, "") : "",
  supabaseAnonKey: typeof appConfig.supabaseAnonKey === "string" ? appConfig.supabaseAnonKey.trim() : "",
  leaderboardTable: typeof appConfig.leaderboardTable === "string" && appConfig.leaderboardTable.trim()
    ? appConfig.leaderboardTable.trim()
    : "snake_scores"
};
const isRemoteLeaderboardEnabled = Boolean(remoteConfig.supabaseUrl && remoteConfig.supabaseAnonKey);

const boardElement = document.querySelector("#board");
const scoreElement = document.querySelector("#score");
const stateElement = document.querySelector("#state");
const playerNameElement = document.querySelector("#player-name");
const leaderboardModeElement = document.querySelector("#leaderboard-mode");
const leaderboardListElement = document.querySelector("#leaderboard-list");
const startButton = document.querySelector("#start-button");
const pauseButton = document.querySelector("#pause-button");
const restartButton = document.querySelector("#restart-button");
const renameButton = document.querySelector("#rename-button");
const controlButtons = document.querySelectorAll("[data-direction]");

let gameState = createInitialState();
let playerName = ensurePlayerName();
let tickHandle = null;
let hasSavedCurrentScore = false;

const leaderboardStore = isRemoteLeaderboardEnabled ? createRemoteLeaderboardStore(remoteConfig) : createLocalLeaderboardStore();

function ensurePlayerName() {
  const storedName = window.localStorage.getItem(PLAYER_NAME_KEY);
  if (storedName && storedName.trim()) {
    return storedName.trim();
  }

  return promptForPlayerName();
}

function promptForPlayerName() {
  let nextName = "";

  while (!nextName) {
    const value = window.prompt("Vul je naam in voor het leaderboard:", "Speler");
    if (value === null) {
      nextName = "Speler";
      break;
    }

    nextName = value.trim();
  }

  nextName = nextName.slice(0, REMOTE_NAME_MAX_LENGTH);
  window.localStorage.setItem(PLAYER_NAME_KEY, nextName);
  return nextName;
}

function createLocalLeaderboardStore() {
  return {
    modeLabel: "Lokale browser-opslag",
    async listScores() {
      try {
        const raw = window.localStorage.getItem(LOCAL_LEADERBOARD_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    },
    async saveScore(name, score) {
      if (score <= 0) {
        return;
      }

      const entries = await this.listScores();
      entries.push({
        name,
        score,
        achievedAt: new Date().toISOString()
      });

      entries.sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }

        return left.achievedAt.localeCompare(right.achievedAt);
      });

      window.localStorage.setItem(LOCAL_LEADERBOARD_KEY, JSON.stringify(entries.slice(0, MAX_LEADERBOARD_ENTRIES)));
    }
  };
}

function createRemoteLeaderboardStore(config) {
  const endpoint = `${config.supabaseUrl}/rest/v1/${config.leaderboardTable}`;
  const headers = {
    apikey: config.supabaseAnonKey,
    Authorization: `Bearer ${config.supabaseAnonKey}`
  };

  return {
    modeLabel: "Online gedeelde leaderboard",
    async listScores() {
      const url = `${endpoint}?select=name,score,achieved_at&order=score.desc,achieved_at.asc&limit=${MAX_LEADERBOARD_ENTRIES}`;
      const response = await window.fetch(url, {
        method: "GET",
        headers
      });

      if (!response.ok) {
        throw new Error("Kon online leaderboard niet laden.");
      }

      const rows = await response.json();
      return rows.map((row) => ({
        name: String(row.name ?? "Speler"),
        score: Number(row.score ?? 0),
        achievedAt: String(row.achieved_at ?? "")
      }));
    },
    async saveScore(name, score) {
      if (score <= 0) {
        return;
      }

      const response = await window.fetch(endpoint, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
          Prefer: "return=minimal"
        },
        body: JSON.stringify({
          name: name.slice(0, REMOTE_NAME_MAX_LENGTH),
          score
        })
      });

      if (!response.ok) {
        throw new Error("Kon score niet online opslaan.");
      }
    }
  };
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatStatus(status) {
  switch (status) {
    case "ready":
      return "Ready";
    case "running":
      return "Running";
    case "paused":
      return "Paused";
    case "game-over":
      return "Game Over";
    case "won":
      return "Won";
    default:
      return status;
  }
}

function formatAchievementDate(value) {
  if (!value) {
    return "Onbekende datum";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Onbekende datum";
  }

  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

async function refreshLeaderboard() {
  leaderboardModeElement.textContent = leaderboardStore.modeLabel;

  try {
    const entries = await leaderboardStore.listScores();
    if (entries.length === 0) {
      leaderboardListElement.innerHTML = '<li class="leaderboard-empty">Nog geen scores opgeslagen.</li>';
      return;
    }

    leaderboardListElement.innerHTML = entries
      .map((entry) => {
        return `
          <li class="leaderboard-entry">
            <div class="leaderboard-meta">
              <span class="leaderboard-name">${escapeHtml(entry.name)}</span>
              <span class="leaderboard-date">${escapeHtml(formatAchievementDate(entry.achievedAt))}</span>
            </div>
            <strong class="leaderboard-score">${entry.score}</strong>
          </li>
        `;
      })
      .join("");
  } catch (error) {
    leaderboardListElement.innerHTML = `<li class="leaderboard-error">${escapeHtml(error.message)}</li>`;
  }
}

async function maybeRecordFinishedGame() {
  if (hasSavedCurrentScore) {
    return;
  }

  if (gameState.status === "game-over" || gameState.status === "won") {
    hasSavedCurrentScore = true;

    try {
      await leaderboardStore.saveScore(playerName, gameState.score);
      await refreshLeaderboard();
    } catch (error) {
      hasSavedCurrentScore = false;
      leaderboardListElement.innerHTML = `<li class="leaderboard-error">${escapeHtml(error.message)}</li>`;
    }
  }
}

function renderBoard() {
  const snakeMap = new Map(gameState.snake.map((segment, index) => [`${segment.x},${segment.y}`, index]));
  const cells = [];

  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      const key = `${x},${y}`;
      const classes = ["cell"];
      if (snakeMap.has(key)) {
        classes.push("snake");
        if (snakeMap.get(key) === 0) {
          classes.push("head");
        }
      } else if (gameState.food && gameState.food.x === x && gameState.food.y === y) {
        classes.push("food");
      }

      cells.push(`<div class="${classes.join(" ")}" role="gridcell" aria-label="${key}"></div>`);
    }
  }

  boardElement.innerHTML = cells.join("");
  scoreElement.textContent = String(gameState.score);
  stateElement.textContent = formatStatus(gameState.status);
  playerNameElement.textContent = playerName;
  pauseButton.disabled = gameState.status !== "running";
  startButton.disabled = gameState.status === "running";
}

function stopTicking() {
  if (tickHandle !== null) {
    window.clearInterval(tickHandle);
    tickHandle = null;
  }
}

function startTicking() {
  stopTicking();
  tickHandle = window.setInterval(async () => {
    gameState = stepGame(gameState);
    renderBoard();

    if (gameState.status !== "running") {
      stopTicking();
      await maybeRecordFinishedGame();
    }
  }, TICK_MS);
}

function beginGame() {
  gameState = startGame(gameState);
  renderBoard();

  if (gameState.status === "running") {
    startTicking();
  }
}

function pauseCurrentGame() {
  gameState = pauseGame(gameState);
  renderBoard();
  stopTicking();
}

function restartCurrentGame() {
  gameState = restartGame();
  hasSavedCurrentScore = false;
  renderBoard();
  stopTicking();
}

function queueDirection(direction) {
  gameState = setDirection(gameState, direction);
  if (gameState.status === "ready") {
    beginGame();
  } else {
    renderBoard();
  }
}

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  const directionMap = {
    arrowup: "up",
    w: "up",
    arrowdown: "down",
    s: "down",
    arrowleft: "left",
    a: "left",
    arrowright: "right",
    d: "right"
  };

  if (directionMap[key]) {
    event.preventDefault();
    queueDirection(directionMap[key]);
    return;
  }

  if (key === " ") {
    event.preventDefault();
    if (gameState.status === "running") {
      pauseCurrentGame();
    } else if (gameState.status === "paused" || gameState.status === "ready") {
      beginGame();
    }
    return;
  }

  if (key === "enter" && gameState.status === "game-over") {
    restartCurrentGame();
  }
});

startButton.addEventListener("click", beginGame);
pauseButton.addEventListener("click", pauseCurrentGame);
restartButton.addEventListener("click", restartCurrentGame);
renameButton.addEventListener("click", () => {
  playerName = promptForPlayerName();
  renderBoard();
});

controlButtons.forEach((button) => {
  button.addEventListener("click", () => {
    queueDirection(button.dataset.direction);
  });
});

renderBoard();
refreshLeaderboard();