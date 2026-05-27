import './style.css'
import { getUserMediaStream } from './util'
import { joinRoom, onPeerDisconnected, onPeerConnected, setLocalStream } from './connection'
import { socket } from './socket';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
<div class="ticks"></div>

<section id="next-steps">
  <video id="local-video" autoplay muted/>
</section>

<section id="partner-video-section">
</section>

<div class="ticks"></div>
<section id="spacer"></section>
`

const stream = await getUserMediaStream();
if(stream) setLocalStream(stream);

const videoElements = new Map<string, HTMLVideoElement>();

onPeerConnected((socketId, stream) => {
  console.log('peer connected callback', socketId, stream)

  if(videoElements.has(socketId)) {
    videoElements.get(socketId)!.srcObject = stream;
    return;
  }

  const video = document.createElement('video');
  video.autoplay = true;
  video.srcObject = stream;
  document.querySelector('#partner-video-section')!.appendChild(video);

  videoElements.set(socketId,video);
});

console.log("socket listeners: ", socket.listeners('user-connected').length)

onPeerDisconnected((socketId) => {
  const video = videoElements.get(socketId);
  video?.remove();

  videoElements.delete(socketId);
})

// show the video
const videoEl = document.querySelector<HTMLVideoElement>('#local-video')!;
videoEl.srcObject = stream

joinRoom();