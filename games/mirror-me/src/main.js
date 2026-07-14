import './main.css';
import { GameEngine } from './game/GameEngine.js';

// ── DOM refs ──────────────────────────────────────────────────────────────────
const videoEl        = document.getElementById('camera');
const overlayCanvas  = document.getElementById('overlay');
const uiCanvas       = document.getElementById('ui');
const statusEl       = document.getElementById('status');

// ── Engine ────────────────────────────────────────────────────────────────────
let engine;

function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg;
}

// ── MediaPipe init ────────────────────────────────────────────────────────────
function waitForMediaPipe() {
  return new Promise((resolve) => {
    let attempts = 0;
    const check = () => {
      if (window.Pose) {
        resolve();
      } else if (attempts++ < 100) {
        setTimeout(check, 100);
      } else {
        setStatus('Failed to load MediaPipe. Refresh the page.');
      }
    };
    check();
  });
}

async function initCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      audio: false,
    });
    videoEl.srcObject = stream;
    await videoEl.play();
  } catch (err) {
    setStatus('Camera access denied. Please allow camera and refresh.');
    throw err;
  }
}

async function main() {
  setStatus('Requesting camera...');
  await initCamera();

  setStatus('Loading MediaPipe...');
  await waitForMediaPipe();

  // Build game engine
  engine = new GameEngine(videoEl, overlayCanvas, uiCanvas);
  engine.start();

  // Init MediaPipe Pose
  const pose = new window.Pose({
    locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`,
  });

  pose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: false,
    smoothSegmentation: false,
    minDetectionConfidence: 0.55,
    minTrackingConfidence:  0.55,
  });

  pose.onResults((results) => {
    engine.onLandmarks(results);
  });

  // Use MediaPipe Camera utility to pump frames
  const camera = new window.Camera(videoEl, {
    onFrame: async () => {
      try {
        await pose.send({ image: videoEl });
      } catch (_) {}
    },
    width: 1280,
    height: 720,
  });

  camera.start().then(() => {
    setStatus('');
    engine.onMediaPipeReady();
  }).catch((err) => {
    // Fallback: drive manually from video
    setStatus('');
    engine.onMediaPipeReady();
    const sendFrame = async () => {
      if (!videoEl.paused && !videoEl.ended) {
        try { await pose.send({ image: videoEl }); } catch (_) {}
      }
      requestAnimationFrame(sendFrame);
    };
    requestAnimationFrame(sendFrame);
  });
}

main().catch(console.error);
