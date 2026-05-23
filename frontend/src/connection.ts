import { socket } from './socket';
import { getPeerConnection } from './webrtc';

const peers = new Map<string, RTCPeerConnection>();
let localStream: MediaStream | null = null;

const iceCandidateQueues = new Map<string, RTCIceCandidate[]>();

function createPeerConnection(socketID: string, onTrack: (socketID:string, stream: MediaStream) => void){
  const newPc = getPeerConnection();

  newPc.onicecandidate = (event) => {
    if(event.candidate){
      socket.emit('ice-candidate', { iceCandidate: event.candidate, to: socketID})
    }
  }

  newPc.onnegotiationneeded = async () => {
    await createAndSendOffer(socketID, newPc);
  }

  localStream?.getTracks().forEach(track => newPc.addTrack(track, localStream!))

  newPc.ontrack = (event) => onTrack(socketID, event.streams[0])

  peers.set(socketID, newPc);

  return newPc;
}

export function setLocalStream(stream: MediaStream){
  localStream = stream;
}

export function joinRoom(roomName: string = "room-001") {
  socket.emit("join-room", roomName);
}

export function onPeerConnected(socketID: string, callback: (stream: MediaStream) => void) {
  socket.on("user-connected", (socketId) => {
    createPeerConnection(socketID,)
  })
}

export function onPeerDisconnected(callback: ()=>void) {
   socket.on('user-disconnect', (socketID) => {
    peers.get(socketID)?.close();

    callback();
});
}

export async function createAndSendOffer(socketId: string, pc: RTCPeerConnection) {
  const offer = await pc.createOffer()

  await pc.setLocalDescription(offer);

  socket.emit('offer', { offer, to: socketId});
}

async function flushIceCandidateQueue(socketId: string, pc: RTCPeerConnection) { 
  const queue = iceCandidateQueues.get(socketId);
  
  if(!queue) return;

  for(const candidate of queue) {
    await pc.addIceCandidate(candidate);
  }
  queue.length = 0;
}

socket.on('user-connected', async (socketID) => {
  console.log("user connected: ", socketID);

  peers.set(socketID, getPeerConnection());

  peerConnected = true;

  if(pc.getSenders().some(s => s.track)){
    await createAndSendOffer();
  }
})

// finish handshake
socket.on('answer', async (answer) => {
  await pc.setRemoteDescription(answer);

  await flushIceCandidateQueue();
})

// send the offer of handshake
socket.on('offer', async (offer) => {
  await pc.setRemoteDescription(offer);

  peerConnected = true

  await flushIceCandidateQueue();
  
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
