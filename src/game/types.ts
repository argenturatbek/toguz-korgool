/** Player index: 0 = first (white), 1 = second (black). */
export type Player = 0 | 1;

/** Hole index 0..8 (hole 1..9). Tuz cannot be on hole 9, so valid tuz hole index is 0..7. */
export type HoleIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/** Game phase. */
export type GamePhase = 'playing' | 'ended';

export interface GameState {
  /** holes[player][holeIndex]; holeIndex 0 = hole 1, 8 = hole 9. */
  holes: readonly [readonly number[], readonly number[]];
  /** Kazan stone counts. */
  kazans: readonly [number, number];
  /** Tuz: hole index on opponent's side (0..7), or -1 if none. */
  tuz: readonly [number, number];
  currentPlayer: Player;
  phase: GamePhase;
  /** Final scores when phase === 'ended'. */
  finalScores?: readonly [number, number];
}
