# Google Meet Clone

## Overview
A browser-based video call application built from scratch, reproducing the core of Google Meet. The project was structured as a 4-week journey that deliberately goes through a "wrong" approach first (sending video over WebSockets) before arriving at the correct solution (WebRTC peer-to-peer).

## Plan

### Week 1 — The Foundation
Goal: two browsers can find each other on the server and join the same room.

- [x] Initialize the backend: `npm init`, install `express` and `socket.io`
- [x] Create `server.js`: HTTP server + Socket.io attached to it
- [x] Implement room join logic on the server (`socket.join(roomId)`)
- [x] Emit a `user-connected` event to others in the room when a new peer joins
- [x] Initialize the frontend: `npm create vite` (Vanilla TypeScript)
- [x] Install `socket.io-client` on the frontend
- [x] Connect the frontend to the backend and join a room on page load
- [x] Listen for `user-connected` on the frontend and log it to confirm it works

### Week 2 — The Pain (Video over WebSockets)
Goal: stream video through the server using canvas frames — deliberately bad, to feel why WebRTC exists.

- [x] Capture camera with `getUserMedia`
- [x] Display local video in a `<video autoplay muted>` tag
- [x] Use a hidden `<canvas>` to capture frames at ~10fps and convert to Base64 (`toDataURL`)
- [x] Emit the Base64 string to the server via `socket.emit`
- [x] Server relays the string to the other peer in the room
- [x] Receiver sets the Base64 string as the `src` of an `<img>` tag
- [x] Observe the lag, frame drops, and CPU spike — this is the point

### Week 3 — The Cure (WebRTC Signaling)
Goal: replace the image stream with a proper WebRTC handshake, using Socket.io only for signaling.

- [x] Create an `RTCPeerConnection` on each client
- [x] Add local media tracks to the peer connection (`addTrack`)
- [x] When a new user joins, the older peer creates an SDP Offer and sends it via Socket.io
- [x] The new peer receives the Offer, creates an SDP Answer, and sends it back
- [x] Both peers call `setLocalDescription` and `setRemoteDescription`
- [x] Handshake complete — browsers have agreed on codecs and capabilities

### Week 4 — The Direct Connection
Goal: punch through NATs and firewalls so browsers stream video peer-to-peer.

- [x] Listen to `onicecandidate` and send each candidate to the remote peer via Socket.io
- [x] Receive ICE candidates and call `addIceCandidate` on the peer connection
- [x] Listen to `ontrack` — when fired, attach the incoming stream to a `<video>` tag
- [x] Place the WebRTC `<video>` next to the Week 2 `<img>` side by side
- [x] Wave at the camera and compare latency — the difference should be obvious

## Next Steps

- [ ] Add audio
- [ ] Deploy to a real server and test between two different machines/networks
- [ ] Add TURN server support for peers behind strict NATs/firewalls
- [ ] Support more than 2 peers in the same room (mesh or SFU architecture)