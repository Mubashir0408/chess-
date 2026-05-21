const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = [8, 7, 6, 5, 4, 3, 2, 1];

const PIECES = {
  wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
  bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟',
};

const boardState = [
  ['bR','bN','bB','bQ','bK','bB','bN','bR'],
  ['bP','bP','bP','bP','bP','bP','bP','bP'],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  ['wP','wP','wP','wP','wP','wP','wP','wP'],
  ['wR','wN','wB','wQ','wK','wB','wN','wR'],
];

let selectedSquare = null;
let validMoves     = [];
let currentTurn    = 'w';

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

function getColor(piece) {
  return piece ? piece[0] : null;
}

function inBounds(row, col) {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

// Deep copy the board — used for simulating moves
function copyBoard(board) {
  return board.map(row => [...row]);
}

// ────────────────────────────────────────────
//  FIND KING position for a given color
// ────────────────────────────────────────────
function findKing(color, board) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] === color + 'K') return { row: r, col: c };
    }
  }
  return null;
}

// ────────────────────────────────────────────
//  GET RAW MOVES (no check filtering)
//  Same as getValidMoves but works on any board copy
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

    if (inBounds(row + dir, col) && !board[row + dir][col]) {
      moves.push({ row: row + dir, col });
      if (row === startRow && !board[row + dir * 2][col]) {
        moves.push({ row: row + dir * 2, col });
      }
    }
    [-1, 1].forEach(side => {
      if (inBounds(row + dir, col + side)) {
        const target = board[row + dir][col + side];
        if (target && getColor(target) !== color) {
          moves.push({ row: row + dir, col: col + side });
        }
      }
    });
  }

  // ── ROOK / QUEEN (straight) ──
  if (type === 'R' || type === 'Q') {
    [[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr,dc]) => {
      let r = row + dr, c = col + dc;
      while (inBounds(r, c)) {
        if (!board[r][c]) { moves.push({ row: r, col: c }); }
        else {
          if (getColor(board[r][c]) !== color) moves.push({ row: r, col: c });
          break;
        }
        r += dr; c += dc;
      }
    });
  }

  // ── BISHOP / QUEEN (diagonal) ──
  if (type === 'B' || type === 'Q') {
    [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([dr,dc]) => {
      let r = row + dr, c = col + dc;
      while (inBounds(r, c)) {
        if (!board[r][c]) { moves.push({ row: r, col: c }); }
        else {
          if (getColor(board[r][c]) !== color) moves.push({ row: r, col: c });
          break;
        }
        r += dr; c += dc;
      }
    });
  }

  // ── KNIGHT ──
  if (type === 'N') {
    [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dr,dc]) => {
      const r = row + dr, c = col + dc;
      if (inBounds(r, c) && getColor(board[r][c]) !== color) {
        moves.push({ row: r, col: c });
      }
    });
  }

  // ── KING ──
  if (type === 'K') {
    [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(([dr,dc]) => {
      const r = row + dr, c = col + dc;
      if (inBounds(r, c) && getColor(board[r][c]) !== color) {
        moves.push({ row: r, col: c });
      }
    });
  }

  return moves;
}

// ────────────────────────────────────────────
//  STEP 6 NEW — IS IN CHECK?
//  Returns true if 'color' king is under attack
// ────────────────────────────────────────────
function isInCheck(color, board) {
  const king = findKing(color, board);
  if (!king) return false;

  const enemy = color === 'w' ? 'b' : 'w';

  // check every enemy piece — can any of them reach the king?
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (getColor(board[r][c]) === enemy) {
        const attacks = getRawMoves(r, c, board);
        if (attacks.some(m => m.row === king.row && m.col === king.col)) {
          return true; // king is under attack!
        }
      }
    }
  }
  return false;
}

// ────────────────────────────────────────────
//  STEP 6 NEW — GET VALID MOVES (with check filter)
//  Only returns moves that don't leave own king in check
// ────────────────────────────────────────────
function getValidMoves(row, col) {
  const raw   = getRawMoves(row, col, boardState);
  const color = getColor(boardState[row][col]);

  // filter: simulate each move, keep only moves where king is NOT in check
  return raw.filter(move => {
    const copy = copyBoard(boardState);
    copy[move.row][move.col] = copy[row][col]; // simulate move
    copy[row][col] = null;
    return !isInCheck(color, copy);            // keep if king is safe
  });
}

// ────────────────────────────────────────────
//  MOVE PIECE
// ────────────────────────────────────────────
function movePiece(fromRow, fromCol, toRow, toCol) {
  boardState[toRow][toCol] = boardState[fromRow][fromCol];
  boardState[fromRow][fromCol] = null;
  currentTurn  = currentTurn === 'w' ? 'b' : 'w';
  selectedSquare = null;
  validMoves     = [];
  renderBoard();
}

// ────────────────────────────────────────────
//  RENDER BOARD
// ────────────────────────────────────────────
function renderBoard() {
  const boardEl = document.getElementById('chess-board');
  boardEl.innerHTML = '';

  // ── STEP 6 NEW — check if current player is in check ──
  const inCheck = isInCheck(currentTurn, boardState);

  // find king position to highlight it red
  const kingPos = findKing(currentTurn, boardState);

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {

      const square = document.createElement('div');
      square.classList.add('square');
      square.classList.add((row + col) % 2 === 0 ? 'light' : 'dark');
      square.dataset.row = row;
      square.dataset.col = col;
      square.dataset.square = FILES[col] + RANKS[row];

      // green = selected piece
      if (selectedSquare && selectedSquare.row === row && selectedSquare.col === col) {
        square.classList.add('selected');
      }

      // yellow dot = valid move
      const isValid = validMoves.some(m => m.row === row && m.col === col);
      if (isValid) square.classList.add('valid-move');

      // ── STEP 6 NEW — red = king in check ──
      if (inCheck && kingPos && kingPos.row === row && kingPos.col === col) {
        square.classList.add('in-check');
      }

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

      } else if (selectedSquare.row === row && selectedSquare.col === col) {
        selectedSquare = null;
        validMoves     = [];
        renderBoard();

      } else {
        const selColor = getColor(boardState[selectedSquare.row][selectedSquare.col]);

        if (piece && clickedColor === selColor) {
          selectedSquare = { row, col };
          validMoves     = getValidMoves(row, col);
          renderBoard();

        } else if (validMoves.some(m => m.row === row && m.col === col)) {
          movePiece(selectedSquare.row, selectedSquare.col, row, col);

        } else {
          selectedSquare = null;
          validMoves     = [];
          renderBoard();
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

  // ── STEP 6 NEW — show CHECK warning ──
  display.textContent = inCheck ? `${who}'s Turn  ⚠️ CHECK!` : `${who}'s Turn`;
  display.style.color      = inCheck ? '#ff6b6b' : '#e2c77a';
  display.style.fontSize   = '16px';
  display.style.fontWeight = '600';
  display.style.marginTop  = '8px';
  display.style.letterSpacing = '1px';
}

// ── START ──
renderBoard();