import './style.css'
import typescriptLogo from './assets/typescript.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import { setupCounter } from './counter.ts'
import { io } from 'socket.io-client'

const socket = io('http://localhost:3000');

socket.on('user-connected', (socketID) => {
  console.log("user connected: ", socketID);
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
  <img id="partner-image"/>
</section>

<div class="ticks"></div>
<section id="spacer"></section>
`

const stream = await getUserVideoFrame();

const videoEl = document.querySelector<HTMLVideoElement>('#local-video')!;
videoEl.srcObject = stream

const partnerVideo = document.querySelector<HTMLImageElement>('#partner-image')!;

socket.on('partner-frame', (frame) => {
    partnerVideo.src  = frame;
})

const canvas = document.querySelector<HTMLCanvasElement>('#capture-canva')!;
const ctx = canvas.getContext('2d')!;

canvas.width = 320;
canvas.height = 240;

setInterval(() => {
  ctx.drawImage(videoEl, 0,0, canvas.width, canvas.height);
  const frame = canvas.toDataURL('image/jpeg', 0.5);
  socket.emit("frame", frame);
}, 10);

setupCounter(document.querySelector<HTMLButtonElement>('#counter')!)
