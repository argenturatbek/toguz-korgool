import { describe, it, expect } from 'vitest';
import type { Player } from './types.js';
import {
  createInitialState,
  getLegalMoves,
  applyMove,
  isGameOver,
  getScores,
} from './engine.js';

describe('createInitialState', () => {
  it('starts with 9 stones in each of 18 holes', () => {
    const s = createInitialState();
    expect(s.holes[0].every((n) => n === 9)).toBe(true);
    expect(s.holes[1].every((n) => n === 9)).toBe(true);
    expect(s.kazans).toEqual([0, 0]);
    expect(s.currentPlayer).toBe(0);
    expect(s.phase).toBe('playing');
  });
});

describe('getLegalMoves', () => {
  it('returns all 9 holes for initial state for player 0', () => {
    const s = createInitialState();
    expect(getLegalMoves(s)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('returns empty when game ended', () => {
    const s = createInitialState();
    (s as { phase: 'ended' }).phase = 'ended';
    expect(getLegalMoves(s)).toEqual([]);
  });
});

describe('applyMove', () => {
  it('one-stone move: stone goes to next hole only (counterclockwise)', () => {
    const s = createInitialState();
    const holes = s.holes[0].slice();
    holes[3] = 1;
    const state = { ...s, holes: [holes, s.holes[1]] as const };
    const next = applyMove(state, 3).state;
    expect(next.holes[0][3]).toBe(0);
    expect(next.holes[0][4]).toBe(10); // next counterclockwise is hole index 4 (hole 5)
    expect(next.currentPlayer).toBe(1);
  });

  it('multi-stone move: first stone stays in hole, rest distributed', () => {
    const s = createInitialState();
    const p0 = s.holes[0].slice();
    p0[8] = 2;
    const state = { ...s, holes: [p0, s.holes[1]] as const };
    const next = applyMove(state, 8).state;
    expect(next.holes[0][8]).toBe(1);
    expect(next.holes[0][7]).toBe(9); // untouched
    expect(next.kazans[0]).toBe(1); // second stone went to kazan
    expect(next.currentPlayer).toBe(1);
  });

  it('capture: last stone in opponent even hole captures', () => {
    const s = createInitialState();
    const result = applyMove(s, 8);
    const next = result.state;
    expect(next.kazans[0]).toBe(11);
    expect(next.holes[1][6]).toBe(0);
    expect(result.capture).toEqual({ holeNumber: 7, count: 10 });
  });

  it('throws on invalid move', () => {
    const s = createInitialState();
    const empty = s.holes[0].slice();
    empty[2] = 0;
    const state = { ...s, holes: [empty, s.holes[1]] as const };
    expect(() => applyMove(state, 2)).toThrow('Invalid move');
  });

  it('tuz: last stone in opponent hole with 3 creates tuz', () => {
    const s = createInitialState();
    const p0 = s.holes[0].slice();
    const p1 = s.holes[1].slice();
    p0[1] = 16;
    p1[6] = 2;
    const state = { ...s, holes: [p0, p1] as const };
    const next = applyMove(state, 1).state;
    expect(next.tuz[0]).toBe(6);
    expect(next.kazans[0]).toBeGreaterThanOrEqual(3);
  });

  it('tuz: symmetrical to opponent tuz is not created', () => {
    const s = createInitialState();
    const p0 = s.holes[0].slice();
    const p1 = s.holes[1].slice();
    for (let i = 0; i < 9; i++) {
      p0[i] = 0;
      p1[i] = 0;
    }
    p0[3] = 2;
    p1[7] = 7;
    const state = { ...s, holes: [p0, p1] as const, tuz: [3, -1] as const, currentPlayer: 1 as Player };
    const next = applyMove(state, 7).state;
    expect(next.tuz[1]).toBe(-1);
  });

  it('game end: no legal move ends game and allocates remaining stones', () => {
    const s = createInitialState();
    const p0 = s.holes[0].slice();
    const p1 = s.holes[1].slice();
    for (let i = 0; i < 9; i++) {
      p0[i] = 0;
      p1[i] = 0;
    }
    p0[8] = 1;
    const state = { ...s, holes: [p0, p1] as const };
    const next = applyMove(state, 8).state;
    expect(next.phase).toBe('ended');
    expect(next.finalScores).toBeDefined();
    const [a, b] = next.finalScores!;
    expect(a + b).toBe(1);
  });
});

describe('getScores', () => {
  it('returns kazans during play', () => {
    const s = createInitialState();
    const [a, b] = getScores(s);
    expect(a).toBe(0);
    expect(b).toBe(0);
  });
});

describe('isGameOver', () => {
  it('false at start', () => {
    expect(isGameOver(createInitialState())).toBe(false);
  });
});
