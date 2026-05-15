import { socket } from './socket';
import { pc } from './webrtc';

const iceCandidateQueue: RTCIceCandidate[] = [];
let peerConnected = false;

export function sendMedia(stream: MediaStream | null): void{
    if(!stream) return;

    for(const track of stream.getTracks()){
    pc.addTrack(track, stream)
    }
}

export function onRemoteStream(callback: (stream: MediaStream) => void) {
    pc.ontrack = (event) => callback(event.streams[0]);
}

pc.onicecandidate = (event) => {
  if(event.candidate){
    socket.emit('ice-candidate', event.candidate);
  }
}

socket.on('user-connected', async (socketID) => {
  console.log("user connected: ", socketID);
  
  const offer = await pc.createOffer()

  await pc.setLocalDescription(offer);

  socket.emit('offer', offer);
})

// finish handshake
socket.on('answer', async (answer) => {
  await pc.setRemoteDescription(answer);

  for(const candidate of iceCandidateQueue) {
    await pc.addIceCandidate(candidate);
  }
  iceCandidateQueue.length = 0;
})

// send the offer of handshake
socket.on('offer', async (offer) => {
  await pc.setRemoteDescription(offer);

  for(const candidate of iceCandidateQueue) {
    await pc.addIceCandidate(candidate);
  }
  iceCandidateQueue.length = 0;
  
  const answer = await pc.createAnswer();

  await pc.setLocalDescription(answer);

  socket.emit('answer', answer);
})

// receive path connection
socket.on('ice-candidate', (iceCandidate) => {
  if(pc.remoteDescription) {
    pc.addIceCandidate(iceCandidate);
  }else{
    iceCandidateQueue.push(iceCandidate);
  }
})

socket.emit("join-room", "room-001");
