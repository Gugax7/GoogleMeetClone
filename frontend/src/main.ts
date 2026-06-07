import './main.css'
import { getUserMediaStream, getUserScreenStream } from './util'
import { joinRoom, onPeerDisconnected, onPeerConnected, setLocalStream, setLocalScreenStream, onPeerShareScreen, onPeerStopSharingScreen, emitStopScreenShare } from './connection'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
<div class="ticks"></div>

<div id="room-layout">
  <div id="screen-area">
    <section id="screen-share-overlay" style="display:none">
    </section>
    <section id="peers-screen-share"></section>
  </div>

  <section id="partner-video-section">
    <video id="local-video" autoplay muted/>
  </section>
</div>

<div id="controls">
  <button id="btn-mic" class="control-btn">Mic</button>
  <button id="btn-camera" class="control-btn">Camera</button>
  <button id="btn-share" class="control-btn">Share Screen</button>
</div>

<div class="ticks"></div>
<section id="spacer"></section>
`


document.querySelector('#btn-share')!.addEventListener('click', async () => {
  const shareBtn = document.querySelector('#btn-share')!;

  if (shareBtn.classList.contains('sharing')) {
    stopScreenShare();
    return;
  }

  const screenStream = await getUserScreenStream();
  if (!screenStream) return;

  const screenTrack = screenStream.getVideoTracks()[0];
  screenTrack.contentHint = 'screenShare';
  screenTrack.onended = () => stopScreenShare();

  setLocalScreenStream(screenStream);

  const overlay = document.querySelector<HTMLElement>('#screen-share-overlay')!;
  const video = document.createElement('video');
  video.autoplay = true;
  video.srcObject = screenStream;
  video.id = 'screen-share-video';
  overlay.appendChild(video);

  overlay.style.display = 'flex';
  shareBtn.classList.add('sharing');
  shareBtn.textContent = 'Stop Sharing';
  updateLayout();
});

function stopScreenShare() {
  const overlay = document.querySelector<HTMLElement>('#screen-share-overlay')!;
  const screenVideo = document.querySelector<HTMLVideoElement>('#screen-share-video');
  if (screenVideo) {
    (screenVideo.srcObject as MediaStream)?.getTracks().forEach(t => t.stop());
    screenVideo.srcObject = null;
    screenVideo.remove();
  }
  overlay.style.display = 'none';

  emitStopScreenShare();
  setLocalScreenStream(null);

  const shareBtn = document.querySelector('#btn-share')!;
  shareBtn.classList.remove('sharing');
  shareBtn.textContent = 'Share Screen';

  updateLayout();
}

const stream = await getUserMediaStream();
if(stream) setLocalStream(stream);

const micBtn = document.querySelector('#btn-mic')!;
const cameraBtn = document.querySelector('#btn-camera')!;

const audioTrack = stream?.getAudioTracks()[0];
const videoTrack = stream?.getVideoTracks()[0];

if (audioTrack) {
  micBtn.addEventListener('click', () => {
    audioTrack.enabled = !audioTrack.enabled;
    micBtn.classList.toggle('off', !audioTrack.enabled);
    micBtn.textContent = audioTrack.enabled ? 'Mic' : 'Mic OFF';
  });
} else {
  (micBtn as HTMLButtonElement).disabled = true;
}

if (videoTrack) {
  cameraBtn.addEventListener('click', () => {
    videoTrack.enabled = !videoTrack.enabled;
    cameraBtn.classList.toggle('off', !videoTrack.enabled);
    cameraBtn.textContent = videoTrack.enabled ? 'Camera' : 'Camera OFF';
  });
} else {
  (cameraBtn as HTMLButtonElement).disabled = true;
}

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

onPeerDisconnected((socketId) => {
  const video = videoElements.get(socketId);
  video?.remove();

  videoElements.delete(socketId);
  updateLayout();
})

const screenShareVideoElements = new Map<string, HTMLVideoElement>();

onPeerShareScreen((socketId, stream) => {
  if(screenShareVideoElements.has(socketId)){
    screenShareVideoElements.get(socketId)!.srcObject = stream;
    return;
  }

  const video = document.createElement('video');
  video.autoplay = true;
  video.srcObject = stream;
  document.querySelector('#peers-screen-share')!.appendChild(video);

  updateLayout();

  screenShareVideoElements.set(socketId, video);
})

onPeerStopSharingScreen((socketId) => {
  const video = screenShareVideoElements.get(socketId);
  video?.remove();

  updateLayout();

  screenShareVideoElements.delete(socketId);
})

// show the video
const videoEl = document.querySelector<HTMLVideoElement>('#local-video')!;
videoEl.srcObject = stream

joinRoom();

function updateLayout() {
  const section = document.querySelector<HTMLElement>('#partner-video-section')!;
  const count = section.querySelectorAll('video').length;
  section.style.gridTemplateColumns = count <= 3 ? `repeat(${count}, 1fr)` : 'repeat(2, 1fr)';
  
  const shareSection = document.querySelector<HTMLElement>('#peers-screen-share')!
  const peerShares = shareSection.querySelectorAll('video');
  const isSharingMyScreen = document.querySelector('#screen-share-video') ? true : false;

  const anyShareActive = peerShares.length > 0 || isSharingMyScreen;
  document.querySelector('#room-layout')!.classList.toggle('screen-sharing', anyShareActive);
}
