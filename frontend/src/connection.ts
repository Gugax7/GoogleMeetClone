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

export function joinRoom(roomName: string = "room-001") {
  socket.emit("join-room", roomName);
}

export function onRemoteStream(callback: (stream: MediaStream) => void) {
  pc.ontrack = (event) => callback(event.streams[0]);
}

export function onPeerDisconnected(callback: ()=>void) {
   socket.on('disconnect', () => {
    pc.close();
    callback();
});
}

export async function createAndSendOffer() {
  const offer = await pc.createOffer()

  await pc.setLocalDescription(offer);

  socket.emit('offer', offer);
}

async function flushIceCandidateQueue() { 
  for(const candidate of iceCandidateQueue) {
    await pc.addIceCandidate(candidate);
  }
  iceCandidateQueue.length = 0;
}

pc.onicecandidate = (event) => {
  if(event.candidate){
    socket.emit('ice-candidate', event.candidate);
  }
}

pc.onnegotiationneeded = async () => {
  if(!peerConnected) return;

  await createAndSendOffer();
}

socket.on('user-connected', async (socketID) => {
  console.log("user connected: ", socketID);

  peerConnected = true;

  if(pc.getSenders().some(s => s.track)){
    await createAndSendOffer();
  }
})

// finish handshake
socket.on('answer', async (answer) => {
  await pc.setRemoteDescription(answer);

  flushIceCandidateQueue();
})

// send the offer of handshake
socket.on('offer', async (offer) => {
  await pc.setRemoteDescription(offer);

  flushIceCandidateQueue();
  
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
