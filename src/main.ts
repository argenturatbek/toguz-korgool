import './style.css';
import type { GameState } from './game/types.js';
import { createInitialState, applyMove, getScores } from './game/engine.js';
import { attachBoard, type CaptureInfo } from './ui/board.js';
import { attachBoard3D } from './ui/board3d.js';
import { createGame, getGame, joinGame, sendMove, getChat, sendChat, type ChatMessage } from './api/client.js';
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
  onlineBtn.textContent = 'Play online (share link)';
  onlineBtn.addEventListener('click', async () => {
    try {
      const { gameId, token, player } = await createGame();
      const shareUrl = `${window.location.origin}/play/${gameId}`;
      history.pushState({}, '', `/play/${gameId}`);
      localStorage.setItem(TOKEN_KEY(gameId), JSON.stringify({ token, player }));
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert(`Online game created.\nLink copied to clipboard:\n${shareUrl}`);
      } catch {
        alert(`Online game created.\nShare this link:\n${shareUrl}`);
      }
      initOnlineGame(gameId, token, player);
    } catch (e) {
      alert((e as Error).message);
    }
  });
  app.appendChild(onlineBtn);
}

let localState: GameState = createInitialState();
let localRender: (() => void) | null = null;
let use3DView = false;

function initLocalGame(): void {
  localState = createInitialState();
  let lastCapture: CaptureInfo | null = null;
  app.innerHTML = '';
  app.className = 'board-container';
  renderLangSwitcher(app);

  const setState = (s: GameState) => {
    localState = s;
    localRender!();
  };
  const onNewGame = () => {
    localState = createInitialState();
    lastCapture = null;
    localRender!();
  };
  const onCapture = (cap: CaptureInfo | undefined) => {
    lastCapture = cap ?? null;
    localRender!();
  };

  if (use3DView) {
    const scoresEl = document.createElement('div');
    scoresEl.className = 'scores';
    const [score0, score1] = getScores(localState);
    scoresEl.innerHTML = `<span class="score" data-player="1">${score1}</span><span class="score-label">${t('kazans')}</span><span class="score" data-player="0">${score0}</span>`;
    app.appendChild(scoresEl);
    const viewWrap = document.createElement('div');
    viewWrap.className = 'view-toggle';
    viewWrap.innerHTML = `<button type="button" class="view-btn">2D</button><span class="view-sep">|</span><button type="button" class="view-btn active">3D</button>`;
    viewWrap.querySelector('.view-btn')!.addEventListener('click', () => { use3DView = false; initLocalGame(); });
    app.appendChild(viewWrap);
    const boardMount = document.createElement('div');
    boardMount.className = 'board-3d-mount';
    app.appendChild(boardMount);
    const footer = document.createElement('div');
    footer.className = 'board-footer';
    const captureEl = document.createElement('div');
    captureEl.className = 'capture-msg';
    const turnEl = document.createElement('div');
    turnEl.className = 'turn';
    const newBtn = document.createElement('button');
    newBtn.type = 'button';
    newBtn.className = 'btn-new';
    newBtn.textContent = t('newGame');
    newBtn.addEventListener('click', onNewGame);
    const updateChrome = () => {
      const [s0, s1] = getScores(localState);
      scoresEl.innerHTML = `<span class="score" data-player="1">${s1}</span><span class="score-label">${t('kazans')}</span><span class="score" data-player="0">${s0}</span>`;
      captureEl.textContent = lastCapture ? `${t('capturedFrom')} ${lastCapture.count} ${t('fromOpponentHole')} ${lastCapture.holeNumber}!` : '';
      captureEl.style.display = lastCapture ? '' : 'none';
      turnEl.textContent = localState.phase === 'playing' ? (localState.currentPlayer === 0 ? t('yourTurn') : t('opponentTurn')) : '';
    };
    footer.appendChild(captureEl);
    footer.appendChild(turnEl);
    footer.appendChild(newBtn);
    app.appendChild(footer);
    updateChrome();
    attachBoard3D(boardMount, () => localState, {
      onMove: (holeIndex: number) => {
        const result = applyMove(localState, holeIndex);
        localState = result.state;
        lastCapture = result.capture ?? null;
        updateChrome();
      },
    });
    localRender = () => { updateChrome(); };
  } else {
    localRender = attachBoard(
      app,
      () => localState,
      setState,
      onNewGame,
      {
        t,
        getLastCapture: () => lastCapture,
        onCapture,
      }
    );
    const viewWrap = document.createElement('div');
    viewWrap.className = 'view-toggle';
    viewWrap.innerHTML = `<button type="button" class="view-btn active">2D</button><span class="view-sep">|</span><button type="button" class="view-btn">3D</button>`;
    viewWrap.querySelectorAll('.view-btn')[1].addEventListener('click', () => { use3DView = true; initLocalGame(); });
    const scoresEl = app.querySelector('.scores');
    if (scoresEl && scoresEl.nextSibling) app.insertBefore(viewWrap, scoresEl.nextSibling);
    else app.appendChild(viewWrap);
  }
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
  let chatMessages: ChatMessage[] = [];

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

    // Simple chat panel under the board for the two players.
    const chatWrap = document.createElement('div');
    chatWrap.style.marginTop = '1rem';
    chatWrap.style.width = '100%';
    chatWrap.style.maxWidth = '640px';
    chatWrap.style.background = 'rgba(0,0,0,0.6)';
    chatWrap.style.borderRadius = '12px';
    chatWrap.style.padding = '0.5rem 0.75rem';
    chatWrap.style.display = 'flex';
    chatWrap.style.flexDirection = 'column';
    chatWrap.style.gap = '0.35rem';

    const chatTitle = document.createElement('div');
    chatTitle.textContent = 'Chat';
    chatTitle.style.fontSize = '0.8rem';
    chatTitle.style.opacity = '0.8';
    chatWrap.appendChild(chatTitle);

    const chatList = document.createElement('div');
    chatList.style.maxHeight = '120px';
    chatList.style.overflowY = 'auto';
    chatList.style.fontSize = '0.8rem';

    chatMessages.slice(-30).forEach((m) => {
      const row = document.createElement('div');
      const label = m.player === myPlayer ? 'You' : m.player === 0 ? 'P1' : 'P2';
      row.textContent = `${label}: ${m.text}`;
      chatList.appendChild(row);
    });
    chatWrap.appendChild(chatList);

    const form = document.createElement('form');
    form.style.display = 'flex';
    form.style.gap = '0.4rem';
    form.style.marginTop = '0.25rem';

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Type message...';
    input.style.flex = '1';
    input.style.fontSize = '0.8rem';
    input.style.padding = '0.35rem 0.5rem';
    input.maxLength = 280;

    const btn = document.createElement('button');
    btn.type = 'submit';
    btn.textContent = 'Send';
    btn.style.fontSize = '0.8rem';
    btn.style.padding = '0.35rem 0.7rem';

    form.appendChild(input);
    form.appendChild(btn);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      try {
        const { messages } = await sendChat(gameId, myToken, text);
        chatMessages = messages;
        input.value = '';
        tick();
      } catch (err) {
        alert((err as Error).message);
      }
    });

    chatWrap.appendChild(form);
    app.appendChild(chatWrap);
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
    // Load initial chat
    try {
      const { messages } = await getChat(gameId);
      chatMessages = messages;
    } catch {
      chatMessages = [];
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
        // poll chat
        try {
          const { messages } = await getChat(gameId);
          if (JSON.stringify(messages) !== JSON.stringify(chatMessages)) {
            chatMessages = messages;
            tick();
          }
        } catch {
          // ignore chat errors
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
