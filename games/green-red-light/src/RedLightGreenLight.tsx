import { useEffect, useRef, useCallback, useState } from 'react';

type Difficulty = 'EASY' | 'NORMAL' | 'HARD';
type LightState = 'GREEN' | 'YELLOW' | 'RED';
type GamePhase =
  | 'START'
  | 'LOADING'
  | 'DIFFICULTY'
  | 'PLAYING'
  | 'VICTORY'
  | 'ELIMINATED';

interface GameStats {
  highScore: number;
  gamesPlayed: number;
  wins: number;
  bestSurvivalTime: number;
  selectedDifficulty: Difficulty;
}

interface DifficultyConfig {
  greenMin: number;
  greenMax: number;
  redMin: number;
  redMax: number;
  threshold: number;
}

interface PosePoint {
  x: number;
  y: number;
  visibility: number;
}

const STORAGE_KEY = 'rlgl_stats';

const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  EASY: { greenMin: 4, greenMax: 6, redMin: 2, redMax: 2, threshold: 0.12 },
  NORMAL: { greenMin: 2, greenMax: 5, redMin: 2, redMax: 4, threshold: 0.1 },
  HARD: { greenMin: 1, greenMax: 4, redMin: 3, redMax: 5, threshold: 0.08 },
};

const CDN_SCRIPTS = [
  'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js',
  'https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js',
  'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js',
];

const POSE_CONNECTIONS: [number, number][] = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24], [23, 25], [24, 26],
  [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8],
];

const SKELETON_LANDMARKS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26];

const HOLD_DURATION = 1000;
const YELLOW_DURATION = 500;
const GRACE_PERIOD = 300;

function loadStats(): GameStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return {
        highScore: typeof p.highScore === 'number' ? p.highScore : 0,
        gamesPlayed: typeof p.gamesPlayed === 'number' ? p.gamesPlayed : 0,
        wins: typeof p.wins === 'number' ? p.wins : 0,
        bestSurvivalTime: typeof p.bestSurvivalTime === 'number' ? p.bestSurvivalTime : 0,
        selectedDifficulty: ['EASY', 'NORMAL', 'HARD'].includes(p.selectedDifficulty) ? p.selectedDifficulty : 'NORMAL',
      };
    }
  } catch { /* corrupted */ }
  return { highScore: 0, gamesPlayed: 0, wins: 0, bestSurvivalTime: 0, selectedDifficulty: 'NORMAL' };
}

function saveStats(stats: GameStats) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(stats)); } catch { /* full */ }
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function formatTime(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  muted = false;

  private getCtx(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  private tone(freq: number, duration: number, type: OscillatorType = 'sine', vol = 0.15) {
    if (this.muted) return;
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  green() { this.tone(880, 0.15, 'sine', 0.1); setTimeout(() => this.tone(1100, 0.2, 'sine', 0.1), 100); }
  yellow() { this.tone(600, 0.12, 'square', 0.08); setTimeout(() => this.tone(500, 0.12, 'square', 0.08), 120); }
  red() { this.tone(200, 0.4, 'sawtooth', 0.12); this.tone(250, 0.4, 'square', 0.08); }
  eliminated() { [400, 300, 200, 100].forEach((f, i) => setTimeout(() => this.tone(f, 0.3, 'sawtooth', 0.15), i * 150)); }
  victory() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.tone(f, 0.3, 'sine', 0.12), i * 200)); setTimeout(() => this.tone(1047, 0.6, 'sine', 0.15), 800); }
  combo() { this.tone(1200, 0.1, 'sine', 0.08); }
  dispose() { this.ctx?.close(); this.ctx = null; }
}

declare global {
  interface Window { Pose: any; Camera: any; drawConnectors: any; drawLandmarks: any; }
}

