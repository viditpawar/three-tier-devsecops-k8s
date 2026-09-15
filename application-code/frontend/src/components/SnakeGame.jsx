import { useCallback, useEffect, useRef, useState } from 'react';

const GRID_SIZE = 20;
const CELL_PX = 20;
const CANVAS_PX = GRID_SIZE * CELL_PX;
const INITIAL_SNAKE = [{ x: 10, y: 10 }];
const INITIAL_DIRECTION = { x: 1, y: 0 };
const TICK_MS = 120;

function randomCell() {
  return {
    x: Math.floor(Math.random() * GRID_SIZE),
    y: Math.floor(Math.random() * GRID_SIZE),
  };
}

function placeFood(snake) {
  let food = randomCell();
  while (snake.some((segment) => segment.x === food.x && segment.y === food.y)) {
    food = randomCell();
  }
  return food;
}

export default function SnakeGame({ onGameOver }) {
  const canvasRef = useRef(null);
  const snakeRef = useRef(INITIAL_SNAKE);
  const directionRef = useRef(INITIAL_DIRECTION);
  const nextDirectionRef = useRef(INITIAL_DIRECTION);
  const foodRef = useRef(placeFood(INITIAL_SNAKE));
  const [score, setScore] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  const resetGame = useCallback(() => {
    snakeRef.current = INITIAL_SNAKE;
    directionRef.current = INITIAL_DIRECTION;
    nextDirectionRef.current = INITIAL_DIRECTION;
    foodRef.current = placeFood(INITIAL_SNAKE);
    setScore(0);
    setIsGameOver(false);
    setIsRunning(true);
  }, []);

  useEffect(() => {
    function handleKeyDown(e) {
      const dir = directionRef.current;
      const key = e.key;

      if ((key === 'ArrowUp' || key === 'w') && dir.y === 0) {
        nextDirectionRef.current = { x: 0, y: -1 };
      } else if ((key === 'ArrowDown' || key === 's') && dir.y === 0) {
        nextDirectionRef.current = { x: 0, y: 1 };
      } else if ((key === 'ArrowLeft' || key === 'a') && dir.x === 0) {
        nextDirectionRef.current = { x: -1, y: 0 };
      } else if ((key === 'ArrowRight' || key === 'd') && dir.x === 0) {
        nextDirectionRef.current = { x: 1, y: 0 };
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!isRunning) return undefined;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const interval = setInterval(() => {
      directionRef.current = nextDirectionRef.current;
      const dir = directionRef.current;
      const snake = snakeRef.current;
      const head = snake[0];
      const newHead = { x: head.x + dir.x, y: head.y + dir.y };

      const hitsWall =
        newHead.x < 0 || newHead.y < 0 || newHead.x >= GRID_SIZE || newHead.y >= GRID_SIZE;
      const hitsSelf = snake.some(
        (segment) => segment.x === newHead.x && segment.y === newHead.y
      );

      if (hitsWall || hitsSelf) {
        setIsRunning(false);
        setIsGameOver(true);
        return;
      }

      const ateFood = newHead.x === foodRef.current.x && newHead.y === foodRef.current.y;
      const newSnake = [newHead, ...snake];

      if (ateFood) {
        setScore((s) => s + 10);
        foodRef.current = placeFood(newSnake);
      } else {
        newSnake.pop();
      }

      snakeRef.current = newSnake;

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, CANVAS_PX, CANVAS_PX);

      ctx.fillStyle = '#ef4444';
      ctx.fillRect(
        foodRef.current.x * CELL_PX,
        foodRef.current.y * CELL_PX,
        CELL_PX,
        CELL_PX
      );

      ctx.fillStyle = '#22c55e';
      newSnake.forEach((segment) => {
        ctx.fillRect(segment.x * CELL_PX, segment.y * CELL_PX, CELL_PX - 1, CELL_PX - 1);
      });
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [isRunning]);

  useEffect(() => {
    if (isGameOver) {
      onGameOver?.(score);
    }
  }, [isGameOver, score, onGameOver]);

  return (
    <div className="snake-game">
      <div className="snake-game__score">Score: {score}</div>
      <canvas
        ref={canvasRef}
        width={CANVAS_PX}
        height={CANVAS_PX}
        className="snake-game__canvas"
      />
      {!isRunning && (
        <button type="button" className="snake-game__start" onClick={resetGame}>
          {isGameOver ? 'Play Again' : 'Start Game'}
        </button>
      )}
    </div>
  );
}
