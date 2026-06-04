import { socket } from './socket';
import { getPeerConnection } from './webrtc';

const peers = new Map<string, RTCPeerConnection>();
let localStream: MediaStream | null = null;
let localScreenStream: MediaStream | null = null;

const iceCandidateQueues = new Map<string, RTCIceCandidate[]>();
const videoStreamTypes = new Map<string, 'screen' | 'camera'>();
const pendingVideoTracks = new Map<string, { socketID: string, stream: MediaStream, track: MediaStreamTrack }>();

let onTrackCallback: (socketId: string, stream: MediaStream) => void;
let onScreenTrackCallback: (socketId: string, stream: MediaStream) => void;
let onScreenShareStopCallback: (socketId: string) => void;

function createPeerConnection(socketID: string, onTrack: (socketId: string, stream: MediaStream) => void){
  const newPc = getPeerConnection();

  newPc.onicecandidate = (event) => {
    if(event.candidate){
      socket.emit('ice-candidate', { iceCandidate: event.candidate, to: socketID})
    }
  }

  newPc.onnegotiationneeded = async () => {
    if(newPc.signalingState !== 'stable') return;
    await createAndSendOffer(socketID, newPc);
  }

  if(localScreenStream){
    socket.emit('peer-track', { type: 'screen', streamId: localScreenStream.id, to: socketID })
    
    localScreenStream?.getTracks().forEach(track => newPc.addTrack(track, localScreenStream!));
  }

  localStream?.getTracks().forEach(track => newPc.addTrack(track, localStream!))


  newPc.ontrack = (event) => {
    //console.log('ontrack fired, contentHint:', event.track.contentHint, 'kind:', event.track.kind)
    //console.log('ontrack stream id:', event.streams[0].id, 'lookup result:', videoStreamTypes.get(event.streams[0].id))

    if(event.track.kind === 'audio') {
      onTrack(socketID, event.streams[0]);
      return;
    }

    const type = videoStreamTypes.get(event.streams[0].id)

    if(type === undefined) {
      pendingVideoTracks.set(event.streams[0].id , {socketID, stream: event.streams[0], track: event.track});
      return;
    }

    if(type === 'screen') {
      event.track.onended = () => {
        console.log('Screen track ended: ', socketID);
        onScreenShareStopCallback?.(socketID);
      }

      onScreenTrackCallback?.(socketID, event.streams[0]);
    } else {
      onTrack(socketID, event.streams[0]);
    }
  }
  peers.set(socketID, newPc);

  return newPc;
}

export function setLocalStream(stream: MediaStream){
  localStream = stream;
}

export function setLocalScreenStream(stream: MediaStream){
  console.log('peers count:', peers.size)
  console.log('emitting peer-track streamId:', stream.id)

  localScreenStream = stream;

  socket.emit('peer-track', { type: 'screen', streamId: stream.id });

  for(const [_, pc] of peers){
    console.log('adding screen track to peer, state:', pc.signalingState)
    stream.getTracks().forEach(track => pc.addTrack(track, stream))
  }
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

export function onPeerShareScreen(callback: (socketId: string, stream: MediaStream) => void) {
  onScreenTrackCallback = callback;
}

export function onPeerStopSharingScreen(callback: (socketId: string) => void){
  onScreenShareStopCallback = callback
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
  const pc = peers.get(from) ?? createPeerConnection(from, onTrackCallback);

  if(!pc) return;

  const polite = socket.id! < from;

  const collision = pc.signalingState !== 'stable';

  if(collision && !polite) return;

  if(collision && polite) {
    await pc.setLocalDescription({type: 'rollback'});  // polite: rollback own offer
  }

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

socket.on('peer-track', ({ type, streamId }) => {
  //console.log('received peer-track type: ', type, ' streamId: ', streamId)
  videoStreamTypes.set(streamId, type)

  const pending = pendingVideoTracks.get(streamId);
  if(pending) {
    pendingVideoTracks.delete(streamId);
    if(type === 'screen'){
      pending.track.onended = () => onScreenShareStopCallback?.(pending.socketID);
      onScreenTrackCallback?.(pending.socketID, pending.stream);
    }
    else{
      onTrackCallback?.(pending.socketID, pending.stream)
    }
  }
})