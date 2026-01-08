// Game controller - Orchestrates game modes and coordination
// Manages game state, handles moves, switches turns

import * as GameLogic from './game-logic.js';
import * as Renderer from './renderer.js';
import * as UI from './ui-controller.js';
import * as Network from './network.js';

// ===== MODULE STATE =====

let gameState = null;
let gameMode = null;  // 'local' or 'online'
let myPlayer = 1;

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

// Flag to prevent showing disconnect errors when we intentionally close
let intentionalDisconnect = false;

// ===== PUBLIC API =====

/**
 * Start a new local game
 * @param {number} gridSize - Grid size (3, 5, or 7)
 * @param {string} p1Color - Player 1's color
 * @param {string} p2Color - Player 2's color
 */
export function startLocalGame(gridSize, p1Color, p2Color) {
    gameMode = 'local';
    myPlayer = 1;
    player1Color = p1Color;
    player2Color = p2Color;

    // Create game state
    gameState = GameLogic.createGameState(gridSize);

    // Initialize renderer
    Renderer.initCanvas(gridSize);
    Renderer.drawGame(gameState, player1Color, player2Color);

    // Update UI
    UI.showGameArea();
    UI.updateGameInfo(gameState, myPlayer, gameMode, player1Color, player2Color);
}

/**
 * Handle a move (works for both local and online modes)
 * @param {string} lineType - 'horizontal' or 'vertical'
 * @param {number} row - Row coordinate
 * @param {number} col - Column coordinate
 */
export function handleMove(lineType, row, col) {
    if (!gameState || gameState.gameOver) return;

    if (gameMode === 'local') {
        handleLocalMove(lineType, row, col);
    } else if (gameMode === 'online') {
        handleOnlineMove(lineType, row, col);
    }
}

/**
 * Handle a local game move
 */
function handleLocalMove(lineType, row, col) {
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
    UI.updateGameInfo(gameState, myPlayer, gameMode, player1Color, player2Color);

    // Check if game over
    if (gameState.gameOver) {
        handleGameOver();
    }
}

/**
 * Handle online game move
 */
function handleOnlineMove(lineType, row, col) {
    // Check if it's your turn
    if (gameState.currentPlayer !== myPlayer) {
        UI.showFeedback('Wait for your turn!');
        return;
    }

    // Validate move
    if (!GameLogic.isValidMove(lineType, row, col, gameState)) {
        UI.showFeedback('Invalid move!');
        return;
    }

    if (myPlayer === 1) {
        // Host: Apply move locally and broadcast result
        const completedBoxes = GameLogic.applyMove(lineType, row, col, myPlayer, gameState);

        // Send updated state to guest
        Network.sendData({
            type: 'moveResult',
            success: true,
            gameState: serializeGameState(gameState),
            completedBoxes: completedBoxes
        });

        // Update local display
        Renderer.drawGame(gameState, player1Color, player2Color);
        UI.updateGameInfo(gameState, myPlayer, gameMode, player1Color, player2Color);

        if (gameState.gameOver) {
            handleGameOver();
        }
    } else {
        // Guest: Send move request to host
        Network.sendData({
            type: 'move',
            lineType: lineType,
            row: row,
            col: col
        });
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
    if (gameMode === 'local') {
        const gridSize = gameState.gridSize;
        startLocalGame(gridSize, player1Color, player2Color);
    } else if (gameMode === 'online') {
        // For online mode, keep connection and start new game
        const gridSize = gameState ? gameState.gridSize : 5;

        // Notify opponent we're starting a new game
        Network.sendData({
            type: 'rematch',
            gridSize: gridSize
        });

        // Reset game state
        gameState = GameLogic.createGameState(gridSize);

        // Reinitialize canvas and draw
        Renderer.initCanvas(gridSize);
        Renderer.drawGame(gameState, player1Color, player2Color);

        // Update UI
        UI.showGameArea();
        UI.updateGameInfo(gameState, myPlayer, gameMode, player1Color, player2Color);
    }
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
        UI.updateGameInfo(gameState, myPlayer, gameMode, player1Color, player2Color);
    }
}

/**
 * Quit current game and return to menu
 */
