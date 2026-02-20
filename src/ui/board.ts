import type { GameState } from '../game/types.js';
import { getLegalMoves, getScores, applyMove } from '../game/engine.js';

const HOLE_COUNT = 9;

export interface BoardOptions {
  myPlayer?: 0 | 1;
  shareUrl?: string;
  waitingForOpponent?: boolean;
  onNewGame?: () => void;
  onMoveOverride?: (holeIndex: number) => void;
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

  container.innerHTML = '';
  container.className = 'board-container';

  if (options?.waitingForOpponent) {
    const waitEl = document.createElement('div');
    waitEl.className = 'waiting';
    waitEl.textContent = 'Waiting for opponent… Share the link below.';
    container.appendChild(waitEl);
  }

  if (options?.shareUrl) {
    const shareWrap = document.createElement('div');
    shareWrap.className = 'share-wrap';
    const shareBtn = document.createElement('button');
    shareBtn.type = 'button';
    shareBtn.className = 'btn-share';
    shareBtn.textContent = 'Copy link';
    shareBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(options.shareUrl!);
      shareBtn.textContent = 'Copied!';
      setTimeout(() => { shareBtn.textContent = 'Copy link'; }, 1500);
    });
    shareWrap.appendChild(shareBtn);
    container.appendChild(shareWrap);
  }

  const scoresEl = document.createElement('div');
  scoresEl.className = 'scores';
  scoresEl.innerHTML = `
    <span class="score" data-player="1">${score1}</span>
    <span class="score-label">Kazans</span>
    <span class="score" data-player="0">${score0}</span>
  `;
  container.appendChild(scoresEl);

  const board = document.createElement('div');
  board.className = 'board';

  const kazan1 = document.createElement('div');
  kazan1.className = 'kazan';
  kazan1.setAttribute('data-player', '1');
  kazan1.textContent = String(score1);
  board.appendChild(kazan1);

  const holesWrap = document.createElement('div');
  holesWrap.className = 'holes-wrap';

  const doMove = (i: number) => (options?.onMoveOverride ? options.onMoveOverride!(i) : onMove(i));

  const row1 = document.createElement('div');
  row1.className = 'row row-p1';
  for (let i = 0; i < HOLE_COUNT; i++) {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'hole';
    cell.setAttribute('data-player', '1');
    cell.setAttribute('data-hole', String(i));
    cell.textContent = String(state.holes[1][i]);
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
    cell.textContent = String(state.holes[0][i]);
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

  const kazan0 = document.createElement('div');
  kazan0.className = 'kazan';
  kazan0.setAttribute('data-player', '0');
  kazan0.textContent = String(score0);
  board.appendChild(kazan0);

  container.appendChild(board);

  const turnEl = document.createElement('div');
  turnEl.className = 'turn';
  if (state.phase === 'playing') {
    if (myPlayer !== undefined) {
      turnEl.textContent = state.currentPlayer === myPlayer ? 'Your turn' : "Opponent's turn";
    } else {
      turnEl.textContent = state.currentPlayer === 0 ? 'Your turn' : "Opponent's turn";
    }
  } else if (state.finalScores) {
    const [a, b] = state.finalScores;
    if (a > b) turnEl.textContent = `Player 1 wins ${a}–${b}`;
    else if (b > a) turnEl.textContent = `Player 2 wins ${b}–${a}`;
    else turnEl.textContent = `Draw ${a}–${b}`;
  }
  container.appendChild(turnEl);

  const onNewGame = options?.onNewGame;
  if (onNewGame !== undefined) {
    const newGameBtn = document.createElement('button');
    newGameBtn.type = 'button';
    newGameBtn.className = 'btn-new';
    newGameBtn.textContent = 'New game';
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
      setState(applyMove(getState(), holeIndex));
    }, { ...boardOptions, onNewGame });

  render();
  return render;
}
