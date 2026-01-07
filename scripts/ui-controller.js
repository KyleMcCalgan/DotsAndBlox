// UI controller - Modal and UI state management
// Handles showing/hiding modals and updating game information

// ===== MODAL MANAGEMENT =====

/**
 * Show the main menu
 */
export function showMenu() {
    hideAllModals();
    document.getElementById('menuModal').classList.remove('hidden');
    document.getElementById('gameArea').classList.add('hidden');
}

/**
 * Show the game setup modal (for local mode)
 */
export function showGameSetup() {
    hideAllModals();
    document.getElementById('gameSetupModal').classList.remove('hidden');
}

/**
 * Show the game area
 */
export function showGameArea() {
    hideAllModals();
    document.getElementById('gameArea').classList.remove('hidden');
}

/**
 * Show color settings modal (mid-game)
 */
export function showColorSettings() {
    document.getElementById('colorSettingsModal').classList.remove('hidden');
}

/**
 * Hide color settings modal
 */
export function hideColorSettings() {
    document.getElementById('colorSettingsModal').classList.add('hidden');
}

/**
 * Hide all modals
 */
function hideAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => modal.classList.add('hidden'));
}

// ===== GAME INFO UPDATES =====

/**
 * Update game information (score, turn indicator)
 * @param {Object} gameState - Current game state
 * @param {number} myPlayer - Current player number
 * @param {string} gameMode - 'local' or 'online'
 * @param {string} player1Color - Player 1's color
 * @param {string} player2Color - Player 2's color
 */
export function updateGameInfo(gameState, myPlayer, gameMode, player1Color, player2Color) {
    // Update scores
    document.getElementById('player1Score').textContent = gameState.scores.player1;
    document.getElementById('player2Score').textContent = gameState.scores.player2;

    // Update player color dots
    document.getElementById('player1Dot').style.background = player1Color;
    document.getElementById('player2Dot').style.background = player2Color;

    // Update turn indicator
    updateTurnIndicator(gameState.currentPlayer, player1Color, player2Color);

    // Update room code display (if online)
    if (gameMode === 'online') {
        // TODO: Show room code in Phase 5
    } else {
        document.getElementById('roomCodeDisplay').classList.add('hidden');
    }
}

/**
 * Update turn indicator with glow effect
 * @param {number} currentPlayer - Current player (1 or 2)
 * @param {string} player1Color - Player 1's color
 * @param {string} player2Color - Player 2's color
 */
function updateTurnIndicator(currentPlayer, player1Color, player2Color) {
    const player1Indicator = document.getElementById('player1Indicator');
    const player2Indicator = document.getElementById('player2Indicator');
    const turnText = document.getElementById('turnText');

    // Remove active class from both
    player1Indicator.classList.remove('active');
    player2Indicator.classList.remove('active');

    // Add active class to current player
    if (currentPlayer === 1) {
        player1Indicator.classList.add('active');
        player1Indicator.style.setProperty('--player-color', player1Color);
        turnText.textContent = "Player 1's Turn";
        turnText.style.color = player1Color;
    } else {
        player2Indicator.classList.add('active');
        player2Indicator.style.setProperty('--player-color', player2Color);
        turnText.textContent = "Player 2's Turn";
        turnText.style.color = player2Color;
    }
}

// ===== GAME OVER =====

/**
 * Show game over modal with winner and stats
 * @param {Object} gameState - Final game state
 * @param {Object} sessionStats - Session statistics
 */
export function showGameOver(gameState, sessionStats) {
    const modal = document.getElementById('gameOverModal');
    const winnerText = document.getElementById('winnerText');
    const statsDisplay = document.getElementById('statsDisplay');

    // Determine winner text
    let winner = '';
    if (gameState.winner === 0) {
        winner = "It's a Tie!";
    } else {
        winner = `Player ${gameState.winner} Wins!`;
    }

    // Format final scores
    const finalScore = `Final Score: P1: ${gameState.scores.player1} | P2: ${gameState.scores.player2}`;

    // Format session stats
    const stats = `
        <div class="session-stats">
            <h3>Session Stats</h3>
            <p>Games Played: ${sessionStats.gamesPlayed}</p>
            <p>Player 1 Wins: ${sessionStats.player1Wins}</p>
            <p>Player 2 Wins: ${sessionStats.player2Wins}</p>
            <p>Ties: ${sessionStats.ties}</p>
        </div>
    `;

    winnerText.innerHTML = `<h2>${winner}</h2><p>${finalScore}</p>`;
    statsDisplay.innerHTML = stats;

    modal.classList.remove('hidden');
}

// ===== FEEDBACK & ERRORS =====

/**
 * Show error toast message
 * @param {string} message - Error message to display
 */
export function showError(message) {
    showToast(message, 'error');
}

/**
 * Show feedback toast message (non-error)
 * @param {string} message - Feedback message to display
 */
export function showFeedback(message) {
    showToast(message, 'info');
}

/**
 * Show a toast notification
 * @param {string} message - Message to display
 * @param {string} type - 'error' or 'info'
 */
function showToast(message, type = 'info') {
    const toast = document.getElementById('errorToast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.remove('hidden');

    // Auto-hide after 3 seconds
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// ===== COLOR PICKER HELPERS =====

/**
 * Initialize color picker values in settings modal
 * @param {string} player1Color - Current Player 1 color
 * @param {string} player2Color - Current Player 2 color
 */
export function initColorSettings(player1Color, player2Color) {
    document.getElementById('settingsPlayer1Custom').value = player1Color;
    document.getElementById('settingsPlayer2Custom').value = player2Color;
}
