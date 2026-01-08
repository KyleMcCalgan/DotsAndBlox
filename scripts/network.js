// Network layer - P2P connection management using PeerJS

import * as Utils from './utils.js';

// ===== MODULE STATE =====

let peer = null;
let connection = null;
let isHost = false;
let onDataCallback = null;
let myPeerId = null;

// ===== INITIALIZATION =====

/**
 * Initialize PeerJS
 * @param {Function} onReady - Callback when peer is ready (peerId)
 * @param {Function} onError - Callback on error (errorMessage)
 */
export function initializePeer(onReady, onError) {
    console.log('Initializing PeerJS...');

    // Create peer with auto-generated ID and STUN servers for NAT traversal
    peer = new Peer({
        config: {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:global.stun.twilio.com:3478' },
                { urls: 'stun:stun.services.mozilla.com' }
            ]
        }
    });

    // Peer ready - ID generated
    peer.on('open', (id) => {
        console.log('Peer initialized with ID:', id);
        myPeerId = id;

        // Just pass the peer ID directly - no room code needed!
        onReady(id);
    });

    // Error handling
    peer.on('error', (err) => {
        console.error('Peer error:', err);
        const message = err.type === 'peer-unavailable'
            ? 'Could not connect to peer'
            : err.message || 'Connection error';
        onError(message);
    });

    // Handle disconnection
    peer.on('disconnected', () => {
        console.warn('Peer disconnected from server');
        // Notify if we have an active connection
        if (connection) {
            handleDisconnection();
        }
    });

    // Handle close
    peer.on('close', () => {
        console.log('Peer connection closed');
        // Notify if we have an active connection
        if (connection) {
            handleDisconnection();
        }
    });
}

// ===== HOST SETUP =====

/**
 * Set up as host and wait for incoming connections
 * @param {Function} onConnected - Callback when guest connects
 */
export function hostGame(onConnected) {
    isHost = true;
    console.log('Hosting game, waiting for guest...');

    // Listen for incoming connections
    peer.on('connection', (conn) => {
        console.log('Guest is connecting...');
        connection = conn;
        setupConnectionListeners(conn, onConnected);
    });
}

// ===== GUEST SETUP =====

/**
 * Connect to host using peer ID
 * @param {string} hostPeerId - Host's peer ID
 * @param {Function} onConnected - Callback when connected
 * @param {Function} onError - Callback on error
 */
export function joinGame(hostPeerId, onConnected, onError) {
    isHost = false;
    console.log('Attempting to connect to peer:', hostPeerId);

    // Validate peer ID
    if (!Utils.validatePeerId(hostPeerId)) {
        onError('Invalid peer ID format');
        return;
    }

    console.log('Connecting to host:', hostPeerId);

    // Connect to host
    connection = peer.connect(hostPeerId.trim());

    if (!connection) {
        onError('Failed to initiate connection');
        return;
    }

    // Set up connection listeners
    setupConnectionListeners(connection, onConnected);

    // Connection timeout (10 seconds)
    const timeout = setTimeout(() => {
        if (connection && !connection.open) {
            onError('Connection timeout - host may be offline');
            closeConnection();
        }
    }, 10000);

    // Clear timeout on successful connection
    connection.on('open', () => {
        clearTimeout(timeout);
    });
}

// ===== CONNECTION LISTENERS =====

/**
 * Set up event listeners for a connection
 * @param {Object} conn - PeerJS connection object
 * @param {Function} onConnected - Callback when connection opens
 */
function setupConnectionListeners(conn, onConnected) {
    // Connection opened
    conn.on('open', () => {
        console.log('Connection established with', conn.peer);
        if (onConnected) onConnected();
    });

    // Data received
    conn.on('data', (data) => {
        console.log('Data received:', data.type || data);
        if (onDataCallback) {
            onDataCallback(data);
        }
    });

    // Connection closed
    conn.on('close', () => {
        console.log('Connection closed');
        handleDisconnection();
    });

    // Connection error
    conn.on('error', (err) => {
        console.error('Connection error:', err);
        handleDisconnection();
    });
}

// ===== DATA COMMUNICATION =====

/**
 * Send data to connected peer
 * @param {Object} data - Data to send
 * @returns {boolean} True if sent successfully
 */
export function sendData(data) {
    if (!connection) {
        console.error('No connection established');
        return false;
    }

    if (!connection.open) {
        console.error('Connection not open');
        return false;
    }

    console.log('Sending data:', data.type || data);
    connection.send(data);
    return true;
}

/**
 * Register callback for incoming data
 * @param {Function} callback - Function to call when data received
 */
export function onData(callback) {
    onDataCallback = callback;
    console.log('Data handler registered');
}

// ===== DISCONNECTION HANDLING =====

/**
 * Handle disconnection from peer
 */
function handleDisconnection() {
    console.log('Handling disconnection...');

    // Notify via callback
    if (onDataCallback) {
        onDataCallback({
            type: 'disconnect',
            reason: 'connection_lost'
        });
    }

    // Clean up connection reference
    connection = null;
}

/**
 * Close connection and clean up
 */
export function closeConnection() {
    console.log('Closing connection...');

    // Close connection if exists
    if (connection) {
        connection.close();
        connection = null;
    }

    // Destroy peer
    if (peer) {
        peer.destroy();
        peer = null;
    }

    // Clean up state
    myPeerId = null;
    onDataCallback = null;
    isHost = false;
}

// Set up cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (connection && connection.open) {
        console.log('Page closing, cleaning up connection...');
        // Try to send a disconnect notification before closing
        try {
            connection.send({ type: 'disconnect', reason: 'page_closed' });
        } catch (e) {
            console.error('Failed to send disconnect message:', e);
        }
        closeConnection();
    }
});

// ===== STATUS GETTERS =====

/**
 * Get current connection status
 * @returns {string} 'disconnected', 'connecting', or 'connected'
 */
export function getConnectionStatus() {
    if (!connection) return 'disconnected';
    if (connection.open) return 'connected';
    return 'connecting';
}

/**
 * Get current peer ID
 * @returns {string|null} Peer ID or null
 */
export function getMyPeerId() {
    return myPeerId;
}

/**
 * Check if current peer is host
 * @returns {boolean} True if host
 */
export function getIsHost() {
    return isHost;
}
