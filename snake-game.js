export const GRID_SIZE = 16;
export const INITIAL_DIRECTION = "right";
export const TICK_MS = 140;
export const BONUS_LIFETIME_TICKS = Math.ceil(5000 / TICK_MS);
const BONUS_INTERVAL_MIN = 4;
const BONUS_INTERVAL_MAX = 6;
const BONUS_TYPES = [
  { kind: "gold", score: 5, lifetimeTicks: BONUS_LIFETIME_TICKS },
  { kind: "blue", score: 8, lifetimeTicks: BONUS_LIFETIME_TICKS }
];

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

function randomBonusInterval(rng = Math.random) {
  const span = BONUS_INTERVAL_MAX - BONUS_INTERVAL_MIN + 1;
  return BONUS_INTERVAL_MIN + Math.floor(rng() * span);
}

function randomBonusType(rng = Math.random) {
  const index = Math.floor(rng() * BONUS_TYPES.length);
  return BONUS_TYPES[index];
}

function getAllEmptyCells(snake, gridSize, blockedPositions = []) {
  const occupied = new Set(snake.map(positionKey));
  blockedPositions.filter(Boolean).forEach((position) => occupied.add(positionKey(position)));
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

export function placeFood(snake, gridSize, rng = Math.random, blockedPositions = []) {
  const emptyCells = getAllEmptyCells(snake, gridSize, blockedPositions);
  if (emptyCells.length === 0) {
    return null;
  }

  const index = Math.floor(rng() * emptyCells.length);
  return emptyCells[index];
}

function placeBonusFood(snake, food, gridSize, rng = Math.random) {
  const position = placeFood(snake, gridSize, rng, [food]);
  if (!position) {
    return null;
  }

  const bonusType = randomBonusType(rng);
  return {
    ...position,
    kind: bonusType.kind,
    score: bonusType.score,
    lifetimeTicks: bonusType.lifetimeTicks
  };
}

function extendSnake(snake, amount) {
  if (amount <= 0 || snake.length === 0) {
    return snake;
  }

  const nextSnake = [...snake];
  const tail = snake[snake.length - 1];

  for (let index = 0; index < amount; index += 1) {
    nextSnake.push({ ...tail });
  }

  return nextSnake;
}

function createSpawnResult(state, snake, rng, options = {}) {
  const ateFood = Boolean(options.ateFood);
  const ateBonusFood = Boolean(options.ateBonusFood && state.bonusFood);
  const bonusScore = ateBonusFood ? state.bonusFood.score : 0;
  const growthGain = (ateFood ? 1 : 0) + bonusScore;
  const nextSnake = extendSnake(snake, Math.max(0, growthGain - (ateFood ? 1 : 0)));
  const nextFoodsEaten = ateFood ? state.foodsEaten + 1 : state.foodsEaten;
  const nextScore = state.score + (ateFood ? 1 : 0) + bonusScore;
  const nextFood = ateFood ? placeFood(nextSnake, state.gridSize, rng, [state.bonusFood]) : state.food;

  let nextBonusFood = ateBonusFood ? null : state.bonusFood;
  let nextBonusExpiresAtTick = ateBonusFood ? null : state.bonusExpiresAtTick;
  let nextBonusAtFoodsEaten = state.nextBonusAtFoodsEaten;

  if (ateFood && nextFood !== null && nextFoodsEaten >= state.nextBonusAtFoodsEaten) {
    nextBonusFood = placeBonusFood(nextSnake, nextFood, state.gridSize, rng);
    nextBonusExpiresAtTick = nextBonusFood ? state.tick + nextBonusFood.lifetimeTicks : null;
    nextBonusAtFoodsEaten = nextFoodsEaten + randomBonusInterval(rng);
  }

  return {
    snake: nextSnake,
    food: nextFood,
    bonusFood: nextBonusFood,
    bonusExpiresAtTick: nextBonusExpiresAtTick,
    foodsEaten: nextFoodsEaten,
    nextBonusAtFoodsEaten,
    score: nextScore,
    status: nextFood === null ? "won" : state.status
  };
}

function findShotTarget(state) {
  const head = state.snake[0];
  const vector = DIRECTION_VECTORS[state.direction];
  const candidates = [state.food, state.bonusFood].filter(Boolean).filter((target) => {
    if (vector.x !== 0) {
      if (target.y !== head.y) {
        return false;
      }
      return vector.x > 0 ? target.x > head.x : target.x < head.x;
    }

    if (target.x !== head.x) {
      return false;
    }
    return vector.y > 0 ? target.y > head.y : target.y < head.y;
  });

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((left, right) => {
    const leftDistance = Math.abs(left.x - head.x) + Math.abs(left.y - head.y);
    const rightDistance = Math.abs(right.x - head.x) + Math.abs(right.y - head.y);
    return leftDistance - rightDistance;
  });

  return candidates[0];
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
    bonusFood: null,
    bonusExpiresAtTick: null,
    foodsEaten: 0,
    nextBonusAtFoodsEaten: randomBonusInterval(rng),
    tick: 0,
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

export function fireShot(state, rng = Math.random) {
  if (state.status === "game-over" || state.status === "won") {
    return state;
  }

  const target = findShotTarget(state);
  if (!target) {
    return state;
  }

  const ateFood = state.food && target.x === state.food.x && target.y === state.food.y;
  const ateBonusFood = state.bonusFood && target.x === state.bonusFood.x && target.y === state.bonusFood.y;
  const spawnResult = createSpawnResult(state, state.snake, rng, {
    ateFood,
    ateBonusFood
  });

  return {
    ...state,
    ...spawnResult
  };
}

export function stepGame(state, rng = Math.random) {
  if (state.status !== "running") {
    return state;
  }

  const nextTick = state.tick + 1;
  const isBonusStillActive = state.bonusFood && state.bonusExpiresAtTick !== null && state.bonusExpiresAtTick > nextTick;
  const activeBonusFood = isBonusStillActive ? state.bonusFood : null;
  const activeBonusExpiresAtTick = isBonusStillActive ? state.bonusExpiresAtTick : null;

  const direction = state.pendingDirection;
  const vector = DIRECTION_VECTORS[direction];
  const nextHead = wrapPosition({
    x: state.snake[0].x + vector.x,
    y: state.snake[0].y + vector.y
  }, state.gridSize);

  const willEatFood = state.food && nextHead.x === state.food.x && nextHead.y === state.food.y;
  const willEatBonusFood = activeBonusFood && nextHead.x === activeBonusFood.x && nextHead.y === activeBonusFood.y;
  const nextSnake = [nextHead, ...state.snake];

  if (!willEatFood && !willEatBonusFood) {
    nextSnake.pop();
  }

  const body = nextSnake.slice(1);
  const collidedWithSelf = body.some((segment) => segment.x === nextHead.x && segment.y === nextHead.y);
  if (collidedWithSelf) {
    return {
      ...state,
      snake: nextSnake,
      direction,
      tick: nextTick,
      bonusFood: activeBonusFood,
      bonusExpiresAtTick: activeBonusExpiresAtTick,
      status: "game-over"
    };
  }

  const nextStateSeed = {
    ...state,
    tick: nextTick,
    bonusFood: activeBonusFood,
    bonusExpiresAtTick: activeBonusExpiresAtTick,
    status: "running"
  };
  const spawnResult = createSpawnResult(nextStateSeed, nextSnake, rng, {
    ateFood: willEatFood,
    ateBonusFood: willEatBonusFood
  });

  return {
    ...state,
    snake: spawnResult.snake,
    direction,
    pendingDirection: direction,
    food: spawnResult.food,
    bonusFood: spawnResult.bonusFood,
    bonusExpiresAtTick: spawnResult.bonusExpiresAtTick,
    foodsEaten: spawnResult.foodsEaten,
    nextBonusAtFoodsEaten: spawnResult.nextBonusAtFoodsEaten,
    tick: nextTick,
    score: spawnResult.score,
    status: spawnResult.status
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