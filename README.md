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

- [ ] Capture camera and microphone with `getUserMedia`
- [ ] Display local video in a `<video autoplay muted>` tag
- [ ] Use a hidden `<canvas>` to capture frames at ~10fps and convert to Base64 (`toDataURL`)
- [ ] Emit the Base64 string to the server via `socket.emit`
- [ ] Server relays the string to the other peer in the room
- [ ] Receiver sets the Base64 string as the `src` of an `<img>` tag
- [ ] Observe the lag, frame drops, and CPU spike — this is the point

### Week 3 — The Cure (WebRTC Signaling)
Goal: replace the image stream with a proper WebRTC handshake, using Socket.io only for signaling.

- [ ] Create an `RTCPeerConnection` on each client
- [ ] Add local media tracks to the peer connection (`addTrack`)
- [ ] When a new user joins, the older peer creates an SDP Offer and sends it via Socket.io
- [ ] The new peer receives the Offer, creates an SDP Answer, and sends it back
- [ ] Both peers call `setLocalDescription` and `setRemoteDescription`
- [ ] Handshake complete — browsers have agreed on codecs and capabilities

### Week 4 — The Direct Connection
Goal: punch through NATs and firewalls so browsers stream video peer-to-peer.

- [ ] Listen to `onicecandidate` and send each candidate to the remote peer via Socket.io
- [ ] Receive ICE candidates and call `addIceCandidate` on the peer connection
- [ ] Listen to `ontrack` — when fired, attach the incoming stream to a `<video>` tag
- [ ] Place the WebRTC `<video>` next to the Week 2 `<img>` side by side
- [ ] Wave at the camera and compare latency — the difference should be obvious