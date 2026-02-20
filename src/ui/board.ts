import type { GameState } from '../game/types.js';
import { getLegalMoves, getScores, applyMove } from '../game/engine.js';

export interface CaptureInfo {
  holeNumber: number;
  count: number;
}

const HOLE_COUNT = 9;
const MAX_KORGOOLS_VISIBLE = 18;

function renderKorgools(container: HTMLElement, count: number): void {
  container.innerHTML = '';
  container.className = 'korgools';
  const n = Math.min(count, MAX_KORGOOLS_VISIBLE);
  for (let i = 0; i < n; i++) {
    const k = document.createElement('span');
    k.className = 'korgool';
    container.appendChild(k);
  }
  if (count > MAX_KORGOOLS_VISIBLE) {
    const extra = document.createElement('span');
    extra.className = 'korgools-extra';
    extra.textContent = `+${count - MAX_KORGOOLS_VISIBLE}`;
    container.appendChild(extra);
  }
}

export type TranslateFn = (key: string) => string;

export interface BoardOptions {
  myPlayer?: 0 | 1;
  shareUrl?: string;
  waitingForOpponent?: boolean;
  onNewGame?: () => void;
  onMoveOverride?: (holeIndex: number) => void;
  t?: TranslateFn;
  getLastCapture?: () => CaptureInfo | null | undefined;
  onCapture?: (capture: CaptureInfo | undefined) => void;
}

