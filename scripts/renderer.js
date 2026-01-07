// Canvas rendering for Dots and Boxes
// Handles all visual representation and click detection

// ===== CONSTANTS & CONFIGURATION =====

// Visual constants (will adjust for mobile)
let DOT_RADIUS = 6;
let LINE_WIDTH = 4;
let MARGIN = 40;

// Canvas references
let canvas = null;
let ctx = null;
let gridSize = 0;
let cellSize = 0;

// Resize handler reference (to allow removal)
let resizeHandler = null;
let resizeTimeout = null;

// ===== HELPER FUNCTIONS =====

/**
 * Convert hex color to rgba with alpha
 * @param {string} hex - Hex color (e.g., '#FF6B6B')
 * @param {number} alpha - Alpha value (0-1)
 * @returns {string} rgba string
 */
function hexToRgba(hex, alpha = 1) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ===== INITIALIZATION =====

/**
 * Initialize the canvas with the given grid size
 * @param {number} size - Grid size (3, 5, or 7)
 */
export function initCanvas(size) {
    canvas = document.getElementById('gameCanvas');

    // Only get context once, or reuse existing
    if (!ctx) {
        ctx = canvas.getContext('2d', {
            alpha: false,  // Disable alpha for better performance
            desynchronized: true  // Allow async rendering
        });
    }

    gridSize = size;
    console.log('Canvas initialized with grid size:', gridSize);

    // Remove old resize listener if it exists
    if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler);
    }

    // Create debounced resize handler
    resizeHandler = () => {
        // Debounce resize events for better performance
        if (resizeTimeout) {
            clearTimeout(resizeTimeout);
        }
        resizeTimeout = setTimeout(() => {
            resizeCanvas();
        }, 100);
    };

    // Set up responsive sizing
    resizeCanvas();

    // Add resize listener for responsive behavior
    window.addEventListener('resize', resizeHandler);
}

/**
 * Resize canvas based on viewport size (responsive)
 * Adjusts constants for mobile vs desktop
 */
function resizeCanvas() {
    const isMobile = window.innerWidth < 768;

    // Adjust visual constants for mobile
    if (isMobile) {
        DOT_RADIUS = 4;
        LINE_WIDTH = 3;
        MARGIN = 20;
    } else {
        DOT_RADIUS = 6;
        LINE_WIDTH = 4;
        MARGIN = 40;
    }

    // Calculate max canvas size based on viewport
    const maxWidth = window.innerWidth - 40;  // 20px padding each side
    const maxHeight = window.innerHeight - 200;  // Space for UI elements
    const maxSize = Math.min(maxWidth, maxHeight, isMobile ? 400 : 600);

    // Set canvas dimensions
    canvas.width = maxSize;
    canvas.height = maxSize;

    // Calculate cell size based on grid
    cellSize = (maxSize - 2 * MARGIN) / (gridSize - 1);
}

/**
 * Get current cell size (for external use)
 */
export function getCellSize() {
    return cellSize;
}

/**
 * Get current margin (for external use)
 */
export function getMargin() {
    return MARGIN;
}

// ===== DRAWING FUNCTIONS =====

/**
 * Draw all dots in the grid
 * @param {Object} gameState - Current game state (not used here, but kept for consistency)
 */
