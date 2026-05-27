import { socket } from './socket';
import { getPeerConnection } from './webrtc';

const peers = new Map<string, RTCPeerConnection>();
let localStream: MediaStream | null = null;

const iceCandidateQueues = new Map<string, RTCIceCandidate[]>();

let onTrackCallback: (socketId: string, stream: MediaStream) => void;

function createPeerConnection(socketID: string, onTrack: (socketId: string, stream: MediaStream) => void, isOfferer: boolean = true){
  const newPc = getPeerConnection();

  newPc.onicecandidate = (event) => {
    if(event.candidate){
      socket.emit('ice-candidate', { iceCandidate: event.candidate, to: socketID})
    }
  }

  newPc.onnegotiationneeded = async () => {
    if(!isOfferer) return;
    if(newPc.signalingState !== 'stable') return;
    await createAndSendOffer(socketID, newPc);
  }

  localStream?.getTracks().forEach(track => newPc.addTrack(track, localStream!))

  newPc.ontrack = (event) => {
    console.log('ontrack fired', socketID, event.streams[0])

    onTrack(socketID, event.streams[0])
  }
  peers.set(socketID, newPc);

  return newPc;
}

export function setLocalStream(stream: MediaStream){
  localStream = stream;
}

export function joinRoom(roomName: string = "room-001") {
  socket.emit("join-room", roomName);
}

export function onPeerConnected(callback: (socketId:string, stream: MediaStream) => void) {
  onTrackCallback = callback;

  socket.on("user-connected", (socketId) => {
    createPeerConnection(socketId, callback)
  })
}

export function onPeerDisconnected(callback: (socketId: string)=>void) {
   socket.on('user-disconnect', (socketID) => {
    peers.get(socketID)?.close();

    peers.delete(socketID);
    iceCandidateQueues.delete(socketID);

    callback(socketID);
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

// finish handshake
socket.on('answer', async ({answer, from}) => {
  const pc = peers.get(from);

  if(!pc) return;

  await pc.setRemoteDescription(answer);

  await flushIceCandidateQueue(from, pc);
})

// send the offer of handshake
socket.on('offer', async ({offer, from}) => {
  const pc = createPeerConnection(from, onTrackCallback, false);

  if(!pc) return;

  await pc.setRemoteDescription(offer);

  await flushIceCandidateQueue(from, pc);
  
  const answer = await pc.createAnswer();

  await pc.setLocalDescription(answer);

  socket.emit('answer', {answer, to: from});
})

// receive path connection
socket.on('ice-candidate', ({iceCandidate, from}) => {
  const pc = peers.get(from);

  if(pc?.remoteDescription) {
    pc.addIceCandidate(iceCandidate)
  } else{
    const queue = iceCandidateQueues.get(from) ?? [];

    queue.push(iceCandidate);

    iceCandidateQueues.set(from, queue);
  }
})
