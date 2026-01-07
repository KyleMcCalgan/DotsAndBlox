// Main entry point
// Initializes game and sets up all event listeners

import * as GameController from './game-controller.js';
import * as Renderer from './renderer.js';
import * as UI from './ui-controller.js';

// ===== STATE FOR COLOR PICKER =====

let selectedPlayer1Color = '#C65D3B';  // Default terracotta
let selectedPlayer2Color = '#4A6FA5';  // Default steel blue

// Host lobby state
let hostSelectedColor = '#C65D3B';
let guestSelectedColor = '#4A6FA5';

// ===== INITIALIZATION =====

document.addEventListener('DOMContentLoaded', () => {
    console.log('Dots and Boxes - Game initialized');

    setupMenuListeners();
    setupGameSetupListeners();
    setupOnlineSetupListeners();
    setupHostLobbyListeners();
    setupGuestLobbyListeners();
    setupGameListeners();
    setupColorSettingsListeners();
    setupGameOverListeners();
});

// ===== MENU LISTENERS =====

function setupMenuListeners() {
    // Local Mode button
    document.getElementById('localModeBtn').addEventListener('click', () => {
        UI.showGameSetup();
    });

    // Online Mode button
    document.getElementById('onlineModeBtn').addEventListener('click', () => {
        UI.showOnlineSetup();
    });
}

// ===== GAME SETUP LISTENERS =====

function setupGameSetupListeners() {
    // Color picker for Player 1
    const p1Container = document.querySelectorAll('#gameSetupModal .color-picker-compact')[0];
    setupColorPicker(
        'player1',
        document.getElementById('player1ColorCustom'),
        p1Container.querySelectorAll('.color-swatch'),
        (color) => { selectedPlayer1Color = color; }
    );

    // Color picker for Player 2
    const p2Container = document.querySelectorAll('#gameSetupModal .color-picker-compact')[1];
    setupColorPicker(
        'player2',
        document.getElementById('player2ColorCustom'),
        p2Container.querySelectorAll('.color-swatch'),
        (color) => { selectedPlayer2Color = color; }
    );

    // Start Game button
    document.getElementById('startGameBtn').addEventListener('click', () => {
        const gridSize = parseInt(document.getElementById('setupGridSize').value);
        GameController.startLocalGame(gridSize, selectedPlayer1Color, selectedPlayer2Color);
    });

    // Cancel button
    document.getElementById('cancelSetupBtn').addEventListener('click', () => {
        UI.showMenu();
    });
}

// ===== ONLINE SETUP LISTENERS =====

function setupOnlineSetupListeners() {
    // Host Game button
    document.getElementById('hostGameBtn').addEventListener('click', () => {
        console.log('Host game clicked');
        GameController.startOnlineGameAsHost((peerId) => {
            console.log('Peer ID created:', peerId);
            UI.showHostLobby(peerId);
        });
    });

    // Join Game button
    document.getElementById('joinGameBtn').addEventListener('click', () => {
        const peerId = document.getElementById('roomCodeInput').value.trim();

        if (!peerId || peerId.length === 0) {
            UI.showError('Please enter a peer ID');
            return;
        }

        console.log('Joining game with peer ID:', peerId);
        GameController.joinOnlineGame(peerId);
        UI.showGuestLobby();
    });

    // Back to menu button
    document.getElementById('backToMenuBtn').addEventListener('click', () => {
        UI.showMenu();
    });
}

// ===== HOST LOBBY LISTENERS =====

function setupHostLobbyListeners() {
    // Color picker for host
    setupColorPicker(
        'host',
        document.getElementById('hostColorCustom'),
        document.querySelectorAll('#hostLobbyModal .color-swatch'),
        (color) => {
            hostSelectedColor = color;
            // Send color update to guest if connected
            GameController.sendColorUpdate(1, color);
        }
    );

    // Start Game button
    document.getElementById('startOnlineGameBtn').addEventListener('click', () => {
        const gridSize = parseInt(document.getElementById('hostGridSize').value);
        console.log('Starting online game, grid:', gridSize);
        GameController.startOnlineGame(gridSize, hostSelectedColor, guestSelectedColor);
    });

    // Copy peer ID button
    document.getElementById('copyRoomCodeBtn').addEventListener('click', () => {
        const peerId = document.getElementById('hostRoomCode').textContent;
        UI.copyPeerId(peerId);
    });

    // Cancel button
    document.getElementById('cancelHostBtn').addEventListener('click', () => {
        GameController.quitGame();
        UI.showMenu();
    });
}

