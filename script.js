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
let validMoves = [];        // stores valid move squares for selected piece
let currentTurn = 'w';

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

// ── HELPER: get color of a piece ──
function getColor(piece) {
  return piece ? piece[0] : null;
}

// ── HELPER: is a position inside the board? ──
function inBounds(row, col) {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

// ──────────────────────────────────────────
//  GET VALID MOVES — main function
//  Returns array of {row, col} the piece can move to
// ──────────────────────────────────────────
function getValidMoves(row, col) {
  const piece = boardState[row][col];
  if (!piece) return [];

  const color = getColor(piece);
  const type  = piece[1];   // P, R, N, B, Q, K
  const moves = [];

  // ── PAWN ──
  if (type === 'P') {
    // white pawns move UP (row decreases), black pawns move DOWN (row increases)
    const dir = color === 'w' ? -1 : 1;
    const startRow = color === 'w' ? 6 : 1;

    // 1 step forward — only if square is empty
    if (inBounds(row + dir, col) && !boardState[row + dir][col]) {
      moves.push({ row: row + dir, col });

      // 2 steps forward from starting row — only if BOTH squares are empty
      if (row === startRow && !boardState[row + dir * 2][col]) {
        moves.push({ row: row + dir * 2, col });
      }
    }

    // diagonal capture — only if enemy piece is there
    [-1, 1].forEach(side => {
      if (inBounds(row + dir, col + side)) {
        const target = boardState[row + dir][col + side];
        if (target && getColor(target) !== color) {
          moves.push({ row: row + dir, col: col + side });
        }
      }
    });
  }

  // ── ROOK — moves in 4 straight directions ──
  if (type === 'R' || type === 'Q') {
    const directions = [[-1,0],[1,0],[0,-1],[0,1]];
    directions.forEach(([dr, dc]) => {
      let r = row + dr;
      let c = col + dc;
      while (inBounds(r, c)) {
        if (!boardState[r][c]) {
          moves.push({ row: r, col: c });   // empty square → can move
        } else {
          if (getColor(boardState[r][c]) !== color) {
            moves.push({ row: r, col: c }); // enemy → can capture, then stop
          }
          break; // friendly or enemy → stop sliding
        }
        r += dr;
        c += dc;
      }
    });
  }

  // ── BISHOP — moves in 4 diagonal directions ──
  if (type === 'B' || type === 'Q') {
    const directions = [[-1,-1],[-1,1],[1,-1],[1,1]];
    directions.forEach(([dr, dc]) => {
      let r = row + dr;
      let c = col + dc;
      while (inBounds(r, c)) {
        if (!boardState[r][c]) {
          moves.push({ row: r, col: c });
        } else {
          if (getColor(boardState[r][c]) !== color) {
            moves.push({ row: r, col: c });
          }
          break;
        }
        r += dr;
        c += dc;
      }
    });
  }

  // ── KNIGHT — L shaped jumps ──
  if (type === 'N') {
    const jumps = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    jumps.forEach(([dr, dc]) => {
      const r = row + dr;
      const c = col + dc;
      if (inBounds(r, c)) {
        // can move if square is empty or has enemy
        if (!boardState[r][c] || getColor(boardState[r][c]) !== color) {
          moves.push({ row: r, col: c });
        }
      }
    });
  }

  // ── KING — 1 square in any direction ──
  if (type === 'K') {
    const steps = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
    steps.forEach(([dr, dc]) => {
      const r = row + dr;
      const c = col + dc;
      if (inBounds(r, c)) {
        if (!boardState[r][c] || getColor(boardState[r][c]) !== color) {
          moves.push({ row: r, col: c });
        }
      }
    });
  }

  return moves;
}

// ── MOVE PIECE ──
function movePiece(fromRow, fromCol, toRow, toCol) {
  boardState[toRow][toCol] = boardState[fromRow][fromCol];
  boardState[fromRow][fromCol] = null;
  currentTurn = currentTurn === 'w' ? 'b' : 'w';
  selectedSquare = null;
  validMoves = [];
  renderBoard();
}

// ── RENDER BOARD ──
function renderBoard() {
  const boardEl = document.getElementById('chess-board');
  boardEl.innerHTML = '';

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

      // yellow = valid move square
      const isValid = validMoves.some(m => m.row === row && m.col === col);
      if (isValid) {
        square.classList.add('valid-move');
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

  updateTurnDisplay();
  addClickListeners();
}

// ── CLICK HANDLER ──
function addClickListeners() {
  const squares = document.querySelectorAll('.square');

  squares.forEach(square => {
    square.addEventListener('click', () => {

      const row = parseInt(square.dataset.row);
      const col = parseInt(square.dataset.col);
      const piece = boardState[row][col];
      const clickedColor = getColor(piece);

      // Case 1: nothing selected
      if (!selectedSquare) {
        if (piece && clickedColor === currentTurn) {
          selectedSquare = { row, col };
          validMoves = getValidMoves(row, col);  // calculate valid moves
          renderBoard();
        }

      // Case 2: clicked same square → deselect
      } else if (selectedSquare.row === row && selectedSquare.col === col) {
        selectedSquare = null;
        validMoves = [];
        renderBoard();

      // Case 3: square already selected
      } else {
        const selectedPiece = boardState[selectedSquare.row][selectedSquare.col];
        const selectedColor = getColor(selectedPiece);

        // clicked friendly piece → switch selection
        if (piece && clickedColor === selectedColor) {
          selectedSquare = { row, col };
          validMoves = getValidMoves(row, col);
          renderBoard();

        // clicked a valid move square → MOVE
        } else if (validMoves.some(m => m.row === row && m.col === col)) {
          movePiece(selectedSquare.row, selectedSquare.col, row, col);

        // clicked invalid square → deselect
        } else {
          selectedSquare = null;
          validMoves = [];
          renderBoard();
        }
      }

    });
  });
}

// ── TURN DISPLAY ──
function updateTurnDisplay() {
  let display = document.getElementById('turn-display');
  if (!display) {
    display = document.createElement('div');
    display.id = 'turn-display';
    document.querySelector('.chess-wrapper').appendChild(display);
  }
  display.textContent = currentTurn === 'w' ? '⬜ White\'s Turn' : '⬛ Black\'s Turn';
  display.style.color = '#e2c77a';
  display.style.fontSize = '16px';
  display.style.fontWeight = '600';
  display.style.marginTop = '8px';
  display.style.letterSpacing = '1px';
}

// ── START ──
renderBoard();