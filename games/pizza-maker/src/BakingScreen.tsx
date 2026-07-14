import React, { useRef, useState, useCallback, useEffect } from 'react';
import type { IngredientType, PizzaOrder, HandState } from './types';
import { INGREDIENT_COLORS, INGREDIENT_LABELS } from './types';
import { useHandTracking } from './useHandTracking';
import { PizzaPreview } from './OrderScreen';
import WebcamPreview from './WebcamPreview';

interface PlacedIngredient {
  id: string;
  type: IngredientType;
  x: number;
  y: number;
}

interface IngredientSource {
  type: IngredientType;
  x: number;
  y: number;
}

interface BakingScreenProps {
  order: PizzaOrder;
  onBake: (placed: PlacedIngredient[], score: number) => void;
}

const PIZZA_CENTER = { x: 0.5, y: 0.56 };
const PIZZA_RADIUS = 0.22;

// Keep all sources away from the very edges so hand tracking margins don't cut them off.
// x range 0.12–0.88, y kept off the top (0.14)
const INGREDIENT_SOURCES: IngredientSource[] = [
  { type: 'sauce',     x: 0.14, y: 0.14 },
  { type: 'cheese',    x: 0.31, y: 0.14 },
  { type: 'pepperoni', x: 0.50, y: 0.14 },
  { type: 'mushroom',  x: 0.69, y: 0.14 },
  { type: 'basil',     x: 0.86, y: 0.14 },
];

function computeScore(placed: PlacedIngredient[], order: PizzaOrder): number {
  const required = new Set(order.ingredients);
  const placedTypes = new Set(placed.map((p) => p.type));

  let totalScore = 0;
  const maxScore = required.size * 100;

  for (const ing of required) {
    if (!placedTypes.has(ing)) continue;
    if (ing === 'sauce' || ing === 'cheese') {
      // Base layers: any placement = full credit
      totalScore += 100;
    } else {
      // Toppings: 1 placement = 60%, 2 = 80%, 3+ = 100%
      const count = placed.filter((p) => p.type === ing).length;
      totalScore += count >= 3 ? 100 : count === 2 ? 80 : 60;
    }
  }

  // Light penalty per extra unwanted ingredient
  for (const ing of placedTypes) {
    if (!required.has(ing)) totalScore = Math.max(0, totalScore - 15);
  }

  if (maxScore === 0) return 100;
  return Math.max(0, Math.min(100, Math.round((totalScore / maxScore) * 100)));
}

