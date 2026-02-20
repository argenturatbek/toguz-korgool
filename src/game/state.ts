import type { GameState } from './types.js';

const INITIAL_HOLE = 9;
const HOLE_COUNT = 9;

function createInitialHoles(): [number[], number[]] {
  const row = Array.from<number>({ length: HOLE_COUNT }).fill(INITIAL_HOLE);
  return [[...row], [...row]];
}

export function createInitialState(): GameState {
  return {
    holes: createInitialHoles(),
    kazans: [0, 0],
    tuz: [-1, -1],
    currentPlayer: 0,
    phase: 'playing',
  };
}
