const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = [8, 7, 6, 5, 4, 3, 2, 1];

const PIECES = {
  wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
  bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟',
};

const INITIAL_STATE = [
  ['bR','bN','bB','bQ','bK','bB','bN','bR'],
  ['bP','bP','bP','bP','bP','bP','bP','bP'],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  ['wP','wP','wP','wP','wP','wP','wP','wP'],
  ['wR','wN','wB','wQ','wK','wB','wN','wR'],
];

let boardState     = INITIAL_STATE.map(r => [...r]);
let selectedSquare = null;
let validMoves     = [];
let currentTurn    = 'w';
let gameOver       = false;

// ── CASTLING RIGHTS ──
// track if king or rooks have moved
let castlingRights = {
  wK: true,   // white king hasn't moved
  wRa: true,  // white rook on a1 hasn't moved
  wRh: true,  // white rook on h1 hasn't moved
  bK: true,
  bRa: true,
  bRh: true,
};

// ── EN PASSANT ──
// stores the square where en passant capture is possible
// e.g. { row: 2, col: 4 } means a pawn just moved to row 3 col 4
let enPassantTarget = null;

// ── RANK LABELS ──
const rankLabels = document.getElementById('rank-labels');
RANKS.forEach(r => {
  const span = document.createElement('span');
  span.textContent = r;
  rankLabels.appendChild(span);
});

// ── FILE LABELS ──
const fileLabels = document.getElementById('file-labels');
FILES.forEach(f => {
  const span = document.createElement('span');
  span.textContent = f;
  fileLabels.appendChild(span);
});

// ────────────────────────────────────────────
//  HELPERS
// ────────────────────────────────────────────
function getColor(piece) { return piece ? piece[0] : null; }
function inBounds(r, c)  { return r >= 0 && r < 8 && c >= 0 && c < 8; }
function copyBoard(b)    { return b.map(r => [...r]); }

function findKing(color, board) {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c] === color + 'K') return { row: r, col: c };
  return null;
}

