// Game controller - Orchestrates game modes and coordination
// Manages game state, handles moves, switches turns

import * as GameLogic from './game-logic.js';
import * as Renderer from './renderer.js';
import * as UI from './ui-controller.js';

// ===== MODULE STATE =====

let gameState = null;

// Player colors
let player1Color = '#C65D3B';  // Default terracotta
let player2Color = '#4A6FA5';  // Default steel blue

// Session stats (persists across games in same session)
let sessionStats = {
    gamesPlayed: 0,
    player1Wins: 0,
    player2Wins: 0,
    ties: 0
};

// ===== PUBLIC API =====

/**
 * Start a new local game
 * @param {number} gridSize - Grid size (3, 5, or 7)
 * @param {string} p1Color - Player 1's color
 * @param {string} p2Color - Player 2's color
 */
export function startLocalGame(gridSize, p1Color, p2Color) {
    player1Color = p1Color;
    player2Color = p2Color;

    // Create game state
    gameState = GameLogic.createGameState(gridSize);

    // Initialize renderer
    Renderer.initCanvas(gridSize);
    Renderer.drawGame(gameState, player1Color, player2Color);

    // Update UI
    UI.showGameArea();
    UI.updateGameInfo(gameState, player1Color, player2Color);
}

/**
 * Handle a move
 * @param {string} lineType - 'horizontal' or 'vertical'
 * @param {number} row - Row coordinate
 * @param {number} col - Column coordinate
 */
export function handleMove(lineType, row, col) {
    if (!gameState || gameState.gameOver) return;

    // Validate move
    if (!GameLogic.isValidMove(lineType, row, col, gameState)) {
        UI.showFeedback('Invalid move!');
        return;
    }

    const currentPlayer = gameState.currentPlayer;

    // Apply move
    const completedBoxes = GameLogic.applyMove(lineType, row, col, currentPlayer, gameState);

    // Redraw with current colors
    Renderer.drawGame(gameState, player1Color, player2Color);

    // Update UI
    UI.updateGameInfo(gameState, player1Color, player2Color);

    // Check if game over
    if (gameState.gameOver) {
        handleGameOver();
    }
}

/**
 * Handle game over
 */
function handleGameOver() {
    // Update session stats
    sessionStats.gamesPlayed++;
    if (gameState.winner === 1) {
        sessionStats.player1Wins++;
    } else if (gameState.winner === 2) {
        sessionStats.player2Wins++;
    } else {
        sessionStats.ties++;
    }

    // Show game over modal
    // DON'T close connection - allow rematch with same opponent!
    UI.showGameOver(gameState, sessionStats);
}

/**
 * Restart the game with same settings
 */
export function restartGame() {
    const gridSize = gameState.gridSize;
    startLocalGame(gridSize, player1Color, player2Color);
}

/**
 * Change player colors mid-game
 * @param {string} p1Color - New Player 1 color
 * @param {string} p2Color - New Player 2 color
 */
export function changeColors(p1Color, p2Color) {
    player1Color = p1Color;
    player2Color = p2Color;

    // Redraw everything with new colors
    if (gameState) {
        Renderer.drawGame(gameState, player1Color, player2Color);
        UI.updateGameInfo(gameState, player1Color, player2Color);
    }
}

/**
 * Quit current game and return to menu
 */
export function quitGame() {
    gameState = null;
    UI.showMenu();
}

/**
 * Get current player colors (for UI)
 */
export function getPlayerColors() {
    return { player1Color, player2Color };
}

/**
 * Get current game state (for click detection)
 */
export function getGameState() {
    return gameState;
}

/**
 * Reset session stats
 */
export function resetSessionStats() {
    sessionStats = {
        gamesPlayed: 0,
        player1Wins: 0,
        player2Wins: 0,
        ties: 0
    };
}