export function quitGame() {
    // If in online mode, notify opponent before disconnecting
    if (gameMode === 'online') {
        try {
            Network.sendData({
                type: 'disconnect',
                reason: 'player_left'
            });
        } catch (e) {
            console.error('Failed to send disconnect notification:', e);
        }
        intentionalDisconnect = true;
        Network.closeConnection();
    }

    gameState = null;
    gameMode = null;
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

// ===== STATE SERIALIZATION =====

/**
 * Serialize game state for network transmission
 * Converts Maps to arrays
 */
function serializeGameState(state) {
    return {
        ...state,
        horizontalLines: Array.from(state.horizontalLines.entries()),
        verticalLines: Array.from(state.verticalLines.entries())
    };
}

/**
 * Deserialize game state from network
 * Converts arrays back to Maps
 */
function deserializeGameState(data) {
    return {
        ...data,
        horizontalLines: new Map(data.horizontalLines),
        verticalLines: new Map(data.verticalLines)
    };
}

// ===== ONLINE MODE =====

/**
 * Start online game as host
 * @param {Function} onPeerIdReady - Callback with (peerId)
 */
export function startOnlineGameAsHost(onPeerIdReady) {
    gameMode = 'online';
    myPlayer = 1;

    console.log('Starting online game as host...');

    // Show loading indicator
    UI.showLoading('Initializing connection...');

    // Initialize peer
    Network.initializePeer(
        (peerId) => {
            console.log('Peer ready! Peer ID:', peerId);

            // Hide loading indicator
            UI.hideLoading();

            // Notify UI that peer ID is ready
            if (onPeerIdReady) {
                onPeerIdReady(peerId);
            }

            // Set up host to wait for connections
            Network.hostGame(() => {
                console.log('Guest connected to lobby!');
                UI.showFeedback('Opponent connected!');
                // Update UI immediately when connection is established
                // (This is a fallback in case guestReady message is delayed)
                setTimeout(() => {
                    UI.updateLobbyStatus('ready');
                }, 200);
            });

            // Set up network message handler
            Network.onData(handleNetworkMessage);
        },
        (error) => {
            console.error('Failed to initialize peer:', error);
            UI.showError('Failed to create game: ' + error);
            UI.showMenu();
        }
    );
}

/**
 * Actually start the online game (called when host clicks "Start Game")
 * @param {number} gridSize - Grid size
 * @param {string} hostColor - Host's color
 * @param {string} guestColor - Guest's color
 */
export function startOnlineGame(gridSize, hostColor, guestColor) {
    player1Color = hostColor;
    player2Color = guestColor;

    // Create game state
    gameState = GameLogic.createGameState(gridSize);

    // Send initial game state to guest
    Network.sendData({
        type: 'gameStart',
        gameState: serializeGameState(gameState),
        hostColor: hostColor,
        guestColor: guestColor,
        gridSize: gridSize
    });

    // Initialize local game
    Renderer.initCanvas(gridSize);
    Renderer.drawGame(gameState, player1Color, player2Color);
    UI.showGameArea();
    UI.updateGameInfo(gameState, myPlayer, gameMode, player1Color, player2Color);

    console.log('Online game started!');
}

/**
 * Join an online game as guest
 * @param {string} hostPeerId - Host's peer ID
 */
export function joinOnlineGame(hostPeerId) {
    gameMode = 'online';
    myPlayer = 2;

    console.log('Joining online game with peer ID:', hostPeerId);

    // Show loading indicator
    UI.showLoading('Connecting to host...');

    // Initialize peer
    Network.initializePeer(
        (myPeerId) => {
            console.log('Peer ready, attempting to join...');

            UI.showLoading('Joining game...');

            // Join the host's game
            Network.joinGame(
                hostPeerId,
                () => {
                    console.log('Connected to host!');
                    UI.hideLoading();
                    UI.showFeedback('Connected to host!');
                    // Wait a moment to ensure host's data listener is ready
                    setTimeout(() => {
                        console.log('Sending guestReady signal...');
                        Network.sendData({
                            type: 'guestReady'
                        });
                    }, 100);
                },
                (error) => {
                    console.error('Failed to join:', error);
                    UI.showError('Failed to join: ' + error);
                    UI.showMenu();
                }
            );

            // Set up network message handler
            Network.onData(handleNetworkMessage);
        },
        (error) => {
            console.error('Failed to initialize peer:', error);
            UI.showError('Connection error: ' + error);
            UI.showMenu();
        }
    );
}

/**
 * Handle incoming network messages
 */
function handleNetworkMessage(data) {
    console.log('Handling network message:', data.type);

    switch (data.type) {
        case 'colorUpdate':
            // Update opponent's color
            if (data.player === 1) {
                player1Color = data.color;
            } else {
                player2Color = data.color;
            }
            UI.updateOpponentColor(data.player, data.color);
            break;

        case 'guestReady':
            // Host received: guest is ready
            if (myPlayer === 1) {
                console.log('Guest is ready!');
                UI.updateLobbyStatus('ready');
            }
            break;

        case 'gameStart':
            // Guest received: game is starting
            if (myPlayer === 2) {
                console.log('Game starting!');
                gameState = deserializeGameState(data.gameState);
                player1Color = data.hostColor;
                player2Color = data.guestColor;

                Renderer.initCanvas(data.gridSize);
                Renderer.drawGame(gameState, player1Color, player2Color);
                UI.showGameArea();
                UI.updateGameInfo(gameState, myPlayer, gameMode, player1Color, player2Color);
            }
            break;

        case 'move':
            // Host received: guest is making a move
            if (myPlayer === 1) {
                console.log('Guest move:', data.lineType, data.row, data.col);

                if (GameLogic.isValidMove(data.lineType, data.row, data.col, gameState)) {
                    const completedBoxes = GameLogic.applyMove(data.lineType, data.row, data.col, 2, gameState);

                    // Send result back to guest
                    Network.sendData({
                        type: 'moveResult',
                        success: true,
                        gameState: serializeGameState(gameState),
                        completedBoxes: completedBoxes
                    });

                    // Update local display
                    Renderer.drawGame(gameState, player1Color, player2Color);
                    UI.updateGameInfo(gameState, myPlayer, gameMode, player1Color, player2Color);

                    if (gameState.gameOver) {
                        handleGameOver();
                    }
                } else {
                    // Invalid move - notify guest
                    Network.sendData({
                        type: 'moveResult',
                        success: false,
                        gameState: serializeGameState(gameState)
                    });
                }
            }
            break;

        case 'moveResult':
            // Guest received: move result from host
            if (myPlayer === 2) {
                console.log('Move result:', data.success);

                if (data.success) {
                    gameState = deserializeGameState(data.gameState);
                    Renderer.drawGame(gameState, player1Color, player2Color);
                    UI.updateGameInfo(gameState, myPlayer, gameMode, player1Color, player2Color);

                    if (gameState.gameOver) {
                        handleGameOver();
                    }
                } else {
                    UI.showFeedback('Invalid move!');
                }
            }
            break;

        case 'rematch':
            // Opponent wants to play again
            console.log('Rematch requested by opponent');

            // Reset game state with same grid size
            gameState = GameLogic.createGameState(data.gridSize);

            // Reinitialize canvas and draw
            Renderer.initCanvas(data.gridSize);
            Renderer.drawGame(gameState, player1Color, player2Color);

            // Update UI
            UI.showGameArea();
            UI.updateGameInfo(gameState, myPlayer, gameMode, player1Color, player2Color);
            UI.showFeedback('New game started!');
            break;

        case 'disconnect':
            // Opponent disconnected
            console.log('Opponent disconnected');

            // Check if this was an intentional disconnect
            const wasIntentional = intentionalDisconnect;

            // Only show error if this wasn't an intentional disconnect
            if (!wasIntentional) {
                // Opponent disconnected unexpectedly - always return to menu
                const message = myPlayer === 1 ? 'Guest disconnected - Returning to menu' : 'Host disconnected - Returning to menu';
                UI.showError(message);

                // Small delay before returning to menu so user can see the message
                setTimeout(() => {
                    UI.showMenu();
                }, 2000);

                // Clean up
                Network.closeConnection();
                gameState = null;
                gameMode = null;
            } else {
                // Intentional disconnect - already cleaned up
                Network.closeConnection();
                gameState = null;
                gameMode = null;
            }

            intentionalDisconnect = false;  // Reset flag
            break;

        default:
            console.warn('Unknown message type:', data.type);
    }
}

/**
 * Send color update to opponent
 * @param {number} playerNumber - Your player number (1 or 2)
 * @param {string} color - Your new color
 */
export function sendColorUpdate(playerNumber, color) {
    // Update local color first
    if (playerNumber === 1) {
        player1Color = color;
    } else {
        player2Color = color;
    }

    // Send to opponent if online AND connected
    if (gameMode === 'online' && Network.getConnectionStatus() === 'connected') {
        Network.sendData({
            type: 'colorUpdate',
            player: playerNumber,
            color: color
        });
    }
}