// ────────────────────────────────────────────
//  RAW MOVES (no check filter)
// ────────────────────────────────────────────
function getRawMoves(row, col, board) {
  const piece = board[row][col];
  if (!piece) return [];
  const color = getColor(piece);
  const type  = piece[1];
  const moves = [];

  // ── PAWN ──
  if (type === 'P') {
    const dir      = color === 'w' ? -1 : 1;
    const startRow = color === 'w' ? 6 : 1;

    // forward 1
    if (inBounds(row+dir, col) && !board[row+dir][col]) {
      moves.push({ row: row+dir, col });
      // forward 2 from start
      if (row === startRow && !board[row+dir*2][col])
        moves.push({ row: row+dir*2, col });
    }

    // diagonal captures
    [-1, 1].forEach(s => {
      if (inBounds(row+dir, col+s)) {
        const t = board[row+dir][col+s];
        if (t && getColor(t) !== color)
          moves.push({ row: row+dir, col: col+s });

        // ── EN PASSANT capture ──
        if (enPassantTarget &&
            enPassantTarget.row === row+dir &&
            enPassantTarget.col === col+s) {
          moves.push({ row: row+dir, col: col+s, enPassant: true });
        }
      }
    });
  }

  // ── ROOK / QUEEN straight ──
  if (type === 'R' || type === 'Q') {
    [[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr,dc]) => {
      let r=row+dr, c=col+dc;
      while (inBounds(r,c)) {
        if (!board[r][c]) moves.push({row:r,col:c});
        else { if (getColor(board[r][c])!==color) moves.push({row:r,col:c}); break; }
        r+=dr; c+=dc;
      }
    });
  }

  // ── BISHOP / QUEEN diagonal ──
  if (type === 'B' || type === 'Q') {
    [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([dr,dc]) => {
      let r=row+dr, c=col+dc;
      while (inBounds(r,c)) {
        if (!board[r][c]) moves.push({row:r,col:c});
        else { if (getColor(board[r][c])!==color) moves.push({row:r,col:c}); break; }
        r+=dr; c+=dc;
      }
    });
  }

  // ── KNIGHT ──
  if (type === 'N') {
    [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dr,dc]) => {
      const r=row+dr, c=col+dc;
      if (inBounds(r,c) && getColor(board[r][c])!==color) moves.push({row:r,col:c});
    });
  }

  // ── KING ──
  if (type === 'K') {
    [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(([dr,dc]) => {
      const r=row+dr, c=col+dc;
      if (inBounds(r,c) && getColor(board[r][c])!==color) moves.push({row:r,col:c});
    });

    // ── CASTLING ──
    // King side (short) castling
    if (color === 'w' && castlingRights.wK && castlingRights.wRh) {
      // squares between king and rook must be empty
      if (!board[7][5] && !board[7][6]) {
        // king must not be in check and must not pass through check
        if (!isInCheck('w', board) &&
            !squareAttacked(7, 5, 'b', board) &&
            !squareAttacked(7, 6, 'b', board)) {
          moves.push({ row: 7, col: 6, castling: 'wK' });
        }
      }
    }
    // Queen side (long) castling
    if (color === 'w' && castlingRights.wK && castlingRights.wRa) {
      if (!board[7][1] && !board[7][2] && !board[7][3]) {
        if (!isInCheck('w', board) &&
            !squareAttacked(7, 2, 'b', board) &&
            !squareAttacked(7, 3, 'b', board)) {
          moves.push({ row: 7, col: 2, castling: 'wQ' });
        }
      }
    }
    // Black king side
    if (color === 'b' && castlingRights.bK && castlingRights.bRh) {
      if (!board[0][5] && !board[0][6]) {
        if (!isInCheck('b', board) &&
            !squareAttacked(0, 5, 'w', board) &&
            !squareAttacked(0, 6, 'w', board)) {
          moves.push({ row: 0, col: 6, castling: 'bK' });
        }
      }
    }
    // Black queen side
    if (color === 'b' && castlingRights.bK && castlingRights.bRa) {
      if (!board[0][1] && !board[0][2] && !board[0][3]) {
        if (!isInCheck('b', board) &&
            !squareAttacked(0, 2, 'w', board) &&
            !squareAttacked(0, 3, 'w', board)) {
          moves.push({ row: 0, col: 2, castling: 'bQ' });
        }
      }
    }
  }

  return moves;
}

// ────────────────────────────────────────────
//  IS A SQUARE ATTACKED BY enemy color?
//  Used for castling check
// ────────────────────────────────────────────
function squareAttacked(row, col, byColor, board) {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (getColor(board[r][c]) === byColor)
        if (getRawMoves(r, c, board).some(m => m.row===row && m.col===col))
          return true;
  return false;
}

// ────────────────────────────────────────────
//  IS IN CHECK?
// ────────────────────────────────────────────
function isInCheck(color, board) {
  const king = findKing(color, board);
  if (!king) return false;
  const enemy = color === 'w' ? 'b' : 'w';
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (getColor(board[r][c]) === enemy)
        if (getRawMoves(r, c, board).some(m => m.row===king.row && m.col===king.col))
          return true;
  return false;
}

// ────────────────────────────────────────────
//  VALID MOVES (with check filter)
// ────────────────────────────────────────────
function getValidMoves(row, col) {
  const color = getColor(boardState[row][col]);
  return getRawMoves(row, col, boardState).filter(move => {
    const copy = copyBoard(boardState);
    copy[move.row][move.col] = copy[row][col];
    copy[row][col] = null;
    // for en passant remove the captured pawn too
    if (move.enPassant) {
      const dir = color === 'w' ? 1 : -1;
      copy[move.row + dir][move.col] = null;
    }
    return !isInCheck(color, copy);
  });
}