function drawDots(gameState) {
    ctx.fillStyle = '#333';  // Dark gray for dots

    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            const x = MARGIN + col * cellSize;
            const y = MARGIN + row * cellSize;

            ctx.beginPath();
            ctx.arc(x, y, DOT_RADIUS, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

/**
 * Draw all lines (horizontal and vertical)
 * Lines are colored based on which player drew them
 * @param {Object} gameState - Current game state
 * @param {string} player1Color - Player 1's color
 * @param {string} player2Color - Player 2's color
 */
function drawLines(gameState, player1Color, player2Color) {
    ctx.lineCap = 'round';
    ctx.lineWidth = LINE_WIDTH;

    // Draw horizontal lines
    gameState.horizontalLines.forEach((player, key) => {
        const [row, col] = key.split(',').map(Number);

        // Set color based on player
        ctx.strokeStyle = player === 1 ? player1Color : player2Color;

        const x1 = MARGIN + col * cellSize;
        const y1 = MARGIN + row * cellSize;
        const x2 = MARGIN + (col + 1) * cellSize;
        const y2 = MARGIN + row * cellSize;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    });

    // Draw vertical lines
    gameState.verticalLines.forEach((player, key) => {
        const [row, col] = key.split(',').map(Number);

        // Set color based on player
        ctx.strokeStyle = player === 1 ? player1Color : player2Color;

        const x1 = MARGIN + col * cellSize;
        const y1 = MARGIN + row * cellSize;
        const x2 = MARGIN + col * cellSize;
        const y2 = MARGIN + (row + 1) * cellSize;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    });
}

/**
 * Draw completed boxes with player colors
 * @param {Object} gameState - Current game state
 * @param {string} player1Color - Player 1's color
 * @param {string} player2Color - Player 2's color
 */
function drawBoxes(gameState, player1Color, player2Color) {
    gameState.boxes.forEach(box => {
        const x = MARGIN + box.col * cellSize;
        const y = MARGIN + box.row * cellSize;

        // Fill box with player color (semi-transparent)
        const fillColor = box.owner === 1 ? hexToRgba(player1Color, 0.3) : hexToRgba(player2Color, 0.3);
        ctx.fillStyle = fillColor;
        ctx.fillRect(x, y, cellSize, cellSize);

        // Draw player indicator text
        ctx.fillStyle = box.owner === 1 ? player1Color : player2Color;
        ctx.font = `bold ${cellSize / 3}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`P${box.owner}`, x + cellSize / 2, y + cellSize / 2);
    });
}

/**
 * Main draw function - renders the entire game state
 * @param {Object} gameState - Current game state
 * @param {string} player1Color - Player 1's color (hex)
 * @param {string} player2Color - Player 2's color (hex)
 */
export function drawGame(gameState, player1Color = '#C65D3B', player2Color = '#4A6FA5') {
    // Use requestAnimationFrame for smoother rendering
    requestAnimationFrame(() => {
        // Clear canvas with fillRect (faster than clearRect)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw in order: boxes (background), lines (middle), dots (foreground)
        drawBoxes(gameState, player1Color, player2Color);
        drawLines(gameState, player1Color, player2Color);
        drawDots(gameState);
    });
}

// ===== CLICK DETECTION =====

/**
 * Convert mouse/touch event to canvas coordinates
 * @param {Event} event - Mouse or touch event
 * @returns {Object} {x, y} coordinates relative to canvas
 */
export function getCanvasCoordinates(event) {
    const rect = canvas.getBoundingClientRect();

    // Handle both mouse and touch events
    const clientX = event.clientX || (event.touches && event.touches[0].clientX);
    const clientY = event.clientY || (event.touches && event.touches[0].clientY);

    return {
        x: clientX - rect.left,
        y: clientY - rect.top
    };
}

/**
 * Detect which line (if any) was clicked
 * @param {number} x - Canvas x coordinate
 * @param {number} y - Canvas y coordinate
 * @param {Object} gameState - Current game state
 * @returns {Object|null} {type, row, col} or null if no line detected
 */
export function detectLineClick(x, y, gameState) {
    // Threshold for click detection (larger for mobile)
    const THRESHOLD = cellSize / 4;

    // Check horizontal lines
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize - 1; col++) {
            const lineKey = `${row},${col}`;

            // Skip if line already drawn
            if (gameState.horizontalLines.has(lineKey)) continue;

            const lineX1 = MARGIN + col * cellSize;
            const lineY = MARGIN + row * cellSize;
            const lineX2 = MARGIN + (col + 1) * cellSize;

            // Check if click is near the horizontal line
            if (Math.abs(y - lineY) < THRESHOLD &&
                x >= lineX1 - THRESHOLD &&
                x <= lineX2 + THRESHOLD) {
                return { type: 'horizontal', row, col };
            }
        }
    }

    // Check vertical lines
    for (let row = 0; row < gridSize - 1; row++) {
        for (let col = 0; col < gridSize; col++) {
            const lineKey = `${row},${col}`;

            // Skip if line already drawn
            if (gameState.verticalLines.has(lineKey)) continue;

            const lineX = MARGIN + col * cellSize;
            const lineY1 = MARGIN + row * cellSize;
            const lineY2 = MARGIN + (row + 1) * cellSize;

            // Check if click is near the vertical line
            if (Math.abs(x - lineX) < THRESHOLD &&
                y >= lineY1 - THRESHOLD &&
                y <= lineY2 + THRESHOLD) {
                return { type: 'vertical', row, col };
            }
        }
    }

    return null;  // No line detected
}
