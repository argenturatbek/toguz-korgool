import type { GameState, Player } from './types.js';
import { createInitialState } from './state.js';

/** Rules per https://en.wikipedia.org/wiki/Toguz_korgool
 *  Anticlockwise sowing; first stone in emptied hole (or next hole if only 1 stone);
 *  last in opponent's even hole → capture; last in opponent's hole with 3 → tuz (9th hole and symmetric forbidden). */

const POSITIONS = 20;
const HOLE_COUNT = 9;

/** Position 0 = P0 hole 9 (holes[0][8]), 1 = P0 hole 8, ..., 8 = P0 hole 1, 9 = kazan0, 10..17 = P1 holes 1..9, 18 = kazan1. 19 wraps to 0. */
function nextPosition(pos: number): number {
  return (pos + 1) % POSITIONS;
}

/** Map (player, holeIndex) to position. */
function holeToPosition(player: Player, holeIndex: number): number {
  if (player === 0) return 8 - holeIndex;
  return 10 + holeIndex;
}

/** Map position to [player, holeIndex] or 'kazan0' | 'kazan1'. */
function positionToHole(
  pos: number
): { type: 'hole'; player: Player; holeIndex: number } | { type: 'kazan'; player: Player } {
  if (pos <= 8) return { type: 'hole', player: 0, holeIndex: 8 - pos };
  if (pos === 9) return { type: 'kazan', player: 0 };
  if (pos <= 17) return { type: 'hole', player: 1, holeIndex: pos - 10 };
  return { type: 'kazan', player: 1 };
}

/** Deep clone state for immutable updates. */
function cloneState(state: GameState): GameState {
  return {
    holes: [state.holes[0].slice(), state.holes[1].slice()],
    kazans: [state.kazans[0], state.kazans[1]],
    tuz: [state.tuz[0], state.tuz[1]],
    currentPlayer: state.currentPlayer,
    phase: state.phase,
    finalScores: state.finalScores,
  };
}

/** Legal moves: hole indices (0..8) that are non-tuz and have at least one stone.
 *  Per rules: a player cannot move from a hole that is the opponent's tuz (on their side). */
export function getLegalMoves(state: GameState): number[] {
  if (state.phase !== 'playing') return [];
  const p = state.currentPlayer;
  const moves: number[] = [];
  const opponentTuz = state.tuz[1 - p];
  for (let h = 0; h < HOLE_COUNT; h++) {
    if (state.holes[p][h] > 0 && (opponentTuz < 0 || opponentTuz !== h)) moves.push(h);
  }
  return moves;
}

export interface MoveResult {
  state: GameState;
  /** When the last stone caused a capture on opponent's hole. */
  capture?: { holeNumber: number; count: number };
}

/** Apply one move. Returns result with new state (and optional capture info) or throws. */
export function applyMove(state: GameState, holeIndex: number): MoveResult {
  if (state.phase !== 'playing') throw new Error('Game has ended');
  const moves = getLegalMoves(state);
  if (!moves.includes(holeIndex)) throw new Error('Invalid move');

  const next = cloneState(state);
  const p = next.currentPlayer;
  const holes = next.holes as [number[], number[]];
  const kazans = next.kazans as [number, number];
  const tuz = next.tuz as [number, number];

  const startPos = holeToPosition(p, holeIndex);
  const n = holes[p][holeIndex];
  holes[p][holeIndex] = 0;

  let stonesToSow: number;
  let firstDropPos: number;

  if (n === 1) {
    stonesToSow = 1;
    firstDropPos = nextPosition(startPos);
  } else {
    stonesToSow = n;
    firstDropPos = startPos;
  }

  let pos = firstDropPos;
  for (let i = 0; i < stonesToSow; i++) {
    const loc = positionToHole(pos);
    if (loc.type === 'kazan') {
      if (loc.player === p) kazans[p] += 1;
    } else {
      if (loc.player === 1 - p && tuz[p] === loc.holeIndex) {
        kazans[p] += 1;
      } else if (loc.player === p && tuz[1 - p] === loc.holeIndex) {
        kazans[1 - p] += 1;
      } else {
        holes[loc.player][loc.holeIndex] += 1;
      }
    }
    if (i < stonesToSow - 1) pos = nextPosition(pos);
  }

  const lastPos = pos;
  const lastLoc = positionToHole(lastPos);
  let capture: { holeNumber: number; count: number } | undefined;

  if (lastLoc.type === 'hole' && lastLoc.player === 1 - p) {
    const count = holes[lastLoc.player][lastLoc.holeIndex];
    if (count % 2 === 0) {
      kazans[p] += count;
      holes[lastLoc.player][lastLoc.holeIndex] = 0;
      capture = { holeNumber: lastLoc.holeIndex + 1, count };
    } else if (count === 3) {
      const holeIdx = lastLoc.holeIndex;
      if (holeIdx !== 8 && tuz[p] === -1) {
        const sym = tuz[1 - p];
        if (sym !== holeIdx) {
          tuz[p] = holeIdx;
          kazans[p] += 3;
          holes[lastLoc.player][lastLoc.holeIndex] = 0;
          capture = { holeNumber: lastLoc.holeIndex + 1, count: 3 };
        }
      }
    }
  }

  next.currentPlayer = (1 - p) as Player;

  const legalNext = getLegalMoves(next);
  if (legalNext.length === 0) {
    endGame(next);
  }

  return { state: next, capture };
}

/** Remaining stones on each side go to that side's total; tuz contents go to tuz owner. */
function endGame(state: GameState): void {
  const s = state as GameState & { phase: 'ended'; finalScores: [number, number] };
  s.phase = 'ended';
  let score0 = s.kazans[0];
  let score1 = s.kazans[1];
  for (let h = 0; h < HOLE_COUNT; h++) {
    if (s.tuz[1] === h) score1 += s.holes[0][h];
    else score0 += s.holes[0][h];
  }
  for (let h = 0; h < HOLE_COUNT; h++) {
    if (s.tuz[0] === h) score0 += s.holes[1][h];
    else score1 += s.holes[1][h];
  }
  s.finalScores = [score0, score1];
}

export function isGameOver(state: GameState): boolean {
  return state.phase === 'ended';
}

export function getScores(state: GameState): [number, number] {
  if (state.phase === 'ended' && state.finalScores) return [...state.finalScores];
  const s0 = state.kazans[0] + (state.tuz[0] >= 0 ? state.holes[1][state.tuz[0]] : 0);
  const s1 = state.kazans[1] + (state.tuz[1] >= 0 ? state.holes[0][state.tuz[1]] : 0);
  return [s0, s1];
}

export { createInitialState };
