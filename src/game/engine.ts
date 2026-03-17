import type { GameState, Player } from './types.js';
import { createInitialState } from './state.js';

/** Rules: https://en.wikipedia.org/wiki/Toguz_korgool and
 *  https://ru.sputnik.kg/20230831/toguz-korgool-igra-pravila-1077824986.html
 *  Anticlockwise sowing; first stone in emptied hole (or next hole if only 1 stone);
 *  last in opponent's even hole → capture; last in opponent's hole with 3 → tuz (9th hole and symmetric forbidden). */

// There are 18 sowing positions: 9 holes for each player.
const POSITIONS = 18;
const HOLE_COUNT = 9;

/** Anticlockwise ring of 18 holes:
 *  positions 0..8  -> player 0 holes 1..9
 *  positions 9..17 -> player 1 holes 1..9
 */
function nextPosition(pos: number): number {
  return (pos + 1) % POSITIONS;
}

/** Map (player, holeIndex) to position in 18-hole ring. Hole index 0 = hole 1, 8 = hole 9. */
function holeToPosition(player: Player, holeIndex: number): number {
  if (player === 0) return holeIndex;
  return 9 + holeIndex;
}

/** Map ring position (0..17) back to (player, holeIndex). */
function positionToHole(
  pos: number
): { player: Player; holeIndex: number } {
  if (pos <= 8) return { player: 0, holeIndex: pos };
  return { player: 1, holeIndex: pos - 9 };
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
  const opponent: Player = (1 - p) as Player;
  const holes = next.holes as [number[], number[]];
  const kazans = next.kazans as [number, number];
  const tuz = next.tuz as [number, number];

  // === 1) PICK UP STONES FROM SELECTED HOLE ===
  const startPos = holeToPosition(p, holeIndex);
  const n = holes[p][holeIndex];
  if (n <= 0) throw new Error('Selected pit is empty');

  holes[p][holeIndex] = 0;

  // === 2) DETERMINE HOW MANY STONES TO SOW AND WHERE TO START ===
  // If n > 1: leave 1 in starting hole, sow n-1 from next hole.
  // If n == 1: starting hole stays 0, sow that 1 from next hole.
  let stonesToSow: number;
  let pos = startPos;
  if (n === 1) {
    stonesToSow = 1;
    pos = nextPosition(startPos);
  } else {
    stonesToSow = n - 1;
    holes[p][holeIndex] = 1;
    pos = nextPosition(startPos);
  }

  // === 3) SOW AROUND THE 18-HOLE RING (NO KAZANS IN THE LOOP) ===
  for (let i = 0; i < stonesToSow; i++) {
    const loc = positionToHole(pos); // always a hole

    if (loc.player === opponent && tuz[p] === loc.holeIndex) {
      // Stone lands in opponent's hole that is my Tuz -> directly to my kazan.
      kazans[p] += 1;
    } else if (loc.player === p && tuz[opponent] === loc.holeIndex) {
      // Stone lands in my hole that is opponent's Tuz.
      kazans[opponent] += 1;
    } else {
      // Normal hole.
      holes[loc.player][loc.holeIndex] += 1;
    }

    if (i < stonesToSow - 1) {
      pos = nextPosition(pos);
    }
  }

  const lastPos = pos;
  const lastLoc = positionToHole(lastPos); // last stone's hole (even if it was Tuz-redirected)
  let capture: { holeNumber: number; count: number } | undefined;

  // === 4) CAPTURE / TUZ CHECK ON LAST STONE ONLY ===
  // CRITICAL: capture/Tuz are ONLY possible if the last stone lands in
  // an OPPONENT hole. If it lands on your own side, nothing happens here.
  if (lastLoc.player === opponent) {
    // If this hole is my Tuz, the last stone was already redirected to my kazan
    // in the sowing loop, so there is nothing left to capture or mark.
    if (tuz[p] !== lastLoc.holeIndex) {
      const holeIdx = lastLoc.holeIndex;
      const count = holes[opponent][holeIdx];

      if (count % 2 === 0) {
        // Even rule capture.
        kazans[p] += count;
        holes[opponent][holeIdx] = 0;
        capture = { holeNumber: holeIdx + 1, count };
      } else if (count === 3) {
        // Tuz creation if:
        // - this hole is not the 9th hole (index 8)
        // - current player does not already have a Tuz
        // - opponent Tuz is not symmetric (same index)
        if (holeIdx !== 8 && tuz[p] === -1 && tuz[opponent] !== holeIdx) {
          tuz[p] = holeIdx;
          kazans[p] += 3;
          holes[opponent][holeIdx] = 0;
          capture = { holeNumber: holeIdx + 1, count: 3 };
        }
      }
    }
  }

  // Early win condition: first to reach 82 or more captured stones
  const [s0, s1] = getScores(next);
  if (s0 >= 82 || s1 >= 82) {
    next.phase = 'ended';
    next.finalScores = [s0, s1];
    return { state: next, capture };
  }

  // Otherwise, switch turn and check for "no moves" (aat-minsiz)
  next.currentPlayer = opponent;

  const legalNext = getLegalMoves(next);
  if (legalNext.length === 0) {
    endGame(next);
  }

  return { state: next, capture };
}

/** When one side has no legal move (pits empty), the opponent takes all remaining stones to their kazan. */
function endGame(state: GameState): void {
  const s = state as GameState & { phase: 'ended'; finalScores: [number, number] };
  s.phase = 'ended';
  const cannotMove = s.currentPlayer;
  let remaining = 0;
  for (let h = 0; h < HOLE_COUNT; h++) {
    remaining += s.holes[0][h] + s.holes[1][h];
  }
  const score0 = cannotMove === 0 ? s.kazans[0] : s.kazans[0] + remaining;
  const score1 = cannotMove === 1 ? s.kazans[1] : s.kazans[1] + remaining;
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
