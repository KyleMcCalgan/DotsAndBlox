// Utility functions
// Simplified - no room code mapping needed, using peer IDs directly

/**
 * Validate peer ID format
 * PeerJS IDs are UUIDs: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 * @param {string} peerId - Peer ID to validate
 * @returns {boolean} True if valid format
 */
export function validatePeerId(peerId) {
    if (!peerId || typeof peerId !== 'string') return false;

    // Accept various formats - PeerJS can generate different ID formats
    // Typically UUID format but can be custom
    return peerId.length > 0 && peerId.trim().length > 0;
}
