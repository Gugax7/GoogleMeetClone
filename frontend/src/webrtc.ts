export function getPeerConnection() {
    return new RTCPeerConnection({
    iceServers: [{urls: 'stun:stun.l.google.com:19302' }]
    });
}