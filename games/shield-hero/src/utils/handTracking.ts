import { HandLandmarker, HandLandmarkerResult, FilesetResolver } from '@mediapipe/tasks-vision';
import { HandPosition } from '../types/game';

export class HandTracker {
  private handLandmarker: HandLandmarker | null = null;
  private running = false;
  private lastVideoTime = -1;
  private lastPosition: HandPosition = { x: 0.5, y: 0.5, angle: 0, detected: false };
  private framesSinceDetection = 0;
  private smoothPosition: { x: number; y: number } = { x: 0.5, y: 0.5 };
  private smoothingFactor = 0.4;

  async initialize(): Promise<boolean> {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: 0.3,
        minHandPresenceConfidence: 0.3,
        minTrackingConfidence: 0.3
      });

      return true;
    } catch (error) {
      console.error('Failed to initialize hand tracking:', error);
      return false;
    }
  }

  // Stop only the processing loop, keep the landmarker alive so tracking can be restarted.
  stop(): void {
    this.running = false;
    this.lastVideoTime = -1;
  }

  // Fully tear down including the landmarker model.
  destroy(): void {
    this.running = false;
    this.handLandmarker = null;
    this.lastVideoTime = -1;
  }

  startTracking(video: HTMLVideoElement, canvas: HTMLCanvasElement): void {
    if (!this.handLandmarker) {
      console.error('Hand landmarker not initialized');
      return;
    }

    // Ensure any previous loop is stopped before starting a new one
    this.running = false;

    const ctx = canvas.getContext('2d');
    this.running = true;
    this.framesSinceDetection = 0;

    const processFrame = () => {
      if (!this.running || !this.handLandmarker) return;

      if (video.readyState >= 2) {
        const currentTime = performance.now();

        if (video.currentTime !== this.lastVideoTime) {
          this.lastVideoTime = video.currentTime;
          try {
            const results = this.handLandmarker.detectForVideo(video, currentTime);
            this.updatePosition(results);
            if (ctx) {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              this.drawDebug(ctx, results, canvas.width, canvas.height);
            }
          } catch (err) {
            console.error('Hand detection error:', err);
          }
        }
      }

      requestAnimationFrame(processFrame);
    };

    requestAnimationFrame(processFrame);
  }

  private updatePosition(results: HandLandmarkerResult): void {
    if (results.landmarks && results.landmarks.length > 0) {
      this.framesSinceDetection = 0;

      const hand = results.landmarks[0];
      const indexTip = hand[8];

      // Mirror X so right-hand movement matches mirrored video.
      // Negate Y so pointing up gives a negative dy (up in screen space).
      const targetX = 1 - indexTip.x;
      const targetY = indexTip.y;

      this.smoothPosition.x += (targetX - this.smoothPosition.x) * this.smoothingFactor;
      this.smoothPosition.y += (targetY - this.smoothPosition.y) * this.smoothingFactor;

      const dx = this.smoothPosition.x - 0.5;
      // Y increases downward in screen space; use as-is for canvas angle
      const dy = this.smoothPosition.y - 0.5;
      const angle = Math.atan2(dy, dx);

      this.lastPosition = {
        x: this.smoothPosition.x,
        y: this.smoothPosition.y,
        angle,
        detected: true
      };
    } else {
      this.framesSinceDetection++;
      if (this.framesSinceDetection > 5) {
        this.lastPosition.detected = false;
      }
    }
  }

  private drawDebug(ctx: CanvasRenderingContext2D, results: HandLandmarkerResult, width: number, height: number): void {
    ctx.save();

    const guideRadius = Math.min(width, height) * 0.35;
    const centerX = width / 2;
    const centerY = height / 2;

    ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.arc(centerX, centerY, guideRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = 'rgba(255, 215, 0, 0.2)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const x = centerX + Math.cos(angle) * guideRadius;
      const y = centerY + Math.sin(angle) * guideRadius;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 215, 0, 0.5)';
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(255, 215, 0, 0.15)';
    ctx.beginPath();
    ctx.arc(centerX, centerY, guideRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Move your finger around the circle', centerX, height - 15);

    if (results.landmarks && results.landmarks.length > 0) {
      const hand = results.landmarks[0];

      const connections = [
        [0, 1], [1, 2], [2, 3], [3, 4],
        [0, 5], [5, 6], [6, 7], [7, 8],
        [0, 9], [9, 10], [10, 11], [11, 12],
        [0, 13], [13, 14], [14, 15], [15, 16],
        [0, 17], [17, 18], [18, 19], [19, 20],
        [5, 9], [9, 13], [13, 17]
      ];

      ctx.strokeStyle = 'rgba(78, 204, 167, 0.9)';
      ctx.lineWidth = 3;
      connections.forEach(([start, end]) => {
        ctx.beginPath();
        ctx.moveTo(hand[start].x * width, hand[start].y * height);
        ctx.lineTo(hand[end].x * width, hand[end].y * height);
        ctx.stroke();
      });

      hand.forEach((landmark, index) => {
        const x = landmark.x * width;
        const y = landmark.y * height;
        ctx.beginPath();
        if (index === 8) {
          ctx.arc(x, y, 12, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 215, 0, 1)';
        } else {
          ctx.arc(x, y, 6, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(78, 204, 167, 0.9)';
        }
        ctx.fill();
        if (index === 8) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });

      const indexTip = hand[8];
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(indexTip.x * width, indexTip.y * height);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();

    // Draw status indicator outside the mirrored transform
    const statusColor = this.lastPosition.detected ? 'rgba(46, 213, 115, 0.9)' : 'rgba(255, 71, 87, 0.9)';
    const statusText = this.lastPosition.detected ? 'Hand Detected' : 'Show your hand';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(10, 10, 130, 28);
    ctx.fillStyle = statusColor;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(statusText, 18, 28);
  }

  getPosition(): HandPosition {
    return { ...this.lastPosition };
  }
}

export const createHandTracker = (): HandTracker => new HandTracker();