export function renderBoard(
  container: HTMLElement,
  state: GameState,
  onMove: (holeIndex: number) => void,
  options?: BoardOptions
): void {
  const legal = getLegalMoves(state);
  const [score0, score1] = getScores(state);
  const myPlayer = options?.myPlayer;
  const isMyTurn = myPlayer === undefined || state.currentPlayer === myPlayer;
  const t = options?.t ?? ((k: string) => k);

  container.innerHTML = '';
  container.className = 'board-container';

  if (options?.waitingForOpponent) {
    const waitEl = document.createElement('div');
    waitEl.className = 'waiting';
    waitEl.textContent = t('waitingForOpponent');
    container.appendChild(waitEl);
  }

  if (options?.shareUrl) {
    const shareWrap = document.createElement('div');
    shareWrap.className = 'share-wrap';
    const shareBtn = document.createElement('button');
    shareBtn.type = 'button';
    shareBtn.className = 'btn-share';
    shareBtn.textContent = t('copyLink');
    shareBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(options.shareUrl!);
      shareBtn.textContent = t('copied');
      setTimeout(() => { shareBtn.textContent = t('copyLink'); }, 1500);
    });
    shareWrap.appendChild(shareBtn);
    container.appendChild(shareWrap);
  }

  const scoresEl = document.createElement('div');
  scoresEl.className = 'scores';
  scoresEl.innerHTML = `
    <span class="score" data-player="1">${score1}</span>
    <span class="score-label">${t('kazans')}</span>
    <span class="score" data-player="0">${score0}</span>
  `;
  container.appendChild(scoresEl);

  const board = document.createElement('div');
  board.className = 'board';

  const kazan1Wrap = document.createElement('div');
  kazan1Wrap.className = 'kazan-wrap kazan-wrap-p1';
  const kazan1Label = document.createElement('span');
  kazan1Label.className = 'kazan-label';
  kazan1Label.textContent = t('kazanP2');
  const kazan1 = document.createElement('div');
  kazan1.className = 'kazan';
  kazan1.setAttribute('data-player', '1');
  const kazan1Korgools = document.createElement('div');
  renderKorgools(kazan1Korgools, score1);
  kazan1.appendChild(kazan1Korgools);
  const kazan1Count = document.createElement('span');
  kazan1Count.className = 'kazan-count';
  kazan1Count.textContent = String(score1);
  kazan1.appendChild(kazan1Count);
  kazan1Wrap.appendChild(kazan1Label);
  kazan1Wrap.appendChild(kazan1);
  board.appendChild(kazan1Wrap);

  const holesWrap = document.createElement('div');
  holesWrap.className = 'holes-wrap';

  const doMove = (i: number) => (options?.onMoveOverride ? options.onMoveOverride!(i) : onMove(i));

  const currentPlayer = state.currentPlayer;
  const opponentHoleNum = (i: number) => 9 - i;

  const row1 = document.createElement('div');
  row1.className = 'row row-p1';
  for (let i = 0; i < HOLE_COUNT; i++) {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'hole';
    cell.setAttribute('data-player', '1');
    cell.setAttribute('data-hole', String(i));
    const holeNum = document.createElement('span');
    holeNum.className = 'hole-num';
    holeNum.textContent = String(currentPlayer === 1 ? i + 1 : opponentHoleNum(i));
    const korgoolsEl = document.createElement('div');
    renderKorgools(korgoolsEl, state.holes[1][i]);
    const countEl = document.createElement('span');
    countEl.className = 'hole-count';
    countEl.textContent = String(state.holes[1][i]);
    cell.appendChild(holeNum);
    cell.appendChild(korgoolsEl);
    cell.appendChild(countEl);
    const canMoveP1 = state.phase === 'playing' && state.currentPlayer === 1 && legal.includes(i) && (myPlayer === undefined || myPlayer === 1) && isMyTurn && !options?.waitingForOpponent;
    cell.disabled = !canMoveP1;
    if (canMoveP1) cell.classList.add('legal');
    const isTuz = state.tuz[0] === i;
    if (isTuz) cell.classList.add('tuz');
    cell.addEventListener('click', () => doMove(i));
    row1.appendChild(cell);
  }
  holesWrap.appendChild(row1);

  const row0 = document.createElement('div');
  row0.className = 'row row-p0';
  for (let i = 0; i < HOLE_COUNT; i++) {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'hole';
    cell.setAttribute('data-player', '0');
    cell.setAttribute('data-hole', String(i));
    const holeNum = document.createElement('span');
    holeNum.className = 'hole-num';
    holeNum.textContent = String(currentPlayer === 0 ? i + 1 : opponentHoleNum(i));
    const korgoolsEl = document.createElement('div');
    renderKorgools(korgoolsEl, state.holes[0][i]);
    const countEl = document.createElement('span');
    countEl.className = 'hole-count';
    countEl.textContent = String(state.holes[0][i]);
    cell.appendChild(holeNum);
    cell.appendChild(korgoolsEl);
    cell.appendChild(countEl);
    const canMoveP0 = state.phase === 'playing' && state.currentPlayer === 0 && legal.includes(i) && (myPlayer === undefined || myPlayer === 0) && isMyTurn && !options?.waitingForOpponent;
    cell.disabled = !canMoveP0;
    if (canMoveP0) cell.classList.add('legal');
    const isTuz = state.tuz[1] === i;
    if (isTuz) cell.classList.add('tuz');
    cell.addEventListener('click', () => doMove(i));
    row0.appendChild(cell);
  }
  holesWrap.appendChild(row0);

  board.appendChild(holesWrap);

  const kazan0Wrap = document.createElement('div');
  kazan0Wrap.className = 'kazan-wrap kazan-wrap-p0';
  const kazan0Label = document.createElement('span');
  kazan0Label.className = 'kazan-label';
  kazan0Label.textContent = t('kazanP1');
  const kazan0 = document.createElement('div');
  kazan0.className = 'kazan';
  kazan0.setAttribute('data-player', '0');
  const kazan0Korgools = document.createElement('div');
  renderKorgools(kazan0Korgools, score0);
  kazan0.appendChild(kazan0Korgools);
  const kazan0Count = document.createElement('span');
  kazan0Count.className = 'kazan-count';
  kazan0Count.textContent = String(score0);
  kazan0.appendChild(kazan0Count);
  kazan0Wrap.appendChild(kazan0Label);
  kazan0Wrap.appendChild(kazan0);
  board.appendChild(kazan0Wrap);

  container.appendChild(board);

  const lastCapture = options?.getLastCapture?.();
  if (lastCapture) {
    const capEl = document.createElement('div');
    capEl.className = 'capture-msg';
    const displayHole = 10 - lastCapture.holeNumber;
    capEl.textContent = `${t('capturedFrom')} ${lastCapture.count} ${t('fromOpponentHole')} ${displayHole}!`;
    container.appendChild(capEl);
  }

  const turnEl = document.createElement('div');
  turnEl.className = 'turn';
  if (state.phase === 'playing') {
    if (myPlayer !== undefined) {
      turnEl.textContent = state.currentPlayer === myPlayer ? t('yourTurn') : t('opponentTurn');
    } else {
      turnEl.textContent = state.currentPlayer === 0 ? t('yourTurn') : t('opponentTurn');
    }
  } else if (state.finalScores) {
    const [a, b] = state.finalScores;
    if (a > b) turnEl.textContent = `${t('player1Wins')} ${a}–${b}`;
    else if (b > a) turnEl.textContent = `${t('player2Wins')} ${b}–${a}`;
    else turnEl.textContent = `${t('draw')} ${a}–${b}`;
  }
  container.appendChild(turnEl);

  const onNewGame = options?.onNewGame;
  if (onNewGame !== undefined) {
    const newGameBtn = document.createElement('button');
    newGameBtn.type = 'button';
    newGameBtn.className = 'btn-new';
    newGameBtn.textContent = t('newGame');
    newGameBtn.addEventListener('click', onNewGame);
    container.appendChild(newGameBtn);
  }
}

export function attachBoard(
  container: HTMLElement,
  getState: () => GameState,
  setState: (s: GameState) => void,
  onNewGame: () => void,
  boardOptions?: BoardOptions
): () => void {
  const render = () =>
    renderBoard(container, getState(), (holeIndex) => {
      const result = applyMove(getState(), holeIndex);
      setState(result.state);
      boardOptions?.onCapture?.(result.capture);
    }, { ...boardOptions, onNewGame });

  render();
  return render;
}
