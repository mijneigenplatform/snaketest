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
const PROJECTILE_SPEED = 3;

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

function stepProjectilePosition(position, direction, gridSize) {
  const vector = DIRECTION_VECTORS[direction];
  const nextPosition = {
    x: position.x + vector.x,
    y: position.y + vector.y
  };

  if (nextPosition.x < 0 || nextPosition.x >= gridSize || nextPosition.y < 0 || nextPosition.y >= gridSize) {
    return null;
  }

  return nextPosition;
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

function extendSnake(snake, amount) {
  if (amount <= 0 || snake.length === 0) {
    return [...snake];
  }

  const tail = snake[snake.length - 1];
  return [...snake, ...Array.from({ length: amount }, () => ({ ...tail }))];
}

function isSameCell(left, right) {
  return Boolean(left && right && left.x === right.x && left.y === right.y);
}

function isSnakeOccupying(snake, position) {
  return snake.some((segment) => segment.x === position.x && segment.y === position.y);
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

function applyTargetHit(state, snake, rng, options = {}) {
  const ateFood = Boolean(options.ateFood);
  const ateBonusFood = Boolean(options.ateBonusFood && state.bonusFood);
  const inherentGrowth = options.inherentGrowth ?? 0;
  const bonusScore = ateBonusFood ? state.bonusFood.score : 0;
  const totalGrowth = (ateFood ? 1 : 0) + bonusScore;
  const extraGrowth = Math.max(0, totalGrowth - inherentGrowth);
  const grownSnake = extendSnake(snake, extraGrowth);
  const nextFoodsEaten = ateFood ? state.foodsEaten + 1 : state.foodsEaten;
  const nextScore = state.score + (ateFood ? 1 : 0) + bonusScore;
  const blockedForFood = [ateBonusFood ? null : state.bonusFood].filter(Boolean);
  const nextFood = ateFood ? placeFood(grownSnake, state.gridSize, rng, blockedForFood) : state.food;

  let nextBonusFood = ateBonusFood ? null : state.bonusFood;
  let nextBonusExpiresAtTick = ateBonusFood ? null : state.bonusExpiresAtTick;
  let nextBonusAtFoodsEaten = state.nextBonusAtFoodsEaten;

  if (ateFood && nextFood !== null && nextFoodsEaten >= state.nextBonusAtFoodsEaten) {
    nextBonusFood = placeBonusFood(grownSnake, nextFood, state.gridSize, rng);
    nextBonusExpiresAtTick = nextBonusFood ? state.tick + nextBonusFood.lifetimeTicks : null;
    nextBonusAtFoodsEaten = nextFoodsEaten + randomBonusInterval(rng);
  }

  return {
    snake: grownSnake,
    food: nextFood,
    bonusFood: nextBonusFood,
    bonusExpiresAtTick: nextBonusExpiresAtTick,
    foodsEaten: nextFoodsEaten,
    nextBonusAtFoodsEaten,
    score: nextScore,
    status: nextFood === null ? "won" : state.status
  };
}

function findTargetAtPosition(state, position) {
  if (isSameCell(state.food, position)) {
    return "food";
  }

  if (isSameCell(state.bonusFood, position)) {
    return "bonus";
  }

  return null;
}

function advanceProjectile(state, rng) {
  let nextState = state;

  for (let step = 0; step < PROJECTILE_SPEED; step += 1) {
    if (!nextState.projectile) {
      return nextState;
    }

    const currentHit = findTargetAtPosition(nextState, nextState.projectile);
    if (currentHit) {
      const hitResult = applyTargetHit(nextState, nextState.snake, rng, {
        ateFood: currentHit === "food",
        ateBonusFood: currentHit === "bonus",
        inherentGrowth: 0
      });

      return {
        ...nextState,
        ...hitResult,
        projectile: null
      };
    }

    const nextPosition = stepProjectilePosition(nextState.projectile, nextState.projectile.direction, nextState.gridSize);
    if (!nextPosition) {
      return {
        ...nextState,
        projectile: null
      };
    }

    if (isSnakeOccupying(nextState.snake, nextPosition)) {
      return {
        ...nextState,
        projectile: null
      };
    }

    const nextHit = findTargetAtPosition(nextState, nextPosition);
    if (nextHit) {
      const hitResult = applyTargetHit(nextState, nextState.snake, rng, {
        ateFood: nextHit === "food",
        ateBonusFood: nextHit === "bonus",
        inherentGrowth: 0
      });

      return {
        ...nextState,
        ...hitResult,
        projectile: null
      };
    }

    nextState = {
      ...nextState,
      projectile: {
        ...nextPosition,
        direction: nextState.projectile.direction
      }
    };
  }

  return nextState;
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
    projectile: null,
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

export function fireShot(state) {
  if (state.status === "game-over" || state.status === "won" || state.projectile) {
    return state;
  }

  const nextPosition = stepProjectilePosition(state.snake[0], state.direction, state.gridSize);
  if (!nextPosition || isSnakeOccupying(state.snake, nextPosition)) {
    return state;
  }

  return {
    ...state,
    projectile: {
      ...nextPosition,
      direction: state.direction
    }
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

  let nextState = {
    ...state,
    tick: nextTick,
    bonusFood: activeBonusFood,
    bonusExpiresAtTick: activeBonusExpiresAtTick
  };

  nextState = advanceProjectile(nextState, rng);
  if (nextState.status === "won") {
    return nextState;
  }

  const direction = nextState.pendingDirection;
  const vector = DIRECTION_VECTORS[direction];
  const nextHead = wrapPosition({
    x: nextState.snake[0].x + vector.x,
    y: nextState.snake[0].y + vector.y
  }, nextState.gridSize);

  const willEatFood = isSameCell(nextState.food, nextHead);
  const willEatBonusFood = isSameCell(nextState.bonusFood, nextHead);
  const movedSnake = [nextHead, ...nextState.snake];

  if (!willEatFood && !willEatBonusFood) {
    movedSnake.pop();
  }

  const body = movedSnake.slice(1);
  const collidedWithSelf = body.some((segment) => segment.x === nextHead.x && segment.y === nextHead.y);
  if (collidedWithSelf) {
    return {
      ...nextState,
      snake: movedSnake,
      direction,
      pendingDirection: direction,
      status: "game-over"
    };
  }

  if (willEatFood || willEatBonusFood) {
    const hitResult = applyTargetHit(nextState, movedSnake, rng, {
      ateFood: willEatFood,
      ateBonusFood: willEatBonusFood,
      inherentGrowth: 1
    });

    return {
      ...nextState,
      ...hitResult,
      direction,
      pendingDirection: direction
    };
  }

  return {
    ...nextState,
    snake: movedSnake,
    direction,
    pendingDirection: direction
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