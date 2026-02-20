import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createInitialState, applyMove } from '../src/game/engine.js';
import type { GameState } from '../src/game/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const PORT = process.env.PORT ?? 3000;
const DIST = path.join(__dirname, '../dist');

interface Room {
  state: GameState;
  creatorToken: string;
  player1Token: string | null;
}

const games = new Map<string, Room>();

function randomId(): string {
  return Math.random().toString(36).slice(2, 12);
}

app.post('/api/games', (_req, res) => {
  const gameId = randomId();
  const creatorToken = randomId();
  games.set(gameId, {
    state: createInitialState(),
    creatorToken,
    player1Token: null,
  });
  res.json({ gameId, token: creatorToken, player: 0 });
});

app.get('/api/games/:id', (req, res) => {
  const room = games.get(req.params.id);
  if (!room) return res.status(404).json({ error: 'Game not found' });
  res.json({
    state: room.state,
    player1Joined: room.player1Token !== null,
  });
});

app.post('/api/games/:id/join', (req, res) => {
  const room = games.get(req.params.id);
  if (!room) return res.status(404).json({ error: 'Game not found' });
  if (room.player1Token !== null) return res.status(400).json({ error: 'Game full' });
  if (room.state.phase !== 'playing') return res.status(400).json({ error: 'Game ended' });
  const player1Token = randomId();
  room.player1Token = player1Token;
  res.json({ token: player1Token, player: 1 });
});

app.post('/api/games/:id/move', (req, res) => {
  const room = games.get(req.params.id);
  if (!room) return res.status(404).json({ error: 'Game not found' });
  const { token, holeIndex } = req.body as { token?: string; holeIndex?: number };
  if (typeof token !== 'string' || typeof holeIndex !== 'number' || holeIndex < 0 || holeIndex > 8) {
    return res.status(400).json({ error: 'Invalid request' });
  }
  const currentPlayer = room.state.currentPlayer;
  const isCreator = token === room.creatorToken;
  const isPlayer1 = room.player1Token !== null && token === room.player1Token;
  const isCurrentPlayer =
    (currentPlayer === 0 && isCreator) || (currentPlayer === 1 && isPlayer1);
  if (!isCurrentPlayer) return res.status(403).json({ error: 'Not your turn' });
  try {
    room.state = applyMove(room.state, holeIndex);
    return res.json({ state: room.state });
  } catch (e) {
    return res.status(400).json({ error: (e as Error).message });
  }
});

app.use(express.static(DIST));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(DIST, 'index.html'), (err) => { if (err) next(err); });
});

app.listen(PORT, () => {
  console.log(`Server at http://localhost:${PORT}`);
});
