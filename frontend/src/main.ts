import './style.css'
import typescriptLogo from './assets/typescript.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import { getUserMediaStream } from './util'
import { onRemoteStream, sendMedia } from './connection'

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

const peerVideo = document.querySelector<HTMLVideoElement>('#peer-video')!;

onRemoteStream((media) => {
  peerVideo.srcObject = media
})

const stream = await getUserMediaStream();

sendMedia(stream)

// show the video
const videoEl = document.querySelector<HTMLVideoElement>('#local-video')!;
videoEl.srcObject = stream