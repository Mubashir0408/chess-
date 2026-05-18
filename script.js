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

// ── STEP 3 NEW ──
// Tracks which square is currently selected
// null means nothing is selected
let selectedSquare = null;

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

      // ── STEP 3 NEW ──
      // If this square matches selectedSquare, add 'selected' CSS class
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

  // ── STEP 3 NEW ──
  // Add click listeners after squares are drawn
  addClickListeners();
}

// ── STEP 3 NEW ──
// HANDLE CLICK
function addClickListeners() {
  const squares = document.querySelectorAll('.square');

  squares.forEach(square => {
    square.addEventListener('click', () => {

      const row = parseInt(square.dataset.row);
      const col = parseInt(square.dataset.col);
      const piece = boardState[row][col];

      // Case 1: nothing selected → select this square only if it has a piece
      if (!selectedSquare) {
        if (piece) {
          selectedSquare = { row, col };
          renderBoard();
        }

      // Case 2: clicked the same square again → deselect
      } else if (selectedSquare.row === row && selectedSquare.col === col) {
        selectedSquare = null;
        renderBoard();

      // Case 3: clicked a different square → deselect for now
      // (in Step 4 this is where we will MOVE the piece)
      } else {
        selectedSquare = null;
        renderBoard();
      }

    });
  });
}

// ── START ──
renderBoard();