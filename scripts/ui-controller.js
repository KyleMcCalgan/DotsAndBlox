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
 * Show loading indicator
 * @param {string} message - Loading message to display
 */
export function showLoading(message = 'Connecting...') {
    const loadingEl = document.getElementById('loadingIndicator');
    const loadingText = document.getElementById('loadingText');
    if (loadingEl && loadingText) {
        loadingText.textContent = message;
        loadingEl.classList.remove('hidden');
    }
}

/**
 * Hide loading indicator
 */
export function hideLoading() {
    const loadingEl = document.getElementById('loadingIndicator');
    if (loadingEl) {
        loadingEl.classList.add('hidden');
    }
}

/**
 * Show error toast message
 * @param {string} message - Error message to display
 */
export function showError(message) {
    hideLoading(); // Hide loading if showing an error
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

// ===== ONLINE MODE UI =====

/**
 * Show online setup modal
 */
export function showOnlineSetup() {
    hideAllModals();
    document.getElementById('onlineSetupModal').classList.remove('hidden');
}

/**
 * Show host lobby with peer ID
 * @param {string} peerId - Host's peer ID
 */
export function showHostLobby(peerId) {
    hideAllModals();
    const modal = document.getElementById('hostLobbyModal');

    // Set peer ID (displays in monospace font)
    document.getElementById('hostRoomCode').textContent = peerId;

    // Reset connection status
    document.getElementById('hostConnectionStatus').innerHTML =
        '<span class="status-text">Waiting for opponent...</span>';

    // Reset opponent color label
    document.getElementById('hostOpponentColorLabel').textContent = 'Waiting for opponent...';

    // Disable start button until guest joins
    document.getElementById('startOnlineGameBtn').disabled = true;

    modal.classList.remove('hidden');
}

/**
 * Show guest lobby
 */
export function showGuestLobby() {
    hideAllModals();
    document.getElementById('guestLobbyModal').classList.remove('hidden');
}

/**
 * Update lobby connection status (for host)
 * @param {string} status - 'waiting' or 'ready'
 */
export function updateLobbyStatus(status) {
    if (status === 'ready') {
        // Guest connected - enable start button and update labels
        document.getElementById('hostConnectionStatus').innerHTML =
            '<span class="status-text">Ready to start</span>';
        document.getElementById('startOnlineGameBtn').disabled = false;

        // Update opponent color label
        document.getElementById('hostOpponentColorLabel').textContent = "Opponent's color";
    } else if (status === 'waiting') {
        // Guest disconnected - disable start button and reset labels
        document.getElementById('hostConnectionStatus').innerHTML =
            '<span class="status-text">⏳ Waiting for opponent...</span>';
        document.getElementById('startOnlineGameBtn').disabled = true;

        // Reset opponent color preview
        const guestPreview = document.getElementById('hostGuestColorPreview');
        if (guestPreview) {
            guestPreview.style.background = '#4A6FA5'; // Reset to default
        }

        // Reset opponent color label
        document.getElementById('hostOpponentColorLabel').textContent = "Opponent's color (not connected)";
    }
}

/**
 * Update opponent's color preview in lobby
 * @param {number} player - Player number (1 or 2)
 * @param {string} color - Color hex code
 */
export function updateOpponentColor(player, color) {
    if (player === 1) {
        // Update host color preview (for guest)
        const preview = document.getElementById('guestHostColorPreview');
        if (preview) {
            preview.style.background = color;
        }
    } else {
        // Update guest color preview (for host)
        const preview = document.getElementById('hostOpponentColorPreview');
        if (preview) {
            preview.style.background = color;
        }
    }
}

/**
 * Copy peer ID to clipboard
 * @param {string} peerId - Peer ID to copy
 */
export function copyPeerId(peerId) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(peerId).then(() => {
            showFeedback('Peer ID copied to clipboard!');
        }).catch(() => {
            showError('Failed to copy peer ID');
        });
    } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = peerId;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showFeedback('Peer ID copied!');
        } catch (err) {
            showError('Failed to copy peer ID');
        }
        document.body.removeChild(textArea);
    }
}
