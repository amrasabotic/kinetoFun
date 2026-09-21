// Simple gesture classifier from MediaPipe Hand landmarks (21 points).
// Returns one of: "fist", "open", "peace", "thumbs_up", "point", or null.

export type Gesture = "fist" | "open" | "peace" | "thumbs_up" | "point";

export const GESTURE_META: Record<Gesture, { label: string; emoji: string; hint: string }> = {
  fist: { label: "FIST", emoji: "👊", hint: "Close your right hand" },
  open: { label: "OPEN PALM", emoji: "🖐️", hint: "All five fingers open" },
  peace: { label: "PEACE", emoji: "✌️", hint: "Index + middle up" },
  thumbs_up: { label: "THUMBS UP", emoji: "👍", hint: "Thumb up, others closed" },
  point: { label: "POINT", emoji: "☝️", hint: "Index finger up" },
};

type Pt = { x: number; y: number; z?: number };

// Fingertip indices: thumb=4, index=8, middle=12, ring=16, pinky=20.
// PIP joints used as "is extended" reference: thumb IP=3, index PIP=6, middle PIP=10, ring PIP=14, pinky PIP=18.

function dist(a: Pt, b: Pt) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function classifyGesture(landmarks: Pt[]): Gesture | null {
  if (!landmarks || landmarks.length < 21) return null;
  const wrist = landmarks[0];

  // Normalize scale by hand size (wrist -> middle MCP)
  const handSize = dist(wrist, landmarks[9]) || 1;

  // Finger extended: tip is farther from wrist than PIP joint (in y/x distance).
  const fingerExtended = (tip: number, pip: number) =>
    dist(landmarks[tip], wrist) / handSize > dist(landmarks[pip], wrist) / handSize + 0.15;

  const index = fingerExtended(8, 6);
  const middle = fingerExtended(12, 10);
  const ring = fingerExtended(16, 14);
  const pinky = fingerExtended(20, 18);

  // Thumb: check horizontal extension relative to its MCP (point 2).
  const thumbTip = landmarks[4];
  const thumbMcp = landmarks[2];
  const indexMcp = landmarks[5];
  const thumbExtended = dist(thumbTip, indexMcp) / handSize > 0.5;
  // Thumbs up: thumb tip clearly above wrist (smaller y), other fingers folded
  const thumbUp = thumbTip.y < wrist.y - 0.15 && thumbExtended;

  const folded = !index && !middle && !ring && !pinky;

  if (folded && thumbUp) return "thumbs_up";
  if (folded && !thumbExtended) return "fist";
  if (index && middle && ring && pinky) return "open";
  if (index && middle && !ring && !pinky) return "peace";
  if (index && !middle && !ring && !pinky) return "point";
  return null;
}