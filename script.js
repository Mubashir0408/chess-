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

// currently selected square {row, col} or null
let selectedSquare = null;

// ── STEP 4 NEW ──
// whose turn is it? 'w' = white, 'b' = black
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

// ── STEP 4 NEW ──
// Returns 'w' or 'b' from a piece string like 'wP' or 'bK'
function getColor(piece) {
  return piece ? piece[0] : null;  // first character is the color
}

// ── STEP 4 NEW ──
// MOVE function — moves piece from one square to another in boardState
function movePiece(fromRow, fromCol, toRow, toCol) {
  // put the piece on the new square
  boardState[toRow][toCol] = boardState[fromRow][fromCol];

  // empty the old square
  boardState[fromRow][fromCol] = null;

  // switch turn after every move
  currentTurn = currentTurn === 'w' ? 'b' : 'w';

  // clear selection
  selectedSquare = null;

  // redraw
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

      // highlight selected square
      if (selectedSquare && selectedSquare.row === row && selectedSquare.col === col) {
        square.classList.add('selected');
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

  // update whose turn it is on screen
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
      const piece = boardState[row][col];           // piece on clicked square
      const clickedColor = getColor(piece);         // color of that piece

      // ── Case 1: nothing selected yet ──
      if (!selectedSquare) {
        // only select if the piece belongs to the current player
        if (piece && clickedColor === currentTurn) {
          selectedSquare = { row, col };
          renderBoard();
        }

      // ── Case 2: clicked the same square → deselect ──
      } else if (selectedSquare.row === row && selectedSquare.col === col) {
        selectedSquare = null;
        renderBoard();

      // ── Case 3: a square is already selected ──
      } else {
        const selectedPiece = boardState[selectedSquare.row][selectedSquare.col];
        const selectedColor = getColor(selectedPiece);

        // clicked a friendly piece → switch selection to it
        if (piece && clickedColor === selectedColor) {
          selectedSquare = { row, col };
          renderBoard();

        // clicked empty square or enemy piece → MOVE!
        } else {
          movePiece(selectedSquare.row, selectedSquare.col, row, col);
        }
      }

    });
  });
}

// ── STEP 4 NEW ──
// Shows whose turn it is below the board
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