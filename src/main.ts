import './style.css';
import type { GameState } from './game/types.js';
import { createInitialState } from './game/engine.js';
import { attachBoard } from './ui/board.js';
import { createGame, getGame, joinGame, sendMove } from './api/client.js';

const app = document.querySelector<HTMLDivElement>('#app')!;
const TOKEN_KEY = (id: string) => `toguz_${id}`;

function getGameIdFromPath(): string | null {
  const m = window.location.pathname.match(/^\/play\/([^/]+)$/);
  return m ? m[1] : null;
}

function showHome(): void {
  app.innerHTML = '';
  app.className = 'home-container';
  const title = document.createElement('h1');
  title.className = 'home-title';
  title.textContent = 'Toguz Korgool';
  app.appendChild(title);
  const localBtn = document.createElement('button');
  localBtn.type = 'button';
  localBtn.className = 'btn-home';
  localBtn.textContent = 'Play locally';
  localBtn.addEventListener('click', () => {
    history.pushState({}, '', '/play');
    initLocalGame();
  });
  app.appendChild(localBtn);
  const onlineBtn = document.createElement('button');
  onlineBtn.type = 'button';
  onlineBtn.className = 'btn-home';
  onlineBtn.textContent = 'Create online game';
  onlineBtn.addEventListener('click', async () => {
    try {
      const { gameId, token, player } = await createGame();
      localStorage.setItem(TOKEN_KEY(gameId), JSON.stringify({ token, player }));
      history.pushState({}, '', `/play/${gameId}`);
      initOnlineGame(gameId, token, player);
    } catch (e) {
      alert('Could not create game. Is the server running?');
    }
  });
  app.appendChild(onlineBtn);
}

let localState: GameState = createInitialState();
let localRender: (() => void) | null = null;

function initLocalGame(): void {
  localState = createInitialState();
  app.innerHTML = '';
  app.className = 'board-container';
  localRender = attachBoard(
    app,
    () => localState,
    (s) => {
      localState = s;
      localRender!();
    },
    () => {
      localState = createInitialState();
      localRender!();
    }
  );
}

let onlinePollTimer: number | null = null;

function initOnlineGame(gameId: string, token?: string, player?: 0 | 1): void {
  let state: GameState;
  let myToken: string;
  let myPlayer: 0 | 1;
  let player1Joined = false;

  const tick = () => {
    app.innerHTML = '';
    app.className = 'board-container';
    const shareUrl = window.location.origin + window.location.pathname;
    attachBoard(
      app,
      () => state,
      (s) => {
        state = s;
        tick();
      },
      () => {
        if (onlinePollTimer != null) clearInterval(onlinePollTimer);
        history.pushState({}, '', '/');
        showHome();
      },
      {
        myPlayer,
        shareUrl,
        waitingForOpponent: myPlayer === 0 && !player1Joined,
        onMoveOverride: async (holeIndex: number) => {
          try {
            const { state: newState } = await sendMove(gameId, myToken, holeIndex);
            state = newState;
            tick();
          } catch (e) {
            alert((e as Error).message);
          }
        },
      }
    );
  };

  (async () => {
    if (token != null && player !== undefined) {
      myToken = token;
      myPlayer = player;
      const data = await getGame(gameId);
      state = data.state;
      player1Joined = data.player1Joined;
    } else {
      const data = await getGame(gameId);
      state = data.state;
      player1Joined = data.player1Joined;
      const stored = localStorage.getItem(TOKEN_KEY(gameId));
      if (stored) {
        const { token: t, player: p } = JSON.parse(stored) as { token: string; player: 0 | 1 };
        myToken = t;
        myPlayer = p;
      } else {
        const joinData = await joinGame(gameId);
        myToken = joinData.token;
        myPlayer = 1;
        localStorage.setItem(TOKEN_KEY(gameId), JSON.stringify({ token: myToken, player: myPlayer }));
        const again = await getGame(gameId);
        player1Joined = again.player1Joined;
      }
    }
    tick();
    onlinePollTimer = window.setInterval(async () => {
      try {
        const data = await getGame(gameId);
        player1Joined = data.player1Joined;
        const prev = JSON.stringify(state);
        const next = JSON.stringify(data.state);
        if (prev !== next) {
          state = data.state;
          tick();
        }
      } catch (_) {}
    }, 2000) as unknown as number;
  })();
}

function init(): void {
  const gameId = getGameIdFromPath();
  if (gameId) {
    initOnlineGame(gameId);
    return;
  }
  if (window.location.pathname === '/play') {
    initLocalGame();
    return;
  }
  showHome();
}

window.addEventListener('popstate', init);
init();
