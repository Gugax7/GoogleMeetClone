import './main.css'
import { getUserMediaStream, getUserScreenStream } from './util'
import { joinRoom, onPeerDisconnected, onPeerConnected, setLocalStream } from './connection'
import { socket } from './socket';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
<div class="ticks"></div>

<section id="partner-video-section">
  <video id="local-video" autoplay muted/>
</section>

<section id="screen-share-overlay">
  <video id="screen-share-video" autoplay/>
</section>

<button id="stop-share-btn">Stop sharing</button>
<button id="share-screen-btn">Share</button>

<section id="peers-screen-share">
</section>

<div class="ticks"></div>
<section id="spacer"></section>
`

document.querySelector('#share-screen-btn')!.addEventListener('click', async () => {
  const screenStream = await getUserScreenStream();
  if(!screenStream) return;

  const overlay = document.querySelector<HTMLElement>('#screen-share-overlay')!;
  const screenVideo = document.querySelector<HTMLVideoElement>('#screen-share-video')!;

  screenVideo.srcObject = screenStream;
  overlay.style.display = 'flex';

  screenStream.getVideoTracks()[0].onended = () => stopScreenShare();
})

document.querySelector('#stop-share-btn')!.addEventListener('click', () => stopScreenShare());

function stopScreenShare() {
  const overlay = document.querySelector<HTMLElement>('#screen-share-overlay')!;
  const screenVideo = document.querySelector<HTMLVideoElement>('#screen-share-video')!;
  (screenVideo.srcObject as MediaStream)?.getTracks().forEach(t => t.stop());
  screenVideo.srcObject = null;
  overlay.style.display = 'none';
}
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
  updateLayout();
});

console.log("socket listeners: ", socket.listeners('user-connected').length)

onPeerDisconnected((socketId) => {
  const video = videoElements.get(socketId);
  video?.remove();

  videoElements.delete(socketId);
  updateLayout();
})

// show the video
const videoEl = document.querySelector<HTMLVideoElement>('#local-video')!;
videoEl.srcObject = stream

joinRoom();

function updateLayout() {
  const section = document.querySelector<HTMLElement>('#partner-video-section')!;
  const count = section.querySelectorAll('video').length;

  section.style.gridTemplateColumns = count <=3 ? `repeat(${count}, 1fr)` : 'repeat(2, 1fr)';
}