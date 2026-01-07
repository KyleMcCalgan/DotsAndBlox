// Pure game logic functions
// Dots and Boxes - Core Game Logic

/**
 * Creates a new game state
 * @param {number} gridSize - Size of the grid (3, 5, or 7)
 * @returns {Object} Initial game state
 */
export function createGameState(gridSize) {
    return {
        gridSize: gridSize,
        horizontalLines: new Map(),     // Stores drawn horizontal lines: "row,col" -> player number
        verticalLines: new Map(),       // Stores drawn vertical lines: "row,col" -> player number
        boxes: [],                      // Array of completed boxes: [{row, col, owner}]
        currentPlayer: 1,               // Whose turn it is (1 or 2)
        scores: { player1: 0, player2: 0 },
        gameOver: false,
        winner: null                    // null, 0 (tie), 1, or 2
    };
}

/**
 * Checks if a move is valid
 * @param {string} lineType - 'horizontal' or 'vertical'
 * @param {number} row - Row coordinate
 * @param {number} col - Column coordinate
 * @param {Object} gameState - Current game state
 * @returns {boolean} True if move is valid
 */
export function isValidMove(lineType, row, col, gameState) {
    const { gridSize, horizontalLines, verticalLines } = gameState;
    const lineKey = `${row},${col}`;

    // Check if line already exists
    const lines = lineType === 'horizontal' ? horizontalLines : verticalLines;
    if (lines.has(lineKey)) return false;

    // Check bounds
    if (lineType === 'horizontal') {
        // Horizontal line connects (row,col) to (row,col+1)
        // Valid if: row is in grid AND col can extend right
        return row >= 0 && row < gridSize && col >= 0 && col < gridSize - 1;
    } else {
        // Vertical line connects (row,col) to (row+1,col)
        // Valid if: row can extend down AND col is in grid
        return row >= 0 && row < gridSize - 1 && col >= 0 && col < gridSize;
    }
}

/**
 * Gets boxes adjacent to a line (helper function)
 * @param {string} lineType - 'horizontal' or 'vertical'
 * @param {number} row - Row coordinate
 * @param {number} col - Column coordinate
 * @param {number} gridSize - Size of the grid
 * @returns {Array} Array of box coordinates that could be completed
 */
function getAdjacentBoxes(lineType, row, col, gridSize) {
    const boxes = [];

    if (lineType === 'horizontal') {
        // Horizontal line can complete box above and/or below
        if (row > 0) boxes.push({ row: row - 1, col: col });           // Box above
        if (row < gridSize - 1) boxes.push({ row: row, col: col });    // Box below
    } else {
        // Vertical line can complete box to left and/or right
        if (col > 0) boxes.push({ row: row, col: col - 1 });           // Box to left
        if (col < gridSize - 1) boxes.push({ row: row, col: col });    // Box to right
    }

    return boxes;
}

/**
 * Checks if a specific box is complete (has all 4 sides)
 * @param {number} boxRow - Box row coordinate
 * @param {number} boxCol - Box column coordinate
 * @param {Object} gameState - Current game state
 * @returns {boolean} True if box is complete
 */
function isBoxComplete(boxRow, boxCol, gameState) {
    const { horizontalLines, verticalLines } = gameState;

    // A box at (boxRow, boxCol) needs these 4 lines:
    const top = `${boxRow},${boxCol}`;           // Horizontal line at top
    const bottom = `${boxRow + 1},${boxCol}`;    // Horizontal line at bottom
    const left = `${boxRow},${boxCol}`;          // Vertical line at left
    const right = `${boxRow},${boxCol + 1}`;     // Vertical line at right

    return horizontalLines.has(top) &&
           horizontalLines.has(bottom) &&
           verticalLines.has(left) &&
           verticalLines.has(right);
}

/**
 * Checks which boxes were completed by placing a line
 * @param {string} lineType - 'horizontal' or 'vertical'
 * @param {number} row - Row coordinate
 * @param {number} col - Column coordinate
 * @param {Object} gameState - Current game state
 * @returns {Array} Array of completed box coordinates
 */
export function checkCompletedBoxes(lineType, row, col, gameState) {
    const potentialBoxes = getAdjacentBoxes(lineType, row, col, gameState.gridSize);
    return potentialBoxes.filter(box => isBoxComplete(box.row, box.col, gameState));
}

/**
 * Applies a move to the game state (MUTATES gameState)
 * @param {string} lineType - 'horizontal' or 'vertical'
 * @param {number} row - Row coordinate
 * @param {number} col - Column coordinate
 * @param {number} player - Player number (1 or 2)
 * @param {Object} gameState - Current game state (will be modified)
 * @returns {Array} Array of completed boxes
 */
export function applyMove(lineType, row, col, player, gameState) {
    const lineKey = `${row},${col}`;

    // Add the line to the appropriate Map with the player who placed it
    if (lineType === 'horizontal') {
        gameState.horizontalLines.set(lineKey, player);
    } else {
        gameState.verticalLines.set(lineKey, player);
    }

    // Check if any boxes were completed
    const completedBoxes = checkCompletedBoxes(lineType, row, col, gameState);

    // Award boxes to the player
    completedBoxes.forEach(box => {
        gameState.boxes.push({ row: box.row, col: box.col, owner: player });
        gameState.scores[`player${player}`]++;
    });

    // Check if game is over (all boxes claimed)
    const totalBoxes = (gameState.gridSize - 1) ** 2;
    if (gameState.boxes.length === totalBoxes) {
        gameState.gameOver = true;
        const { player1, player2 } = gameState.scores;

        // Determine winner
        if (player1 > player2) {
            gameState.winner = 1;
        } else if (player2 > player1) {
            gameState.winner = 2;
        } else {
            gameState.winner = 0;  // Tie
        }
    }

    // Handle turn switching
    if (completedBoxes.length === 0) {
        // No boxes completed: switch to the other player
        gameState.currentPlayer = player === 1 ? 2 : 1;
    } else {
        // Box(es) completed: same player goes again
        gameState.currentPlayer = player;
    }

    return completedBoxes;
}
