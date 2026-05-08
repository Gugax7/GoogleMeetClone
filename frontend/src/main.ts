import './style.css'
import typescriptLogo from './assets/typescript.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import { setupCounter } from './counter.ts'
import { io } from 'socket.io-client'

const socket = io('http://localhost:3000');

const pc = new RTCPeerConnection();
const iceCandidateQueue: RTCIceCandidate[] = [];

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

async function getUserVideoFrame():Promise<MediaStream> {
  const frame = await navigator.mediaDevices.getUserMedia({video: true})
  return frame;
}

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
<section id="center">
  <div class="hero">
    <img src="${heroImg}" class="base" width="170" height="179">
    <img src="${typescriptLogo}" class="framework" alt="TypeScript logo"/>
    <img src="${viteLogo}" class="vite" alt="Vite logo" />
  </div>
  <div>
    <h1>Get started</h1>
    <p>Edit <code>src/main.ts</code> and save to test <code>HMR</code></p>
  </div>
  <button id="counter" type="button" class="counter"></button>
</section>

<div class="ticks"></div>

<section id="next-steps">
  <video id="local-video" autoplay muted/>
  <canvas id="capture-canva" style="display:none"/>
</section>

<section id="partner-video-section">
  <video id="peer-video" autoplay/>
</section>

<div class="ticks"></div>
<section id="spacer"></section>
`

const stream = await getUserVideoFrame();

// Send video
for(const track of stream.getTracks()){
  pc.addTrack(track, stream)
}

// show the video
const videoEl = document.querySelector<HTMLVideoElement>('#local-video')!;
videoEl.srcObject = stream

const peerVideo = document.querySelector<HTMLVideoElement>('#peer-video')!;

// receiving the event it show on screen
pc.ontrack = (event) => {
  peerVideo.srcObject = event.streams[0];
}

setupCounter(document.querySelector<HTMLButtonElement>('#counter')!)