// ────────────────────────────────────────────
//  GAME STATUS
// ────────────────────────────────────────────
function getGameStatus(color) {
  const allMoves = [];
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (getColor(boardState[r][c]) === color)
        getValidMoves(r, c).forEach(m => allMoves.push(m));

  if (allMoves.length === 0) {
    return isInCheck(color, boardState) ? 'checkmate' : 'stalemate';
  }
  return 'playing';
}

// ────────────────────────────────────────────
//  MOVE PIECE
// ────────────────────────────────────────────
function movePiece(fromRow, fromCol, toRow, toCol, moveData = {}) {
  const piece = boardState[fromRow][fromCol];
  const color = getColor(piece);

  // ── CASTLING: move rook too ──
  if (moveData.castling) {
    if (moveData.castling === 'wK') { boardState[7][5] = 'wR'; boardState[7][7] = null; }
    if (moveData.castling === 'wQ') { boardState[7][3] = 'wR'; boardState[7][0] = null; }
    if (moveData.castling === 'bK') { boardState[0][5] = 'bR'; boardState[0][7] = null; }
    if (moveData.castling === 'bQ') { boardState[0][3] = 'bR'; boardState[0][0] = null; }
  }

  // ── EN PASSANT: remove captured pawn ──
  if (moveData.enPassant) {
    const captureRow = color === 'w' ? toRow + 1 : toRow - 1;
    boardState[captureRow][toCol] = null;
  }

  // move the piece
  boardState[toRow][toCol]     = piece;
  boardState[fromRow][fromCol] = null;

  // ── UPDATE EN PASSANT TARGET ──
  // if pawn moved 2 squares, set en passant target
  if (piece[1] === 'P' && Math.abs(toRow - fromRow) === 2) {
    enPassantTarget = { row: (fromRow + toRow) / 2, col: toCol };
  } else {
    enPassantTarget = null;
  }

  // ── UPDATE CASTLING RIGHTS ──
  if (piece === 'wK') { castlingRights.wK = false; }
  if (piece === 'bK') { castlingRights.bK = false; }
  if (piece === 'wR' && fromCol === 0) castlingRights.wRa = false;
  if (piece === 'wR' && fromCol === 7) castlingRights.wRh = false;
  if (piece === 'bR' && fromCol === 0) castlingRights.bRa = false;
  if (piece === 'bR' && fromCol === 7) castlingRights.bRh = false;

  // ── PAWN PROMOTION ──
  // if pawn reaches the last rank → auto promote to queen
  if (piece === 'wP' && toRow === 0) boardState[toRow][toCol] = 'wQ';
  if (piece === 'bP' && toRow === 7) boardState[toRow][toCol] = 'bQ';

  currentTurn    = currentTurn === 'w' ? 'b' : 'w';
  selectedSquare = null;
  validMoves     = [];

  const status = getGameStatus(currentTurn);
  if (status !== 'playing') {
    gameOver = true;
    renderBoard();
    setTimeout(() => showGameOver(status, currentTurn), 400);
    return;
  }

  renderBoard();
}

// ────────────────────────────────────────────
//  GAME OVER OVERLAY
// ────────────────────────────────────────────
function showGameOver(status, loserColor) {
  let title, subtitle;
  if (status === 'checkmate') {
    const winner = loserColor === 'w' ? '⬛ Black' : '⬜ White';
    title    = `${winner} Wins!`;
    subtitle = 'Checkmate';
  } else {
    title    = '½  Draw!';
    subtitle = 'Stalemate — no valid moves';
  }
  const overlay = document.createElement('div');
  overlay.id = 'game-over';
  overlay.innerHTML = `
    <div class="game-over-box">
      <div class="game-over-title">${title}</div>
      <div class="game-over-sub">${subtitle}</div>
      <button onclick="resetGame()">Play Again</button>
    </div>
  `;
  document.body.appendChild(overlay);
}