// ===== GUEST LOBBY LISTENERS =====

function setupGuestLobbyListeners() {
    // Color picker for guest
    setupColorPicker(
        'guest',
        document.getElementById('guestColorCustom'),
        document.querySelectorAll('#guestLobbyModal .color-swatch'),
        (color) => {
            guestSelectedColor = color;
            // Send color update to host
            GameController.sendColorUpdate(2, color);
        }
    );

    // Leave Game button
    document.getElementById('leaveGameBtn').addEventListener('click', () => {
        GameController.quitGame();
        UI.showMenu();
    });
}

// ===== GAME LISTENERS =====

function setupGameListeners() {
    const canvas = document.getElementById('gameCanvas');

    // Canvas click listener
    canvas.addEventListener('click', (event) => {
        const gameState = GameController.getGameState();
        if (!gameState) return;

        const coords = Renderer.getCanvasCoordinates(event);
        const line = Renderer.detectLineClick(coords.x, coords.y, gameState);

        if (line) {
            GameController.handleMove(line.type, line.row, line.col);
        }
    });

    // Canvas touch listener (for mobile)
    canvas.addEventListener('touchstart', (event) => {
        event.preventDefault();
        const gameState = GameController.getGameState();
        if (!gameState) return;

        const coords = Renderer.getCanvasCoordinates(event);
        const line = Renderer.detectLineClick(coords.x, coords.y, gameState);

        if (line) {
            GameController.handleMove(line.type, line.row, line.col);
        }
    });

    // Settings button (color change)
    document.getElementById('settingsBtn').addEventListener('click', () => {
        const colors = GameController.getPlayerColors();
        UI.initColorSettings(colors.player1Color, colors.player2Color);
        UI.showColorSettings();
    });

    // Quit button
    document.getElementById('quitGameBtn').addEventListener('click', () => {
        if (confirm('Are you sure you want to quit? Progress will be lost.')) {
            GameController.quitGame();
        }
    });
}

// ===== COLOR SETTINGS LISTENERS (MID-GAME) =====

function setupColorSettingsListeners() {
    // Color picker for Player 1 (settings modal)
    setupColorPicker(
        'settingsPlayer1',
        document.getElementById('settingsPlayer1Custom'),
        document.querySelectorAll('#settingsPlayer1Presets .color-swatch'),
        (color) => { /* color selected */ }
    );

    // Color picker for Player 2 (settings modal)
    setupColorPicker(
        'settingsPlayer2',
        document.getElementById('settingsPlayer2Custom'),
        document.querySelectorAll('#settingsPlayer2Presets .color-swatch'),
        (color) => { /* color selected */ }
    );

    // Apply button
    document.getElementById('applyColorsBtn').addEventListener('click', () => {
        const p1Color = document.getElementById('settingsPlayer1Custom').value;
        const p2Color = document.getElementById('settingsPlayer2Custom').value;

        GameController.changeColors(p1Color, p2Color);
        UI.hideColorSettings();
    });

    // Cancel button
    document.getElementById('closeSettingsBtn').addEventListener('click', () => {
        UI.hideColorSettings();
    });
}

// ===== GAME OVER LISTENERS =====

function setupGameOverListeners() {
    // Play Again button
    document.getElementById('restartBtn').addEventListener('click', () => {
        GameController.restartGame();
    });

    // Main Menu button
    document.getElementById('mainMenuBtn').addEventListener('click', () => {
        GameController.quitGame();
    });
}

// ===== HELPER: COLOR PICKER =====

/**
 * Set up a color picker with presets and custom input
 * @param {string} playerPrefix - Prefix for element IDs ('player1', 'player2', etc.)
 * @param {HTMLElement} customInput - Custom color input element
 * @param {NodeList} swatches - Preset color swatch buttons
 * @param {Function} onChange - Callback when color changes
 */
function setupColorPicker(playerPrefix, customInput, swatches, onChange) {
    // Preset swatch click
    swatches.forEach(swatch => {
        swatch.addEventListener('click', () => {
            const color = swatch.dataset.color;
            customInput.value = color;
            onChange(color);
        });
    });

    // Custom color input change
    customInput.addEventListener('input', () => {
        const color = customInput.value;
        onChange(color);
    });
}
