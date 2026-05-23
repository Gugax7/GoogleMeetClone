import './style.css'
import { getUserMediaStream } from './util'
import { joinRoom, onPeerDisconnected, onPeerC } from './connection'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
<div class="ticks"></div>

<section id="next-steps">
  <video id="local-video" autoplay muted/>
</section>

<section id="partner-video-section">
  <video id="peer-video" autoplay/>
</section>

<div class="ticks"></div>
<section id="spacer"></section>
`

const peerVideo = document.querySelector<HTMLVideoElement>('#peer-video')!;
const stream = await getUserMediaStream();
const onRemoteStream = (media: MediaStream) => { peerVideo.srcObject = media };

setupPeerConnectionHandlers(onRemoteStream)

onPeerDisconnected(() => {
  peerVideo.srcObject = null
  peerVideo.load();

  setupPeerConnectionHandlers(onRemoteStream)

  sendMedia(stream)
})

sendMedia(stream)

// show the video
const videoEl = document.querySelector<HTMLVideoElement>('#local-video')!;
videoEl.srcObject = stream

joinRoom();