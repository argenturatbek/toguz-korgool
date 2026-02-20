import type { GameState } from '../game/types.js';

const API = '/api';

export async function createGame(): Promise<{ gameId: string; token: string; player: 0 | 1 }> {
  const res = await fetch(`${API}/games`, { method: 'POST' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getGame(gameId: string): Promise<{ state: GameState; player1Joined: boolean }> {
  const res = await fetch(`${API}/games/${gameId}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function joinGame(
  gameId: string
): Promise<{ token: string; player: 0 | 1 }> {
  const res = await fetch(`${API}/games/${gameId}/join`, { method: 'POST' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function sendMove(
  gameId: string,
  token: string,
  holeIndex: number
): Promise<{ state: GameState }> {
  const res = await fetch(`${API}/games/${gameId}/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, holeIndex }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
