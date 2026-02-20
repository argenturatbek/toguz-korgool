export type { GameState, Player, HoleIndex, GamePhase } from './types.js';
export {
  createInitialState,
  getLegalMoves,
  applyMove,
  isGameOver,
  getScores,
} from './engine.js';
