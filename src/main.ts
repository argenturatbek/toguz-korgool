import './style.css';
import type { GameState } from './game/types.js';
import { createInitialState } from './game/engine.js';
import { attachBoard, type CaptureInfo } from './ui/board.js';
import { createGame, getGame, joinGame, sendMove } from './api/client.js';
import { getLang, setLang, t, onLangChange, LANGUAGES } from './i18n.js';

const app = document.querySelector<HTMLDivElement>('#app')!;
const TOKEN_KEY = (id: string) => `toguz_${id}`;

function getGameIdFromPath(): string | null {
  const m = window.location.pathname.match(/^\/play\/([^/]+)$/);
  return m ? m[1] : null;
}

function renderLangSwitcher(container: HTMLElement): void {
  const wrap = document.createElement('div');
  wrap.className = 'lang-switcher';
  LANGUAGES.forEach(({ code, labelKey }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'lang-btn' + (getLang() === code ? ' active' : '');
    btn.textContent = t(labelKey);
    btn.addEventListener('click', () => setLang(code));
    wrap.appendChild(btn);
  });
  container.appendChild(wrap);
}

function showHome(): void {
  app.innerHTML = '';
  app.className = 'home-container';
  renderLangSwitcher(app);
  const title = document.createElement('h1');
  title.className = 'home-title';
  title.textContent = t('title');
  app.appendChild(title);
  const localBtn = document.createElement('button');
  localBtn.type = 'button';
  localBtn.className = 'btn-home';
  localBtn.textContent = t('playLocally');
  localBtn.addEventListener('click', () => {
    history.pushState({}, '', '/play');
    initLocalGame();
  });
  app.appendChild(localBtn);
  const onlineBtn = document.createElement('button');
  onlineBtn.type = 'button';
  onlineBtn.className = 'btn-home';
  onlineBtn.textContent = t('createOnline');
  onlineBtn.addEventListener('click', async () => {
    try {
      const { gameId, token, player } = await createGame();
      localStorage.setItem(TOKEN_KEY(gameId), JSON.stringify({ token, player }));
      history.pushState({}, '', `/play/${gameId}`);
      initOnlineGame(gameId, token, player);
    } catch (e) {
      alert(t('errorCreateGame'));
    }
  });
  app.appendChild(onlineBtn);
}

let localState: GameState = createInitialState();
let localRender: (() => void) | null = null;

function initLocalGame(): void {
  localState = createInitialState();
  let lastCapture: CaptureInfo | null = null;
  app.innerHTML = '';
  app.className = 'board-container';
  renderLangSwitcher(app);
  localRender = attachBoard(
    app,
    () => localState,
    (s) => {
      localState = s;
      localRender!();
    },
    () => {
      localState = createInitialState();
      lastCapture = null;
      localRender!();
    },
    {
      t,
      getLastCapture: () => lastCapture,
      onCapture: (cap) => {
        lastCapture = cap ?? null;
        localRender!();
      },
    }
  );
}

let onlinePollTimer: number | null = null;

function initOnlineGame(gameId: string, token?: string, player?: 0 | 1): void {
  if (onlinePollTimer != null) {
    clearInterval(onlinePollTimer);
    onlinePollTimer = null;
  }
  let state: GameState;
  let myToken: string;
  let myPlayer: 0 | 1;
  let player1Joined = false;

  const tick = () => {
    app.innerHTML = '';
    app.className = 'board-container';
    renderLangSwitcher(app);
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
        t,
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

onLangChange(init);
window.addEventListener('popstate', init);
init();
