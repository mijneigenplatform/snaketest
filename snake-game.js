export const GRID_SIZE = 16;
export const INITIAL_DIRECTION = "right";
export const TICK_MS = 140;

const DIRECTION_VECTORS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 }
};

const OPPOSITE_DIRECTIONS = {
  up: "down",
  down: "up",
  left: "right",
  right: "left"
};

function positionKey(position) {
  return `${position.x},${position.y}`;
}

function wrapPosition(position, gridSize) {
  return {
    x: (position.x + gridSize) % gridSize,
    y: (position.y + gridSize) % gridSize
  };
}

function getAllEmptyCells(snake, gridSize) {
  const occupied = new Set(snake.map(positionKey));
  const cells = [];

  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      const candidate = { x, y };
      if (!occupied.has(positionKey(candidate))) {
        cells.push(candidate);
      }
    }
  }

  return cells;
}

export function placeFood(snake, gridSize, rng = Math.random) {
  const emptyCells = getAllEmptyCells(snake, gridSize);
  if (emptyCells.length === 0) {
    return null;
  }

  const index = Math.floor(rng() * emptyCells.length);
  return emptyCells[index];
}

export function createInitialState(rng = Math.random, gridSize = GRID_SIZE) {
  const startX = Math.floor(gridSize / 2);
  const startY = Math.floor(gridSize / 2);
  const snake = [
    { x: startX, y: startY },
    { x: startX - 1, y: startY },
    { x: startX - 2, y: startY }
  ];

  return {
    gridSize,
    snake,
    direction: INITIAL_DIRECTION,
    pendingDirection: INITIAL_DIRECTION,
    food: placeFood(snake, gridSize, rng),
    score: 0,
    status: "ready"
  };
}

export function setDirection(state, nextDirection) {
  if (!DIRECTION_VECTORS[nextDirection]) {
    return state;
  }

  if (OPPOSITE_DIRECTIONS[state.direction] === nextDirection) {
    return state;
  }

  if (state.pendingDirection !== state.direction) {
    return state;
  }

  return {
    ...state,
    pendingDirection: nextDirection
  };
}

export function stepGame(state, rng = Math.random) {
  if (state.status !== "running") {
    return state;
  }

  const direction = state.pendingDirection;
  const vector = DIRECTION_VECTORS[direction];
  const nextHead = wrapPosition({
    x: state.snake[0].x + vector.x,
    y: state.snake[0].y + vector.y
  }, state.gridSize);

  const willEatFood = state.food && nextHead.x === state.food.x && nextHead.y === state.food.y;
  const nextSnake = [nextHead, ...state.snake];

  if (!willEatFood) {
    nextSnake.pop();
  }

  const body = nextSnake.slice(1);
  const collidedWithSelf = body.some((segment) => segment.x === nextHead.x && segment.y === nextHead.y);
  if (collidedWithSelf) {
    return {
      ...state,
      snake: nextSnake,
      direction,
      status: "game-over"
    };
  }

  const nextScore = willEatFood ? state.score + 1 : state.score;
  const nextFood = willEatFood ? placeFood(nextSnake, state.gridSize, rng) : state.food;
  const nextStatus = nextFood === null ? "won" : "running";

  return {
    ...state,
    snake: nextSnake,
    direction,
    pendingDirection: direction,
    food: nextFood,
    score: nextScore,
    status: nextStatus
  };
}

export function startGame(state) {
  if (state.status === "ready" || state.status === "paused") {
    return {
      ...state,
      status: "running"
    };
  }

  return state;
}

export function pauseGame(state) {
  if (state.status === "running") {
    return {
      ...state,
      status: "paused"
    };
  }

  return state;
}

export function restartGame(rng = Math.random, gridSize = GRID_SIZE) {
  return createInitialState(rng, gridSize);
}