// ────────────────────────────────────────────
//  RESET GAME
// ────────────────────────────────────────────
function resetGame() {
  boardState      = INITIAL_STATE.map(r => [...r]);
  selectedSquare  = null;
  validMoves      = [];
  currentTurn     = 'w';
  gameOver        = false;
  enPassantTarget = null;
  castlingRights  = { wK:true, wRa:true, wRh:true, bK:true, bRa:true, bRh:true };
  const overlay = document.getElementById('game-over');
  if (overlay) overlay.remove();
  renderBoard();
}

// ────────────────────────────────────────────
//  RENDER BOARD
// ────────────────────────────────────────────
function renderBoard() {
  const boardEl = document.getElementById('chess-board');
  boardEl.innerHTML = '';

  const inCheck = isInCheck(currentTurn, boardState);
  const kingPos = findKing(currentTurn, boardState);

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {

      const square = document.createElement('div');
      square.classList.add('square');
      square.classList.add((row + col) % 2 === 0 ? 'light' : 'dark');
      square.dataset.row    = row;
      square.dataset.col    = col;
      square.dataset.square = FILES[col] + RANKS[row];

      if (selectedSquare && selectedSquare.row===row && selectedSquare.col===col)
        square.classList.add('selected');

      if (validMoves.some(m => m.row===row && m.col===col))
        square.classList.add('valid-move');

      if (inCheck && kingPos && kingPos.row===row && kingPos.col===col)
        square.classList.add('in-check');

      const piece = boardState[row][col];
      if (piece) {
        const span = document.createElement('span');
        span.classList.add('piece');
        span.textContent = PIECES[piece];
        square.appendChild(span);
      }

      boardEl.appendChild(square);
    }
  }

  updateTurnDisplay(inCheck);
  addClickListeners();
}

// ────────────────────────────────────────────
//  CLICK HANDLER
// ────────────────────────────────────────────
function addClickListeners() {
  document.querySelectorAll('.square').forEach(square => {
    square.addEventListener('click', () => {
      if (gameOver) return;

      const row          = parseInt(square.dataset.row);
      const col          = parseInt(square.dataset.col);
      const piece        = boardState[row][col];
      const clickedColor = getColor(piece);

      if (!selectedSquare) {
        if (piece && clickedColor === currentTurn) {
          selectedSquare = { row, col };
          validMoves     = getValidMoves(row, col);
          renderBoard();
        }
      } else if (selectedSquare.row===row && selectedSquare.col===col) {
        selectedSquare = null;
        validMoves     = [];
        renderBoard();
      } else {
        const selColor = getColor(boardState[selectedSquare.row][selectedSquare.col]);

        if (piece && clickedColor === selColor) {
          selectedSquare = { row, col };
          validMoves     = getValidMoves(row, col);
          renderBoard();
        } else {
          // find the full move data (includes castling/enPassant flags)
          const moveData = validMoves.find(m => m.row===row && m.col===col);
          if (moveData) {
            movePiece(selectedSquare.row, selectedSquare.col, row, col, moveData);
          } else {
            selectedSquare = null;
            validMoves     = [];
            renderBoard();
          }
        }
      }
    });
  });
}

// ────────────────────────────────────────────
//  TURN DISPLAY
// ────────────────────────────────────────────
function updateTurnDisplay(inCheck) {
  let display = document.getElementById('turn-display');
  if (!display) {
    display = document.createElement('div');
    display.id = 'turn-display';
    document.querySelector('.chess-wrapper').appendChild(display);
  }
  const who = currentTurn === 'w' ? '⬜ White' : '⬛ Black';
  display.textContent     = inCheck ? `${who}'s Turn  ⚠️ CHECK!` : `${who}'s Turn`;
  display.style.color     = inCheck ? '#ff6b6b' : '#e2c77a';
  display.style.fontSize  = '16px';
  display.style.fontWeight    = '600';
  display.style.marginTop     = '8px';
  display.style.letterSpacing = '1px';
}

// ── START ──
renderBoard();