export default function BakingScreen({ order, onBake }: BakingScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [placed, setPlaced] = useState<PlacedIngredient[]>([]);
  const [score, setScore] = useState(0);
  const [handState, setHandState] = useState<HandState>({
    cursorX: -1, cursorY: -1, isPinching: false, isTracking: false,
  });
  const [bakeHovered, setBakeHovered] = useState(false);

  const dragRef = useRef<{ type: IngredientType; x: number; y: number } | null>(null);
  const prevPinchRef = useRef(false);

  const handleHandUpdate = useCallback((state: HandState) => setHandState(state), []);
  useHandTracking(videoRef as React.RefObject<HTMLVideoElement | null>, handleHandUpdate, true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setScore(computeScore(placed, order));
  }, [placed, order]);

  // Main canvas draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrame: number;

    function draw() {
      if (!canvas || !ctx) return;
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      drawKitchenBackground(ctx, W, H);

      const cx = PIZZA_CENTER.x * W;
      const cy = PIZZA_CENTER.y * H;
      const r = PIZZA_RADIUS * Math.min(W, H);

      drawPizza(ctx, cx, cy, r, placed);
      drawIngredientShelf(ctx, W, H, r);

      // Dragged item
      if (dragRef.current) {
        const d = dragRef.current;
        ctx.globalAlpha = 0.88;
        ctx.save();
        drawDetailedIngredient(ctx, d.type, d.x * W, d.y * H, r * 0.5, true);
        ctx.restore();
        ctx.globalAlpha = 1;
      }

      // Cursor
      if (handState.isTracking && handState.cursorX >= 0) {
        const hx = handState.cursorX * W;
        const hy = handState.cursorY * H;
        ctx.beginPath();
        ctx.arc(hx, hy, handState.isPinching ? 10 : 14, 0, Math.PI * 2);
        ctx.fillStyle = handState.isPinching ? 'rgba(251,146,60,0.9)' : 'rgba(251,146,60,0.45)';
        ctx.fill();
        ctx.strokeStyle = '#c2410c';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        if (!handState.isPinching) {
          ctx.beginPath();
          ctx.arc(hx, hy, 3, 0, Math.PI * 2);
          ctx.fillStyle = '#c2410c';
          ctx.fill();
        }
      }

      animFrame = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animFrame);
  }, [placed, handState]);

  // Canvas resize
  useEffect(() => {
    function resize() {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    }
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Hand gesture logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.width;
    const H = canvas.height;
    const cx = PIZZA_CENTER.x * W;
    const cy = PIZZA_CENTER.y * H;
    const r = PIZZA_RADIUS * Math.min(W, H);
    const hx = handState.cursorX * W;
    const hy = handState.cursorY * H;

    // Bake button hover
    const bakeBtn = document.getElementById('bake-btn');
    if (bakeBtn) {
      const rect = bakeBtn.getBoundingClientRect();
      const over = hx >= rect.left && hx <= rect.right && hy >= rect.top && hy <= rect.bottom;
      setBakeHovered(over);
      if (handState.isPinching && !prevPinchRef.current && over) {
        onBake(placed, score);
        prevPinchRef.current = handState.isPinching;
        return;
      }
    }

    if (!handState.isTracking) { prevPinchRef.current = handState.isPinching; return; }

    // Pick up an ingredient:
    //   • on pinch-start while cursor is over a source bowl, OR
    //   • already pinching with no active drag and cursor enters a source bowl
    //   This means players can hover with two fingers already together and grab immediately.
    const tryPickup = (handState.isPinching && !prevPinchRef.current) ||
      (handState.isPinching && !dragRef.current);

    if (tryPickup) {
      for (const src of INGREDIENT_SOURCES) {
        const sx = src.x * W;
        const sy = src.y * H;
        if (Math.sqrt((hx - sx) ** 2 + (hy - sy) ** 2) < 52) {
          dragRef.current = { type: src.type, x: handState.cursorX, y: handState.cursorY };
          break;
        }
      }
    }

    // Update drag position while pinching
    if (handState.isPinching && dragRef.current) {
      dragRef.current = { ...dragRef.current, x: handState.cursorX, y: handState.cursorY };
    }

    // Drop on pinch release
    if (!handState.isPinching && prevPinchRef.current && dragRef.current) {
      const drag = dragRef.current;
      const dropX = drag.x * W;
      const dropY = drag.y * H;
      const distToCenter = Math.sqrt((dropX - cx) ** 2 + (dropY - cy) ** 2);

      if (distToCenter < r * 0.88) {
        if (drag.type === 'sauce' || drag.type === 'cheese') {
          setPlaced((prev) => {
            const filtered = prev.filter((p) => p.type !== drag.type);
            return [...filtered, { id: crypto.randomUUID(), type: drag.type, x: 0.5, y: 0.5 }];
          });
        } else {
          const relX = 0.5 + (dropX - cx) / (r * 1.5);
          const relY = 0.5 + (dropY - cy) / (r * 1.5);
          setPlaced((prev) => [
            ...prev,
            { id: crypto.randomUUID(), type: drag.type, x: relX, y: relY },
          ]);
        }
      }
      dragRef.current = null;
    }

    prevPinchRef.current = handState.isPinching;
  }, [handState, placed, score, onBake]);

  // Mouse fallback
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const W = canvas.width;
    const H = canvas.height;
    for (const src of INGREDIENT_SOURCES) {
      if (Math.sqrt((mx - src.x * W) ** 2 + (my - src.y * H) ** 2) < 52) {
        dragRef.current = { type: src.type, x: mx / W, y: my / H };
        break;
      }
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    dragRef.current = {
      ...dragRef.current,
      x: (e.clientX - rect.left) / canvas.width,
      y: (e.clientY - rect.top) / canvas.height,
    };
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const W = canvas.width;
    const H = canvas.height;
    const cx = PIZZA_CENTER.x * W;
    const cy = PIZZA_CENTER.y * H;
    const r = PIZZA_RADIUS * Math.min(W, H);
    const drag = dragRef.current;
    const dist = Math.sqrt((mx - cx) ** 2 + (my - cy) ** 2);
    if (dist < r * 0.88) {
      if (drag.type === 'sauce' || drag.type === 'cheese') {
        setPlaced((prev) => [
          ...prev.filter((p) => p.type !== drag.type),
          { id: crypto.randomUUID(), type: drag.type, x: 0.5, y: 0.5 },
        ]);
      } else {
        setPlaced((prev) => [
          ...prev,
          { id: crypto.randomUUID(), type: drag.type, x: 0.5 + (mx - cx) / (r * 1.5), y: 0.5 + (my - cy) / (r * 1.5) },
        ]);
      }
    }
    dragRef.current = null;
  }, []);

  const placedTypes = new Set(placed.map((p) => p.type));

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: '#2d1b0e' }}>
      <video ref={videoRef} className="hidden" playsInline muted />

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-2.5 z-20 border-b border-orange-900/60"
        style={{ background: 'linear-gradient(180deg, #1a0d05 0%, #2d1b0e 100%)' }}>
        <div className="flex items-center gap-3">
          <span className="text-orange-200 font-black text-lg">Baking:</span>
          <span className="text-red-400 font-black text-lg">{order.name}</span>
        </div>
        {/* Score meter */}
        <div className="flex items-center gap-3">
          <span className="text-orange-300 text-sm font-bold">Score</span>
          <div className="relative w-44 h-5 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
            <div className="absolute inset-0 opacity-20"
              style={{ background: 'repeating-linear-gradient(90deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 11px)' }} />
            <div className="h-full rounded-full transition-all duration-500 relative"
              style={{
                width: `${score}%`,
                background: score >= 80
                  ? 'linear-gradient(90deg, #22c55e, #4ade80)'
                  : score >= 50
                  ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                  : 'linear-gradient(90deg, #ef4444, #f87171)',
              }}>
              <div className="absolute inset-0 opacity-30 rounded-full"
                style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, transparent 100%)' }} />
            </div>
          </div>
          <span className="text-xl font-black w-14 text-right"
            style={{ color: score >= 80 ? '#4ade80' : score >= 50 ? '#fbbf24' : '#f87171' }}>
            {score}%
          </span>
        </div>

        <button
          id="bake-btn"
          onClick={() => onBake(placed, score)}
          className={`px-6 py-2.5 text-white font-black rounded-full transition-all duration-150 border-b-4 text-base ${
            bakeHovered
              ? 'bg-orange-400 border-orange-600 scale-105 shadow-lg shadow-orange-500/40'
              : 'bg-orange-500 border-orange-700 hover:bg-orange-400'
          }`}
        >
          Bake Pizza!
        </button>
      </div>

      {/* Canvas area */}
      <div className="flex flex-1 overflow-hidden">
        <div ref={containerRef} className="flex-1 relative">
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
            style={{ cursor: dragRef.current ? 'grabbing' : 'crosshair' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          />
        </div>

        {/* Right sidebar: order reference */}
        <div className="w-56 shrink-0 flex flex-col gap-3 p-3 overflow-y-auto border-l border-orange-900/40"
          style={{ background: 'linear-gradient(180deg, #1a0d05 0%, #2d1b0e 100%)' }}>
          <p className="text-orange-300 font-black text-sm uppercase tracking-wider text-center">Target Pizza</p>
          <div className="flex justify-center">
            <PizzaPreview ingredients={order.ingredients} size={130} />
          </div>
          <div className="flex flex-col gap-1.5 mt-1">
            {order.ingredients.map((ing) => {
              const count = placed.filter((p) => p.type === ing).length;
              const done = count > 0;
              return (
                <div key={ing} className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${
                  done ? 'bg-green-900/40 border border-green-700/50' : 'bg-gray-900/50 border border-gray-700/30'
                }`}>
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: INGREDIENT_COLORS[ing] }} />
                  <span className={`text-xs font-bold flex-1 ${done ? 'text-green-300' : 'text-gray-400'}`}>
                    {INGREDIENT_LABELS[ing]}
                  </span>
                  {done && <span className="text-green-400 text-xs">✓</span>}
                </div>
              );
            })}
          </div>
          {/* Tip */}
          <div className="mt-auto bg-amber-900/30 border border-amber-700/40 rounded-xl p-3">
            <p className="text-amber-300 text-xs font-bold mb-1">Tip</p>
            <p className="text-amber-200/70 text-xs leading-relaxed">
              Drag ingredients from the shelf onto the pizza. Start with sauce, then cheese, then toppings!
            </p>
          </div>
        </div>
      </div>

      <WebcamPreview videoRef={videoRef as React.RefObject<HTMLVideoElement | null>} handState={handState} />
    </div>
  );
}

// ─── Canvas drawing helpers ───────────────────────────────────────────────────

function drawKitchenBackground(ctx: CanvasRenderingContext2D, W: number, H: number) {
  // Floor / counter
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#1a0d05');
  grad.addColorStop(0.22, '#2d1b0e');
  grad.addColorStop(0.22, '#5c3010');
  grad.addColorStop(0.28, '#7a4015');
  grad.addColorStop(1, '#4a2a0a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Tile grid on counter
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  const tileSize = 60;
  for (let x = 0; x < W; x += tileSize) {
    ctx.beginPath(); ctx.moveTo(x, H * 0.27); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = H * 0.27; y < H; y += tileSize * 0.7) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // Wooden shelf bar (ingredient shelf background)
  const shelfGrad = ctx.createLinearGradient(0, 0, 0, H * 0.23);
  shelfGrad.addColorStop(0, '#3d2006');
  shelfGrad.addColorStop(1, '#2a1404');
  ctx.fillStyle = shelfGrad;
  ctx.fillRect(0, 0, W, H * 0.23);

  // Wood grain lines on shelf
  ctx.strokeStyle = 'rgba(255,200,100,0.06)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(0, H * 0.03 + i * 12);
    ctx.lineTo(W, H * 0.05 + i * 12);
    ctx.stroke();
  }

  // Shelf bottom edge
  const shelfEdgeGrad = ctx.createLinearGradient(0, H * 0.22, 0, H * 0.27);
  shelfEdgeGrad.addColorStop(0, '#8B5010');
  shelfEdgeGrad.addColorStop(1, '#6a3a0c');
  ctx.fillStyle = shelfEdgeGrad;
  ctx.fillRect(0, H * 0.22, W, H * 0.05);

  // Shelf highlight edge
  ctx.fillStyle = 'rgba(255,180,80,0.15)';
  ctx.fillRect(0, H * 0.22, W, 3);

  // Background wall with brick texture hint
  ctx.fillStyle = 'rgba(60,20,5,0.4)';
  ctx.fillRect(0, 0, W, H * 0.02);

  // Counter highlight (top surface)
  const counterHighlight = ctx.createLinearGradient(0, H * 0.27, 0, H * 0.32);
  counterHighlight.addColorStop(0, 'rgba(255,200,100,0.08)');
  counterHighlight.addColorStop(1, 'transparent');
  ctx.fillStyle = counterHighlight;
  ctx.fillRect(0, H * 0.27, W, H * 0.05);

  // Ambient light glow above pizza
  const pizzaCX = PIZZA_CENTER.x * W;
  const pizzaCY = PIZZA_CENTER.y * H;
  const glow = ctx.createRadialGradient(pizzaCX, pizzaCY - 40, 10, pizzaCX, pizzaCY - 40, 200);
  glow.addColorStop(0, 'rgba(255,200,80,0.08)');
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
}

function drawPizza(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  placed: PlacedIngredient[]
) {
  const placedTypes = new Set(placed.map((p) => p.type));

  // Drop shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 10;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#c8883a';
  ctx.fill();
  ctx.restore();

  // Outer crust ring
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  const crustGrad = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, r * 0.3, cx, cy, r);
  crustGrad.addColorStop(0, '#e8a84a');
  crustGrad.addColorStop(0.7, '#d4952e');
  crustGrad.addColorStop(1, '#b07020');
  ctx.fillStyle = crustGrad;
  ctx.fill();

  // Crust texture bumps
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    const bx = cx + (r * 0.9) * Math.cos(angle);
    const by = cy + (r * 0.9) * Math.sin(angle);
    ctx.beginPath();
    ctx.arc(bx, by, r * 0.045, 0, Math.PI * 2);
    ctx.fillStyle = '#bf8028';
    ctx.fill();
  }

  // Dough
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.82, 0, Math.PI * 2);
  const doughGrad = ctx.createRadialGradient(cx - r * 0.15, cy - r * 0.15, r * 0.1, cx, cy, r * 0.82);
  doughGrad.addColorStop(0, '#f8d882');
  doughGrad.addColorStop(1, '#e8c060');
  ctx.fillStyle = doughGrad;
  ctx.fill();

  // Sauce layer (or guideline)
  if (placedTypes.has('sauce')) {
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.73, 0, Math.PI * 2);
    const sauceGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.73);
    sauceGrad.addColorStop(0, '#d94040');
    sauceGrad.addColorStop(0.6, '#c0392b');
    sauceGrad.addColorStop(1, '#a83020');
    ctx.fillStyle = sauceGrad;
    ctx.fill();
    // Sauce texture swirl
    ctx.save();
    ctx.globalAlpha = 0.15;
    for (let i = 0; i < 3; i++) {
      const sr = r * (0.2 + i * 0.18);
      ctx.beginPath();
      ctx.arc(cx, cy, sr, 0, Math.PI * 1.8);
      ctx.strokeStyle = '#ff6644';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.restore();
  } else {
    // Dashed guideline
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.73, 0, Math.PI * 2);
    ctx.setLineDash([10, 6]);
    ctx.strokeStyle = 'rgba(192,57,43,0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);
    // Label
    ctx.fillStyle = 'rgba(220,80,60,0.6)';
    ctx.font = `bold ${r * 0.1}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Spread sauce here', cx, cy - r * 0.28);
    ctx.restore();
  }

  // Cheese layer
  if (placedTypes.has('cheese')) {
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.65, 0, Math.PI * 2);
    const cheeseGrad = ctx.createRadialGradient(cx - r * 0.1, cy - r * 0.1, r * 0.05, cx, cy, r * 0.65);
    cheeseGrad.addColorStop(0, '#ffd060');
    cheeseGrad.addColorStop(0.5, '#f5a623');
    cheeseGrad.addColorStop(1, '#e8960a');
    ctx.fillStyle = cheeseGrad;
    ctx.globalAlpha = 0.95;
    ctx.fill();
    ctx.globalAlpha = 1;
    // Cheese blobs
    ctx.save();
    ctx.globalAlpha = 0.35;
    const blobs = [[0.8, -0.3], [-0.7, 0.2], [0.2, 0.8], [-0.4, -0.7]];
    for (const [bx, by] of blobs) {
      ctx.beginPath();
      ctx.ellipse(cx + bx * r * 0.4, cy + by * r * 0.4, r * 0.18, r * 0.12, Math.atan2(by, bx), 0, Math.PI * 2);
      ctx.fillStyle = '#ffd060';
      ctx.fill();
    }
    ctx.restore();
  }

  // Topping placement ring guideline
  if (!placedTypes.has('pepperoni') && !placedTypes.has('mushroom') && !placedTypes.has('basil')) {
    if (placedTypes.has('cheese') || placedTypes.has('sauce')) {
      ctx.save();
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = `bold ${r * 0.08}px system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Place toppings inside', cx, cy + r * 0.2);
      ctx.restore();
    }
  }

  // Draw placed toppings
  for (const p of placed) {
    if (p.type === 'sauce' || p.type === 'cheese') continue;
    const tx = cx + (p.x - 0.5) * r * 1.5;
    const ty = cy + (p.y - 0.5) * r * 1.5;
    drawDetailedIngredient(ctx, p.type, tx, ty, r, false);
  }

  // Sheen highlight
  const sheen = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.05, cx - r * 0.2, cy - r * 0.25, r * 0.55);
  sheen.addColorStop(0, 'rgba(255,255,255,0.12)');
  sheen.addColorStop(1, 'transparent');
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = sheen;
  ctx.fill();
}

function drawIngredientShelf(ctx: CanvasRenderingContext2D, W: number, H: number, pizzaR: number) {
  for (const src of INGREDIENT_SOURCES) {
    const x = src.x * W;
    const y = src.y * H;
    const bowlR = 36;

    // Bowl shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;

    // Bowl body
    ctx.beginPath();
    ctx.arc(x, y, bowlR, 0, Math.PI * 2);
    const bowlGrad = ctx.createRadialGradient(x - 8, y - 8, 4, x, y, bowlR);
    bowlGrad.addColorStop(0, '#fff');
    bowlGrad.addColorStop(1, '#e8e0d8');
    ctx.fillStyle = bowlGrad;
    ctx.fill();
    ctx.restore();

    // Bowl rim
    ctx.beginPath();
    ctx.arc(x, y, bowlR, 0, Math.PI * 2);
    ctx.strokeStyle = INGREDIENT_COLORS[src.type];
    ctx.lineWidth = 3;
    ctx.stroke();

    // Inner fill
    ctx.beginPath();
    ctx.arc(x, y, bowlR * 0.78, 0, Math.PI * 2);
    ctx.fillStyle = INGREDIENT_COLORS[src.type];
    ctx.globalAlpha = 0.2;
    ctx.fill();
    ctx.globalAlpha = 1;

    // Detailed ingredient icon
    drawDetailedIngredient(ctx, src.type, x, y, pizzaR * 0.55, true);

    // Label
    ctx.fillStyle = 'rgba(255,230,180,0.9)';
    ctx.font = `bold ${Math.max(10, W * 0.01)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(INGREDIENT_LABELS[src.type], x, y + bowlR + 5);
  }
}

function drawDetailedIngredient(
  ctx: CanvasRenderingContext2D,
  type: IngredientType,
  x: number,
  y: number,
  r: number,
  isSource: boolean
) {
  const s = isSource ? r * 0.22 : r * 0.13;
  ctx.save();
  ctx.translate(x, y);

  switch (type) {
    case 'sauce': {
      // Ladle/blob of tomato sauce
      ctx.beginPath();
      ctx.arc(0, 0, s * 1.1, 0, Math.PI * 2);
      const sg = ctx.createRadialGradient(-s * 0.3, -s * 0.3, s * 0.1, 0, 0, s * 1.1);
      sg.addColorStop(0, '#ff6644');
      sg.addColorStop(0.5, '#e03020');
      sg.addColorStop(1, '#a02010');
      ctx.fillStyle = sg;
      ctx.fill();
      // Shine
      ctx.beginPath();
      ctx.ellipse(-s * 0.3, -s * 0.35, s * 0.35, s * 0.2, -0.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fill();
      // Seed dots
      ctx.fillStyle = 'rgba(255,220,180,0.6)';
      for (const [ox, oy] of [[0, -s * 0.3], [s * 0.3, s * 0.1], [-s * 0.3, s * 0.2]]) {
        ctx.beginPath();
        ctx.ellipse(ox, oy, s * 0.07, s * 0.12, 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'cheese': {
      // Shredded cheese pile
      const cheesePieces = [
        [0, 0, s * 1.0, s * 0.35, -0.2],
        [-s * 0.5, -s * 0.3, s * 0.8, s * 0.28, 0.4],
        [s * 0.4, -s * 0.2, s * 0.9, s * 0.3, -0.5],
        [-s * 0.3, s * 0.3, s * 0.85, s * 0.3, 0.2],
        [s * 0.2, s * 0.35, s * 0.7, s * 0.25, -0.3],
      ];
      for (const [px, py, rx, ry, rot] of cheesePieces) {
        ctx.beginPath();
        ctx.ellipse(px, py, rx, ry, rot, 0, Math.PI * 2);
        const cg = ctx.createLinearGradient(px - rx, py, px + rx, py);
        cg.addColorStop(0, '#ffd060');
        cg.addColorStop(0.5, '#f5a623');
        cg.addColorStop(1, '#e89010');
        ctx.fillStyle = cg;
        ctx.fill();
        ctx.strokeStyle = '#d4840a';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
      break;
    }
    case 'pepperoni': {
      // Pepperoni slice
      ctx.beginPath();
      ctx.arc(0, 0, s * 1.05, 0, Math.PI * 2);
      const pg = ctx.createRadialGradient(-s * 0.2, -s * 0.2, s * 0.1, 0, 0, s * 1.05);
      pg.addColorStop(0, '#c84040');
      pg.addColorStop(0.4, '#a02020');
      pg.addColorStop(1, '#701010');
      ctx.fillStyle = pg;
      ctx.fill();
      // Edge ring
      ctx.beginPath();
      ctx.arc(0, 0, s * 1.05, 0, Math.PI * 2);
      ctx.strokeStyle = '#601010';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // White fat dots
      const dots = [[-s * 0.35, -s * 0.35], [s * 0.35, -s * 0.15], [-s * 0.1, s * 0.4], [s * 0.3, s * 0.3], [-s * 0.4, s * 0.1]];
      for (const [dx, dy] of dots) {
        ctx.beginPath();
        ctx.arc(dx, dy, s * 0.11, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,220,200,0.75)';
        ctx.fill();
      }
      // Shine
      ctx.beginPath();
      ctx.ellipse(-s * 0.25, -s * 0.3, s * 0.3, s * 0.18, -0.6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fill();
      break;
    }
    case 'mushroom': {
      // Mushroom cap + stem
      // Stem
      ctx.beginPath();
      ctx.roundRect(-s * 0.22, s * 0.1, s * 0.44, s * 0.65, s * 0.1);
      const stemG = ctx.createLinearGradient(-s * 0.22, 0, s * 0.22, 0);
      stemG.addColorStop(0, '#c8a060');
      stemG.addColorStop(0.5, '#e8c880');
      stemG.addColorStop(1, '#b89050');
      ctx.fillStyle = stemG;
      ctx.fill();
      // Gills under cap
      ctx.save();
      ctx.globalAlpha = 0.4;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * s * 0.08, s * 0.12);
        ctx.lineTo(i * s * 0.08, s * 0.55);
        ctx.strokeStyle = '#906030';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.restore();
      // Cap
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 1.05, s * 0.7, 0, Math.PI, 0);
      const capG = ctx.createRadialGradient(-s * 0.2, -s * 0.25, s * 0.1, 0, 0, s * 1.05);
      capG.addColorStop(0, '#d4a055');
      capG.addColorStop(0.5, '#b07828');
      capG.addColorStop(1, '#855518');
      ctx.fillStyle = capG;
      ctx.fill();
      ctx.closePath();
      // Cap underside
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 1.05, s * 0.18, 0, 0, Math.PI);
      ctx.fillStyle = '#c8a060';
      ctx.fill();
      // Cap shine
      ctx.beginPath();
      ctx.ellipse(-s * 0.25, -s * 0.4, s * 0.35, s * 0.18, -0.3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fill();
      break;
    }
    case 'basil': {
      // Basil leaf
      const drawLeaf = (rx: number, ry: number, rot: number, color: string) => {
        ctx.save();
        ctx.rotate(rot);
        ctx.beginPath();
        ctx.moveTo(0, -ry);
        ctx.bezierCurveTo(rx, -ry * 0.5, rx * 1.1, ry * 0.3, 0, ry);
        ctx.bezierCurveTo(-rx * 1.1, ry * 0.3, -rx, -ry * 0.5, 0, -ry);
        ctx.fillStyle = color;
        ctx.fill();
        // Midrib
        ctx.beginPath();
        ctx.moveTo(0, -ry);
        ctx.lineTo(0, ry);
        ctx.strokeStyle = '#1a6b35';
        ctx.lineWidth = 0.8;
        ctx.stroke();
        // Veins
        ctx.save();
        ctx.globalAlpha = 0.4;
        for (let i = -1; i <= 1; i += 2) {
          ctx.beginPath();
          ctx.moveTo(0, -ry * 0.2);
          ctx.lineTo(i * rx * 0.6, ry * 0.2);
          ctx.strokeStyle = '#1a6b35';
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
        ctx.restore();
        // Shine
        ctx.beginPath();
        ctx.ellipse(-rx * 0.25, -ry * 0.3, rx * 0.3, ry * 0.2, -0.3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fill();
        ctx.restore();
      };
      drawLeaf(s * 0.75, s * 1.1, -0.3, '#2ecc71');
      ctx.save();
      ctx.translate(s * 0.6, -s * 0.1);
      drawLeaf(s * 0.55, s * 0.82, 0.8, '#27ae60');
      ctx.restore();
      ctx.save();
      ctx.translate(-s * 0.55, -s * 0.05);
      drawLeaf(s * 0.5, s * 0.75, -1.0, '#1e8449');
      ctx.restore();
      break;
    }
  }

  ctx.restore();
}
