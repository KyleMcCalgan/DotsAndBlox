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
    console.log('Initializing PeerJS with STUN/TURN servers...');

    // Create peer with auto-generated ID, STUN and TURN servers for NAT traversal
    peer = new Peer({
        debug: 3, // Maximum debug logging to diagnose connection issues
        pingInterval: 5000, // Send keepalive ping every 5 seconds to maintain connection
        config: {
            iceServers: [
                // Multiple STUN servers for NAT discovery
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' },
                // Free TURN server - numb.viagenie.ca (well-known, reliable)
                {
                    urls: [
                        'turn:numb.viagenie.ca',
                        'turn:numb.viagenie.ca:3478?transport=udp',
                        'turn:numb.viagenie.ca:3478?transport=tcp'
                    ],
                    username: 'webrtc@live.com',
                    credential: 'muazkh'
                },
                // Additional free TURN servers
                {
                    urls: 'turn:turn.bistri.com:80',
                    username: 'homeo',
                    credential: 'homeo'
                },
                // Twilio STUN as backup
                { urls: 'stun:global.stun.twilio.com:3478' }
            ],
            iceTransportPolicy: 'all', // Try all connection types
            iceCandidatePoolSize: 10, // Pre-gather candidates
            bundlePolicy: 'max-bundle',
            rtcpMuxPolicy: 'require'
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
        console.error('Error type:', err.type);
        console.error('Error details:', err);

        let message;
        switch(err.type) {
            case 'peer-unavailable':
                message = 'Peer ID not found - host may be offline or ID is incorrect';
                break;
            case 'network':
                message = 'Network error - check your internet connection';
                break;
            case 'server-error':
                message = 'Server error - PeerJS server may be down';
                break;
            case 'browser-incompatible':
                message = 'Browser not compatible with WebRTC';
                break;
            case 'invalid-id':
                message = 'Invalid peer ID format';
                break;
            case 'ssl-unavailable':
                message = 'SSL required - make sure you\'re using HTTPS';
                break;
            default:
                message = err.message || 'Connection error';
        }

        onError(message);
    });

    // Handle disconnection from PeerJS signaling server
    peer.on('disconnected', () => {
        console.warn('⚠️ Peer disconnected from PeerJS signaling server');
        console.log('Attempting to reconnect...');

        // Try to reconnect to the signaling server
        try {
            peer.reconnect();
            console.log('Reconnection initiated');
        } catch (err) {
            console.error('Failed to reconnect:', err);
            // Only notify user if we have an active game connection
            if (connection && connection.open) {
                handleDisconnection();
            }
        }
    });

    // Handle close (permanent disconnection)
    peer.on('close', () => {
        console.log('❌ Peer connection closed permanently');
        // Notify if we have an active game connection
        if (connection && connection.open) {
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
    console.log('Hosting game with Peer ID:', myPeerId);
    console.log('Waiting for guest to connect...');

    // Listen for incoming connections
    peer.on('connection', (conn) => {
        console.log('Incoming connection from guest:', conn.peer);
        console.log('Connection metadata:', conn.metadata);
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
        console.error('Peer ID validation failed:', hostPeerId);
        onError('Invalid peer ID format');
        return;
    }

    console.log('Connecting to host:', hostPeerId);
    console.log('Using peer ID:', myPeerId);

    // Connect to host with reliable data channel
    connection = peer.connect(hostPeerId.trim(), {
        reliable: true,
        serialization: 'json'
    });

    if (!connection) {
        console.error('Failed to create connection object');
        onError('Failed to initiate connection');
        return;
    }

    console.log('Connection object created, waiting for open...');

    // Set up connection listeners
    setupConnectionListeners(connection, onConnected);

    // Extended connection timeout (30 seconds to allow TURN relay setup)
    const timeout = setTimeout(() => {
        if (connection && !connection.open) {
            console.error('❌ Connection timeout after 30 seconds');
            console.error('Could not establish P2P connection - network may be too restrictive');
            onError('Connection timeout - unable to connect through firewalls. Try a different network or use Local Mode.');
            closeConnection();
        }
    }, 30000);

    // Clear timeout on successful connection
    connection.on('open', () => {
        console.log('Connection opened successfully!');
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
    console.log('Setting up connection listeners for peer:', conn.peer);

    // Connection opened
    conn.on('open', () => {
        console.log('✓ Connection established with', conn.peer);
        console.log('Connection type:', conn.type);
        console.log('Connection open:', conn.open);
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
        console.log('Connection closed with peer:', conn.peer);
        handleDisconnection();
    });

    // Connection error
    conn.on('error', (err) => {
        console.error('Connection error with peer:', conn.peer);
        console.error('Error details:', err);
        handleDisconnection();
    });

    // ICE state change and candidate logging (for debugging)
    if (conn.peerConnection) {
        // Log ICE connection state changes
        conn.peerConnection.oniceconnectionstatechange = () => {
            console.log('🔌 ICE connection state:', conn.peerConnection.iceConnectionState);
        };

        // Log ICE gathering state changes
        conn.peerConnection.onicegatheringstatechange = () => {
            console.log('🔍 ICE gathering state:', conn.peerConnection.iceGatheringState);
        };

        // Log overall connection state
        conn.peerConnection.onconnectionstatechange = () => {
            console.log('📡 Connection state:', conn.peerConnection.connectionState);
        };

        // Track relay candidates
        let hasRelayCandidates = false;

        // Log ICE candidates as they're gathered (critical for debugging)
        conn.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                const candidate = event.candidate;
                console.log('🎯 ICE candidate found:', {
                    type: candidate.type, // 'host', 'srflx' (STUN), or 'relay' (TURN)
                    protocol: candidate.protocol,
                    address: candidate.address,
                    port: candidate.port
                });

                // Alert if we get a relay candidate (TURN is working!)
                if (candidate.type === 'relay') {
                    hasRelayCandidates = true;
                    console.log('✅✅✅ TURN RELAY CANDIDATE FOUND! ✅✅✅');
                    console.log('TURN servers are working - connection should succeed!');
                }
            } else {
                console.log('✓ ICE candidate gathering complete');
                if (!hasRelayCandidates) {
                    console.warn('⚠️ WARNING: No TURN relay candidates found!');
                    console.warn('This may cause connection failures through restrictive NATs/firewalls');
                }
            }
        };
    }
}

// ===== DATA COMMUNICATION =====

/**
 * Send data to connected peer
 * @param {Object} data - Data to send
 * @returns {boolean} True if sent successfully
 */
export function sendData(data) {
    if (!connection) {
        console.warn('Cannot send data - no peer connection established yet');
        return false;
    }

    if (!connection.open) {
        console.warn('Cannot send data - connection not open');
        return false;
    }

    console.log('✓ Sending data:', data.type || data);
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