export default function RedLightGreenLight() {
  const [phase, setPhase] = useState<GamePhase>('START');
  const [stats, setStats] = useState<GameStats>(loadStats);
  const [lightState, setLightState] = useState<LightState>('GREEN');
  const [progress, setProgress] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [survivalTime, setSurvivalTime] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>(loadStats().selectedDifficulty);
  const [handRaised, setHandRaised] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [trackingLost, setTrackingLost] = useState(false);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [poseReady, setPoseReady] = useState(false);
  const [diffHover, setDiffHover] = useState<Difficulty | null>(null);
  const [diffHoldProgress, setDiffHoldProgress] = useState(0);
  const [showComboAnim, setShowComboAnim] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);
  const [showElimFlash, setShowElimFlash] = useState(false);
  const [newHighScore, setNewHighScore] = useState(false);
  const [muteHoldProgress, setMuteHoldProgress] = useState(0);
  const [initError, setInitError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const audioRef = useRef(new AudioEngine());
  const gameLoopRef = useRef<number>(0);
  const phaseRef = useRef(phase);
  const lightRef = useRef(lightState);
  const progressRef = useRef(progress);
  const scoreRef = useRef(score);
  const comboRef = useRef(combo);
  const survivalRef = useRef(survivalTime);
  const difficultyRef = useRef(difficulty);
  const baselineRef = useRef<{ left: PosePoint; right: PosePoint } | null>(null);
  const graceRef = useRef(false);
  const lightTimerRef = useRef<number>(0);
  const lightStartRef = useRef(0);
  const lightDurationRef = useRef(0);
  const gameStartRef = useRef(0);
  const lastFrameRef = useRef(0);
  const handHoldStartRef = useRef(0);
  const diffHoldStartRef = useRef(0);
  const latestLandmarksRef = useRef<PosePoint[] | null>(null);
  const mountedRef = useRef(true);
  const prevKneeRef = useRef<{ leftY: number; rightY: number } | null>(null);
  const stepCountRef = useRef(0);
  const muteHoldStartRef = useRef(0);
  const initializingRef = useRef(false);
  const poseReadyRef = useRef(false);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { lightRef.current = lightState; }, [lightState]);
  useEffect(() => { progressRef.current = progress; }, [progress]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { comboRef.current = combo; }, [combo]);
  useEffect(() => { survivalRef.current = survivalTime; }, [survivalTime]);
  useEffect(() => { difficultyRef.current = difficulty; }, [difficulty]);

  // Load CDN scripts on mount
  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    async function load() {
      for (const src of CDN_SCRIPTS) {
        if (document.querySelector(`script[src="${src}"]`)) continue;
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement('script');
          s.src = src;
          s.crossOrigin = 'anonymous';
          s.onload = () => resolve();
          s.onerror = () => reject(new Error(`Failed: ${src}`));
          document.head.appendChild(s);
        });
      }
      if (!cancelled) setScriptsLoaded(true);
    }

    load().catch(e => {
      if (!cancelled) setInitError(e.message);
    });

    return () => { cancelled = true; mountedRef.current = false; };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      cancelAnimationFrame(gameLoopRef.current);
      clearTimeout(lightTimerRef.current);
      cameraRef.current?.stop();
      poseRef.current?.close();
      audioRef.current.dispose();
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach((t: MediaStreamTrack) => t.stop());
      }
    };
  }, []);

  const drawSkeleton = useCallback((landmarks: PosePoint[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w, 0);
    ctx.scale(-1, 1);

    const cl = lightRef.current;
    const cp = phaseRef.current;
    const color = cp === 'PLAYING'
      ? cl === 'RED' ? '#ef4444' : cl === 'YELLOW' ? '#f59e0b' : '#22c55e'
      : '#22c55e';

    for (const [a, b] of POSE_CONNECTIONS) {
      const p1 = landmarks[a];
      const p2 = landmarks[b];
      if (p1.visibility > 0.3 && p2.visibility > 0.3) {
        ctx.beginPath();
        ctx.moveTo(p1.x * w, p1.y * h);
        ctx.lineTo(p2.x * w, p2.y * h);
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.stroke();
      }
    }

    for (const idx of SKELETON_LANDMARKS) {
      const p = landmarks[idx];
      if (p.visibility > 0.3) {
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, 5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    ctx.restore();
  }, []);

  const processResults = useCallback((results: any) => {
    if (!mountedRef.current) return;

    if (!results.poseLandmarks) {
      setTrackingLost(true);
      latestLandmarksRef.current = null;
      return;
    }

    const landmarks: PosePoint[] = results.poseLandmarks;
    latestLandmarksRef.current = landmarks;

    const avgVis = (landmarks[11].visibility + landmarks[12].visibility) / 2;
    if (avgVis < 0.5) {
      setTrackingLost(true);
      return;
    }
    setTrackingLost(false);

    if (!poseReadyRef.current) {
      poseReadyRef.current = true;
      setPoseReady(true);
    }

    drawSkeleton(landmarks);
  }, [drawSkeleton]);

  const initMediaPipe = useCallback(async () => {
    if (!scriptsLoaded) return;
    if (initializingRef.current || poseRef.current) return;
    if (!videoRef.current) return;

    initializingRef.current = true;
    setInitError(null);

    try {
      // Wait for window.Pose to be available
      let retries = 0;
      while (!window.Pose && retries < 50) {
        await new Promise(r => setTimeout(r, 100));
        retries++;
      }
      if (!window.Pose) throw new Error('MediaPipe Pose not available');

      const pose = new window.Pose({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
      });

      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      pose.onResults((results: any) => {
        if (!mountedRef.current) return;
        processResults(results);
      });

      await pose.initialize();
      if (!mountedRef.current) return;
      poseRef.current = pose;

      // Wait for window.Camera
      retries = 0;
      while (!window.Camera && retries < 50) {
        await new Promise(r => setTimeout(r, 100));
        retries++;
      }
      if (!window.Camera) throw new Error('MediaPipe Camera not available');

      const video = videoRef.current;
      const cam = new window.Camera(video, {
        onFrame: async () => {
          if (poseRef.current && videoRef.current) {
            try {
              await poseRef.current.send({ image: videoRef.current });
            } catch {
              // frame send can fail if pose is closing
            }
          }
        },
        width: 640,
        height: 480,
      });

      await cam.start();
      if (!mountedRef.current) { cam.stop(); return; }
      cameraRef.current = cam;
      setCameraReady(true);
    } catch (e: any) {
      if (mountedRef.current) {
        setInitError(e?.message || 'Failed to initialize');
      }
    } finally {
      initializingRef.current = false;
    }
  }, [scriptsLoaded, processResults]);

  const startLoading = useCallback(() => {
    setPhase('LOADING');
  }, []);

  // Trigger init when entering LOADING phase (or when scripts become ready while in LOADING)
  useEffect(() => {
    if (phase === 'LOADING' && scriptsLoaded) {
      initMediaPipe();
    }
  }, [phase, scriptsLoaded, initMediaPipe]);

  // Transition to difficulty once pose is ready
  useEffect(() => {
    if (phase === 'LOADING' && poseReady) {
      const t = setTimeout(() => setPhase('DIFFICULTY'), 500);
      return () => clearTimeout(t);
    }
  }, [phase, poseReady]);

  const scheduleLightSwitch = useCallback((duration: number, current: LightState, diff: Difficulty) => {
    clearTimeout(lightTimerRef.current);
    const cfg = DIFFICULTY_CONFIGS[diff];

    if (current === 'GREEN') {
      lightTimerRef.current = window.setTimeout(() => {
        if (!mountedRef.current || phaseRef.current !== 'PLAYING') return;
        setLightState('YELLOW');
        lightRef.current = 'YELLOW';
        audioRef.current.yellow();

        lightTimerRef.current = window.setTimeout(() => {
          if (!mountedRef.current || phaseRef.current !== 'PLAYING') return;
          setLightState('RED');
          lightRef.current = 'RED';
          audioRef.current.red();

          graceRef.current = true;
          setTimeout(() => {
            if (phaseRef.current === 'PLAYING' && lightRef.current === 'RED') {
              graceRef.current = false;
              const lm = latestLandmarksRef.current;
              if (lm) {
                baselineRef.current = { left: { ...lm[11] }, right: { ...lm[12] } };
              }
            }
          }, GRACE_PERIOD);

          const redDur = rand(cfg.redMin, cfg.redMax) * 1000;
          lightDurationRef.current = redDur;
          lightStartRef.current = performance.now();
          setCountdown(Math.ceil(redDur / 1000));
          scheduleLightSwitch(redDur, 'RED', diff);
        }, YELLOW_DURATION);
      }, duration);
    } else {
      lightTimerRef.current = window.setTimeout(() => {
        if (!mountedRef.current || phaseRef.current !== 'PLAYING') return;

        const newCombo = comboRef.current + 1;
        setCombo(newCombo);
        comboRef.current = newCombo;
        const comboBonus = Math.min(newCombo, 5) * 50;
        const newScore = scoreRef.current + 100 + comboBonus;
        setScore(newScore);
        scoreRef.current = newScore;

        if (newCombo >= 2) {
          setShowComboAnim(true);
          audioRef.current.combo();
          setTimeout(() => setShowComboAnim(false), 1000);
        }

        setLightState('GREEN');
        lightRef.current = 'GREEN';
        baselineRef.current = null;
        graceRef.current = false;
        audioRef.current.green();

        const greenDur = rand(cfg.greenMin, cfg.greenMax) * 1000;
        lightDurationRef.current = greenDur;
        lightStartRef.current = performance.now();
        setCountdown(Math.ceil(greenDur / 1000));
        scheduleLightSwitch(greenDur, 'GREEN', diff);
      }, duration);
    }
  }, []);

  const handleVictory = useCallback(() => {
    clearTimeout(lightTimerRef.current);
    cancelAnimationFrame(gameLoopRef.current);
    audioRef.current.victory();

    const finalScore = scoreRef.current + 500;
    setScore(finalScore);
    scoreRef.current = finalScore;

    const newStats = { ...stats };
    newStats.gamesPlayed++;
    newStats.wins++;
    newStats.selectedDifficulty = difficultyRef.current;
    if (finalScore > newStats.highScore) { newStats.highScore = finalScore; setNewHighScore(true); }
    const st = survivalRef.current;
    if (st > newStats.bestSurvivalTime) newStats.bestSurvivalTime = st;
    setStats(newStats);
    saveStats(newStats);
    window.parent.postMessage({ type: 'GAME_COMPLETE', score: finalScore }, '*');
    setPhase('VICTORY');
  }, [stats]);

  const handleElimination = useCallback(() => {
    clearTimeout(lightTimerRef.current);
    cancelAnimationFrame(gameLoopRef.current);
    audioRef.current.eliminated();
    setShowElimFlash(true);
    setTimeout(() => setShowElimFlash(false), 400);

    const newStats = { ...stats };
    newStats.gamesPlayed++;
    newStats.selectedDifficulty = difficultyRef.current;
    if (scoreRef.current > newStats.highScore) { newStats.highScore = scoreRef.current; setNewHighScore(true); }
    const st = survivalRef.current;
    if (st > newStats.bestSurvivalTime) newStats.bestSurvivalTime = st;
    setStats(newStats);
    saveStats(newStats);
    window.parent.postMessage({ type: 'GAME_COMPLETE', score: scoreRef.current }, '*');
    setPhase('ELIMINATED');
  }, [stats]);

  const requestGameLoop = useCallback(() => {
    const loop = (now: number) => {
      if (!mountedRef.current || phaseRef.current !== 'PLAYING') return;

      const dt = now - lastFrameRef.current;
      lastFrameRef.current = now;

      const elapsed = now - gameStartRef.current;
      setSurvivalTime(elapsed);
      survivalRef.current = elapsed;

      const remaining = lightDurationRef.current - (now - lightStartRef.current);
      setCountdown(Math.max(0, Math.ceil(remaining / 1000)));

      const lm = latestLandmarksRef.current;
      const light = lightRef.current;

      if (lm) {
        if (light === 'GREEN') {
          const baseInc = (dt / 1000) * 1.5;
          let stepBonus = 0;

          const leftKnee = lm[25];
          const rightKnee = lm[26];
          if (leftKnee.visibility > 0.3 && rightKnee.visibility > 0.3 && prevKneeRef.current) {
            const leftDelta = Math.abs(leftKnee.y - prevKneeRef.current.leftY);
            const rightDelta = Math.abs(rightKnee.y - prevKneeRef.current.rightY);
            if (leftDelta > 0.015 || rightDelta > 0.015) {
              stepCountRef.current++;
              if (stepCountRef.current % 3 === 0) {
                stepBonus = 0.8;
                scoreRef.current += 25;
                setScore(scoreRef.current);
              }
            }
          }
          if (leftKnee.visibility > 0.3 && rightKnee.visibility > 0.3) {
            prevKneeRef.current = { leftY: leftKnee.y, rightY: rightKnee.y };
          }

          const newProg = Math.min(100, progressRef.current + baseInc + stepBonus);
          setProgress(newProg);
          progressRef.current = newProg;

          if (newProg >= 100) { handleVictory(); return; }
        }

        if (light === 'RED' && !graceRef.current && baselineRef.current) {
          const avgVis = (lm[11].visibility + lm[12].visibility) / 2;
          if (avgVis >= 0.5) {
            const sw = Math.sqrt((lm[11].x - lm[12].x) ** 2 + (lm[11].y - lm[12].y) ** 2);
            const threshold = DIFFICULTY_CONFIGS[difficultyRef.current].threshold * sw;
            const ld = Math.sqrt((lm[11].x - baselineRef.current.left.x) ** 2 + (lm[11].y - baselineRef.current.left.y) ** 2);
            const rd = Math.sqrt((lm[12].x - baselineRef.current.right.x) ** 2 + (lm[12].y - baselineRef.current.right.y) ** 2);
            if (ld > threshold || rd > threshold) { handleElimination(); return; }
          }
        }
      }

      const timeScore = Math.floor(dt / 100);
      if (timeScore > 0) { scoreRef.current += timeScore; setScore(scoreRef.current); }

      gameLoopRef.current = requestAnimationFrame(loop);
    };
    gameLoopRef.current = requestAnimationFrame(loop);
  }, [handleVictory, handleElimination]);

  const startGame = useCallback((diff: Difficulty) => {
    setDifficulty(diff);
    difficultyRef.current = diff;
    setPhase('PLAYING');
    setProgress(0); progressRef.current = 0;
    setScore(0); scoreRef.current = 0;
    setCombo(0); comboRef.current = 0;
    setSurvivalTime(0); survivalRef.current = 0;
    setLightState('GREEN'); lightRef.current = 'GREEN';
    setNewHighScore(false);
    baselineRef.current = null;
    graceRef.current = false;
    gameStartRef.current = performance.now();
    lastFrameRef.current = performance.now();
    stepCountRef.current = 0;
    prevKneeRef.current = null;

    const cfg = DIFFICULTY_CONFIGS[diff];
    const dur = rand(cfg.greenMin, cfg.greenMax) * 1000;
    lightDurationRef.current = dur;
    lightStartRef.current = performance.now();
    setCountdown(Math.ceil(dur / 1000));

    audioRef.current.green();
    scheduleLightSwitch(dur, 'GREEN', diff);
    requestGameLoop();
  }, [scheduleLightSwitch, requestGameLoop]);

  // Hand raise gesture detection (START / VICTORY / ELIMINATED)
  useEffect(() => {
    if (phase !== 'START' && phase !== 'VICTORY' && phase !== 'ELIMINATED') {
      setHandRaised(false);
      setHoldProgress(0);
      handHoldStartRef.current = 0;
      return;
    }

    let raf: number;
    const check = () => {
      const lm = latestLandmarksRef.current;
      if (lm) {
        const lw = lm[15], rw = lm[16], ls = lm[11], rs = lm[12];
        const leftUp = lw.visibility > 0.4 && ls.visibility > 0.4 && lw.y < ls.y;
        const rightUp = rw.visibility > 0.4 && rs.visibility > 0.4 && rw.y < rs.y;

        if (leftUp || rightUp) {
          setHandRaised(true);
          if (handHoldStartRef.current === 0) handHoldStartRef.current = performance.now();
          const pct = Math.min(1, (performance.now() - handHoldStartRef.current) / HOLD_DURATION);
          setHoldProgress(pct);
          if (pct >= 1) {
            handHoldStartRef.current = 0;
            setHoldProgress(0);
            if (phaseRef.current === 'START') startLoading();
            else setPhase('DIFFICULTY');
            return;
          }
        } else {
          setHandRaised(false);
          handHoldStartRef.current = 0;
          setHoldProgress(0);
        }
      }
      raf = requestAnimationFrame(check);
    };
    raf = requestAnimationFrame(check);
    return () => cancelAnimationFrame(raf);
  }, [phase, startLoading]);

  // Difficulty selection gesture
  useEffect(() => {
    if (phase !== 'DIFFICULTY') {
      setDiffHover(null);
      setDiffHoldProgress(0);
      diffHoldStartRef.current = 0;
      return;
    }

    let raf: number;
    const opts: Difficulty[] = ['EASY', 'NORMAL', 'HARD'];
    const zones = [{ min: 0, max: 0.33 }, { min: 0.33, max: 0.66 }, { min: 0.66, max: 1 }];
    let lastHover: Difficulty | null = null;

    const check = () => {
      const lm = latestLandmarksRef.current;
      if (lm) {
        const lw = lm[15], rw = lm[16];
        const wrist = lw.visibility > rw.visibility ? lw : rw;

        if (wrist.visibility > 0.4) {
          const x = 1 - wrist.x;
          let hovered: Difficulty | null = null;
          for (let i = 0; i < zones.length; i++) {
            if (x >= zones[i].min && x < zones[i].max) { hovered = opts[i]; break; }
          }

          if (hovered) {
            setDiffHover(hovered);
            if (diffHoldStartRef.current === 0 || hovered !== lastHover) {
              diffHoldStartRef.current = performance.now();
            }
            lastHover = hovered;
            const pct = Math.min(1, (performance.now() - diffHoldStartRef.current) / HOLD_DURATION);
            setDiffHoldProgress(pct);
            if (pct >= 1) {
              diffHoldStartRef.current = 0;
              setDiffHoldProgress(0);
              startGame(hovered);
              return;
            }
          } else {
            setDiffHover(null);
            lastHover = null;
            diffHoldStartRef.current = 0;
            setDiffHoldProgress(0);
          }
        }
      }
      raf = requestAnimationFrame(check);
    };
    raf = requestAnimationFrame(check);
    return () => cancelAnimationFrame(raf);
  }, [phase, startGame]);

  // Audio mute gesture (both hands up during gameplay)
  useEffect(() => {
    if (phase !== 'PLAYING') { muteHoldStartRef.current = 0; setMuteHoldProgress(0); return; }
    let raf: number;
    const check = () => {
      const lm = latestLandmarksRef.current;
      if (lm) {
        const lw = lm[15], rw = lm[16], ls = lm[11], rs = lm[12];
        const bothUp = lw.visibility > 0.4 && rw.visibility > 0.4 && ls.visibility > 0.4 && rs.visibility > 0.4 && lw.y < ls.y && rw.y < rs.y;
        if (bothUp) {
          if (muteHoldStartRef.current === 0) muteHoldStartRef.current = performance.now();
          const pct = Math.min(1, (performance.now() - muteHoldStartRef.current) / 1500);
          setMuteHoldProgress(pct);
          if (pct >= 1) {
            muteHoldStartRef.current = 0;
            setMuteHoldProgress(0);
            audioRef.current.muted = !audioRef.current.muted;
            setAudioMuted(audioRef.current.muted);
          }
        } else { muteHoldStartRef.current = 0; setMuteHoldProgress(0); }
      }
      raf = requestAnimationFrame(check);
    };
    raf = requestAnimationFrame(check);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  // Auto-init camera on START screen once scripts are ready
  useEffect(() => {
    if (scriptsLoaded && phase === 'START' && !poseRef.current && !initializingRef.current) {
      initMediaPipe();
    }
  }, [scriptsLoaded, phase, initMediaPipe]);

  const multiplier = Math.min(combo, 5);
  const progressBarColor = lightState === 'RED' ? 'bg-red-500' : lightState === 'YELLOW' ? 'bg-amber-400' : 'bg-emerald-400';
  const bgGradient = phase === 'PLAYING'
    ? lightState === 'RED' ? 'from-red-950 via-gray-950 to-gray-950'
      : lightState === 'YELLOW' ? 'from-amber-950 via-gray-950 to-gray-950'
        : 'from-emerald-950 via-gray-950 to-gray-950'
    : 'from-gray-950 via-gray-900 to-gray-950';

  const showWebcam = phase === 'PLAYING' || phase === 'DIFFICULTY';

  return (
    <div className={`fixed inset-0 bg-gradient-to-br ${bgGradient} text-white overflow-hidden transition-colors duration-500`}>
      {showElimFlash && <div className="fixed inset-0 bg-red-600 z-50 animate-pulse pointer-events-none" />}

      {/* Always-mounted video for MediaPipe -- positioned offscreen, NOT display:none */}
      <video
        ref={videoRef}
        style={{ position: 'absolute', width: 1, height: 1, top: -9999, left: -9999, opacity: 0 }}
        playsInline
        muted
        autoPlay
        width={640}
        height={480}
      />

      {/* Always-mounted canvas for skeleton drawing */}
      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        style={showWebcam ? undefined : { position: 'absolute', top: -9999, left: -9999, width: 1, height: 1 }}
        className={showWebcam ? 'absolute inset-0 w-full h-full z-10 pointer-events-none' : undefined}
      />

      {/* ── START ── */}
      {phase === 'START' && (
        <div className="flex flex-col items-center justify-center h-full px-8 relative">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-red-500/10 rounded-full blur-3xl" />

          <div className="relative z-10 text-center max-w-2xl">
            <div className="flex justify-center gap-4 mb-8">
              <div className="w-6 h-6 rounded-full bg-red-500 shadow-lg shadow-red-500/50" />
              <div className="w-6 h-6 rounded-full bg-amber-400 shadow-lg shadow-amber-400/50" />
              <div className="w-6 h-6 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50" />
            </div>

            <h1 className="text-6xl sm:text-7xl font-black tracking-tight mb-3">
              <span className="text-red-500">RED LIGHT</span>
              <span className="text-gray-500 mx-3">,</span>
              <span className="text-emerald-400">GREEN LIGHT</span>
            </h1>

            <p className="text-xl text-gray-400 mb-10 font-light">Freeze when the light turns red.</p>

            <div className="backdrop-blur-md bg-white/5 rounded-2xl border border-white/10 p-6 mb-10 text-left space-y-2">
              <p className="text-gray-300 text-sm flex items-start gap-3">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                Move only during Green Light.
              </p>
              <p className="text-gray-300 text-sm flex items-start gap-3">
                <span className="inline-block w-2 h-2 rounded-full bg-red-400 mt-1.5 shrink-0" />
                Freeze during Red Light.
              </p>
              <p className="text-gray-300 text-sm flex items-start gap-3">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                Reach the finish line to survive.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12">
              {[
                { label: 'High Score', value: stats.highScore.toLocaleString() },
                { label: 'Wins', value: stats.wins },
                { label: 'Games Played', value: stats.gamesPlayed },
                { label: 'Best Time', value: stats.bestSurvivalTime > 0 ? formatTime(stats.bestSurvivalTime) : '--' },
              ].map(s => (
                <div key={s.label} className="backdrop-blur-md bg-white/5 rounded-xl border border-white/10 p-4">
                  <div className="text-2xl font-bold text-white">{s.value}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            {initError && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {initError}
              </div>
            )}

            <div className="flex flex-col items-center gap-4">
              <div className="relative w-20 h-20">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
                  <circle
                    cx="40" cy="40" r="36" fill="none"
                    stroke={handRaised ? '#22c55e' : 'rgba(255,255,255,0.2)'}
                    strokeWidth="4" strokeLinecap="round"
                    strokeDasharray={`${holdProgress * 226} 226`}
                    className="transition-all duration-75"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-3xl">
                  {handRaised ? '\u270B' : '\u270A'}
                </div>
              </div>
              <p className={`text-sm transition-colors ${handRaised ? 'text-emerald-400' : 'text-gray-500'}`}>
                {handRaised ? 'Hold steady...' : 'Raise your hand to start'}
              </p>
              {!cameraReady && !initError && (
                <p className="text-xs text-gray-600 mt-2">
                  {scriptsLoaded ? 'Starting camera...' : 'Loading MediaPipe...'}
                </p>
              )}
              {cameraReady && !poseReady && (
                <p className="text-xs text-emerald-600 mt-2">Camera active - stand in view</p>
              )}
            </div>
          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-gray-600 text-xs tracking-widest uppercase">
            KinetoFun
          </div>
        </div>
      )}

      {/* ── LOADING ── */}
      {phase === 'LOADING' && (
        <div className="flex flex-col items-center justify-center h-full px-8">
          <div className="relative mb-8">
            <div className="w-24 h-24 border-4 border-emerald-500/30 rounded-full" />
            <div className="absolute inset-0 w-24 h-24 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          </div>

          <h2 className="text-2xl font-bold mb-3">Initializing Pose AI</h2>
          <p className="text-gray-400 text-center max-w-md mb-8">
            Please stand so your head, shoulders, and torso are visible.
          </p>

          <div className="relative w-40 h-56 opacity-30">
            <svg viewBox="0 0 100 140" className="w-full h-full">
              <circle cx="50" cy="15" r="10" fill="none" stroke="#22c55e" strokeWidth="2" />
              <line x1="50" y1="25" x2="50" y2="75" stroke="#22c55e" strokeWidth="2" />
              <line x1="50" y1="35" x2="20" y2="60" stroke="#22c55e" strokeWidth="2" />
              <line x1="50" y1="35" x2="80" y2="60" stroke="#22c55e" strokeWidth="2" />
              <line x1="50" y1="75" x2="30" y2="120" stroke="#22c55e" strokeWidth="2" />
              <line x1="50" y1="75" x2="70" y2="120" stroke="#22c55e" strokeWidth="2" />
              {[[50, 35], [20, 60], [80, 60], [50, 75], [30, 120], [70, 120]].map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="4" fill="#22c55e" />
              ))}
            </svg>
            <div className="absolute inset-0 animate-pulse bg-emerald-500/5 rounded-xl" />
          </div>

          {initError && (
            <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm max-w-md text-center">
              {initError}
            </div>
          )}

          <div className="mt-8 flex gap-3 text-sm text-gray-500">
            <span className={cameraReady ? 'text-emerald-400' : ''}>
              {cameraReady ? '\u2713' : '\u25CB'} Webcam
            </span>
            <span className={scriptsLoaded ? 'text-emerald-400' : ''}>
              {scriptsLoaded ? '\u2713' : '\u25CB'} MediaPipe
            </span>
            <span className={poseReady ? 'text-emerald-400' : ''}>
              {poseReady ? '\u2713' : '\u25CB'} Pose Tracking
            </span>
          </div>
        </div>
      )}

      {/* ── DIFFICULTY ── */}
      {phase === 'DIFFICULTY' && (
        <div className="flex flex-col items-center justify-center h-full px-8">
          <h2 className="text-3xl font-bold mb-2">Select Difficulty</h2>
          <p className="text-gray-400 mb-12 text-sm">Move your hand over an option and hold</p>

          <div className="flex gap-6 sm:gap-10">
            {(['EASY', 'NORMAL', 'HARD'] as Difficulty[]).map(d => {
              const isHovered = diffHover === d;
              const colors = {
                EASY: { ring: '#22c55e', bg: 'bg-emerald-500/10 border-emerald-500/30', text: 'text-emerald-400' },
                NORMAL: { ring: '#f59e0b', bg: 'bg-amber-500/10 border-amber-500/30', text: 'text-amber-400' },
                HARD: { ring: '#ef4444', bg: 'bg-red-500/10 border-red-500/30', text: 'text-red-400' },
              };
              const c = colors[d];
              const cfg = DIFFICULTY_CONFIGS[d];

              return (
                <div
                  key={d}
                  className={`relative flex flex-col items-center p-8 rounded-2xl border backdrop-blur-md transition-all duration-300 ${isHovered ? `${c.bg} scale-110` : 'bg-white/5 border-white/10 scale-100'}`}
                >
                  <div className="relative w-24 h-24 mb-4">
                    <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                      <circle cx="48" cy="48" r="42" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
                      {isHovered && (
                        <circle
                          cx="48" cy="48" r="42" fill="none"
                          stroke={c.ring} strokeWidth="4" strokeLinecap="round"
                          strokeDasharray={`${diffHoldProgress * 264} 264`}
                          className="transition-all duration-75"
                        />
                      )}
                    </svg>
                    <div className={`absolute inset-0 flex items-center justify-center text-2xl font-black ${c.text}`}>
                      {d}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 space-y-1 text-center">
                    <p>Green: {cfg.greenMin}-{cfg.greenMax}s</p>
                    <p>Red: {cfg.redMin}-{cfg.redMax}s</p>
                    <p>Sensitivity: {cfg.threshold * 100}%</p>
                  </div>
                  {stats.selectedDifficulty === d && (
                    <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">\u2713</div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-10 relative w-48 h-36 rounded-xl overflow-hidden border border-white/10">
            <video
              ref={el => {
                if (el && videoRef.current?.srcObject) el.srcObject = videoRef.current.srcObject;
              }}
              className="w-full h-full object-cover scale-x-[-1]"
              playsInline muted autoPlay
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </div>
        </div>
      )}

      {/* ── PLAYING ── */}
      {phase === 'PLAYING' && (
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <div className={`px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-300 ${
                lightState === 'GREEN' ? 'bg-emerald-500/20 text-emerald-400 shadow-lg shadow-emerald-500/20' :
                lightState === 'YELLOW' ? 'bg-amber-500/20 text-amber-400 shadow-lg shadow-amber-500/20' :
                'bg-red-500/20 text-red-400 shadow-lg shadow-red-500/20'
              }`}>
                {lightState === 'GREEN' ? 'MOVE!' : lightState === 'YELLOW' ? 'SLOW DOWN...' : 'FREEZE!'}
              </div>
              <div className="text-2xl font-mono font-bold tabular-nums">{countdown}s</div>
            </div>

            {combo > 0 && (
              <div className={`flex items-center gap-2 transition-all duration-300 ${showComboAnim ? 'scale-125' : 'scale-100'}`}>
                <span className="text-amber-400 font-bold text-lg">x{multiplier}</span>
                <span className="text-xs text-gray-500 uppercase">Combo</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              {muteHoldProgress > 0 && (
                <div className="w-8 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-white/50 rounded-full" style={{ width: `${muteHoldProgress * 100}%` }} />
                </div>
              )}
              <span className="text-xs text-gray-600">{audioMuted ? '\uD83D\uDD07' : '\uD83D\uDD0A'}</span>
            </div>
          </div>

          <div className="px-6 mb-2">
            <div className="h-3 bg-white/5 rounded-full overflow-hidden backdrop-blur-sm border border-white/5">
              <div
                className={`h-full rounded-full transition-all duration-200 ${progressBarColor}`}
                style={{ width: `${progress}%`, boxShadow: lightState === 'GREEN' ? '0 0 20px rgba(34,197,94,0.5)' : undefined }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-gray-600">
              <span>START</span>
              <span className="font-mono">{Math.floor(progress)}%</span>
              <span>FINISH</span>
            </div>
          </div>

          <div className="flex-1 relative mx-6 mb-4 rounded-2xl overflow-hidden border border-white/10">
            <video
              ref={el => {
                if (el && videoRef.current?.srcObject) el.srcObject = videoRef.current.srcObject;
              }}
              className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
              playsInline muted autoPlay
            />

            {/* Canvas is absolutely positioned here via CSS when showWebcam is true */}

            {lightState === 'RED' && (
              <div className="absolute inset-0 bg-red-900/20 border-4 border-red-500/50 rounded-2xl pointer-events-none animate-pulse z-20" />
            )}
            {lightState === 'GREEN' && (
              <div className="absolute inset-0 border-4 border-emerald-500/30 rounded-2xl pointer-events-none z-20" />
            )}

            {lightState === 'RED' && (
              <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-red-600/90 backdrop-blur-md px-8 py-3 rounded-xl z-30">
                <span className="text-2xl font-black tracking-wider text-white">FREEZE!</span>
              </div>
            )}

            {trackingLost && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm z-30">
                <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-amber-400 font-bold text-lg">TRACKING LOST</p>
                <p className="text-gray-400 text-sm mt-1">Please return to view</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between px-6 pb-4">
            <div className="backdrop-blur-md bg-white/5 rounded-xl border border-white/10 px-4 py-2">
              <span className="text-xs text-gray-500 uppercase mr-2">Difficulty</span>
              <span className={`font-bold text-sm ${difficulty === 'EASY' ? 'text-emerald-400' : difficulty === 'NORMAL' ? 'text-amber-400' : 'text-red-400'}`}>{difficulty}</span>
            </div>
            <div className="backdrop-blur-md bg-white/5 rounded-xl border border-white/10 px-4 py-2">
              <span className="text-xs text-gray-500 uppercase mr-2">Time</span>
              <span className="font-mono font-bold text-sm">{formatTime(survivalTime)}</span>
            </div>
            <div className="backdrop-blur-md bg-white/5 rounded-xl border border-white/10 px-4 py-2">
              <span className="text-xs text-gray-500 uppercase mr-2">Score</span>
              <span className="font-mono font-bold text-sm text-emerald-400">{score.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── VICTORY ── */}
      {phase === 'VICTORY' && (
        <div className="flex flex-col items-center justify-center h-full px-8 relative">
          <div className="absolute inset-0 bg-emerald-500/5" />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl" />

          <div className="relative z-10 text-center">
            <div className="text-7xl mb-6 animate-bounce">{'\u2B50'}</div>

            <h1 className="text-5xl sm:text-6xl font-black mb-2 text-emerald-400">YOU SURVIVED!</h1>

            {newHighScore && (
              <div className="inline-block px-4 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-sm font-bold mb-6 animate-pulse">
                NEW HIGH SCORE!
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto mt-8 mb-12">
              {[
                { label: 'Score', value: score.toLocaleString() },
                { label: 'Survival Time', value: formatTime(survivalTime) },
                { label: 'Max Combo', value: `x${multiplier}` },
                { label: 'Difficulty', value: difficulty },
              ].map(s => (
                <div key={s.label} className="backdrop-blur-md bg-white/5 rounded-xl border border-white/10 p-4">
                  <div className="text-xl font-bold">{s.value}</div>
                  <div className="text-xs text-gray-500 uppercase mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-col items-center gap-3">
              <div className="relative w-16 h-16">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                  <circle cx="32" cy="32" r="28" fill="none" stroke={handRaised ? '#22c55e' : 'rgba(255,255,255,0.15)'} strokeWidth="3" strokeLinecap="round" strokeDasharray={`${holdProgress * 176} 176`} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-2xl">{handRaised ? '\u270B' : '\u270A'}</div>
              </div>
              <p className={`text-sm ${handRaised ? 'text-emerald-400' : 'text-gray-500'}`}>
                {handRaised ? 'Hold steady...' : 'Raise your hand to play again'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── ELIMINATED ── */}
      {phase === 'ELIMINATED' && (
        <div className="flex flex-col items-center justify-center h-full px-8 relative">
          <div className="absolute inset-0 bg-red-500/5" />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-red-500/10 rounded-full blur-3xl" />

          <div className="relative z-10 text-center">
            <div className="text-7xl mb-6">{'\uD83D\uDED1'}</div>

            <h1 className="text-5xl sm:text-6xl font-black mb-2 text-red-500">ELIMINATED!</h1>
            <p className="text-gray-400 mb-8 text-lg">You moved during Red Light.</p>

            <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto mb-12">
              {[
                { label: 'Final Score', value: score.toLocaleString() },
                { label: 'Survival Time', value: formatTime(survivalTime) },
                { label: 'Difficulty', value: difficulty },
                { label: 'Best Score', value: stats.highScore.toLocaleString() },
              ].map(s => (
                <div key={s.label} className="backdrop-blur-md bg-white/5 rounded-xl border border-white/10 p-4">
                  <div className="text-xl font-bold">{s.value}</div>
                  <div className="text-xs text-gray-500 uppercase mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            {newHighScore && (
              <div className="inline-block px-4 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-sm font-bold mb-8 animate-pulse">
                NEW HIGH SCORE!
              </div>
            )}

            <div className="flex flex-col items-center gap-3">
              <div className="relative w-16 h-16">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                  <circle cx="32" cy="32" r="28" fill="none" stroke={handRaised ? '#ef4444' : 'rgba(255,255,255,0.15)'} strokeWidth="3" strokeLinecap="round" strokeDasharray={`${holdProgress * 176} 176`} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-2xl">{handRaised ? '\u270B' : '\u270A'}</div>
              </div>
              <p className={`text-sm ${handRaised ? 'text-red-400' : 'text-gray-500'}`}>
                {handRaised ? 'Hold steady...' : 'Raise your hand to play again'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
