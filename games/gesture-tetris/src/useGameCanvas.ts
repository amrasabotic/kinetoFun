import { useCallback } from 'react';
import type { GameState } from './gameLogic';
import {
  COLS, ROWS, VISIBLE_ROWS,
  pieceMatrix, ghostRow, cellColor, PIECE_COLORS,
} from './gameLogic';

const CELL_SIZE  = 30;
const BOARD_W    = COLS * CELL_SIZE;       // 300
const BOARD_H    = VISIBLE_ROWS * CELL_SIZE; // 600
const HIDDEN     = ROWS - VISIBLE_ROWS;    // 2 hidden rows at top

export const CANVAS_W = BOARD_W;
export const CANVAS_H = BOARD_H;

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function drawCell(
  ctx: CanvasRenderingContext2D,
  col: number,
  row: number,   // visible row (0 = top visible)
  color: string,
  alpha = 1,
  glow  = false,
) {
  const x = col * CELL_SIZE + 1;
  const y = row * CELL_SIZE + 1;
  const s = CELL_SIZE - 2;

  ctx.globalAlpha = alpha;

  if (glow) {
    ctx.shadowColor  = color;
    ctx.shadowBlur   = 12;
  }

  // Main fill
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, s, s, 3);
  ctx.fill();

  // Highlight (top-left edge)
  ctx.fillStyle = 'rgba(255,255,255,0.20)';
  ctx.beginPath();
  ctx.roundRect(x + 1, y + 1, s - 2, 6, 2);
  ctx.fill();

  if (glow) {
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur  = 0;
  }

  ctx.globalAlpha = 1;
}

export interface DrawPayload {
  state:    GameState;
  videoEl:  HTMLVideoElement | null;
}

export function useGameCanvas(canvasRef: React.RefObject<HTMLCanvasElement>) {
  return useCallback(({ state, videoEl }: DrawPayload) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth   = 1;
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * CELL_SIZE, 0);
      ctx.lineTo(c * CELL_SIZE, CANVAS_H);
      ctx.stroke();
    }
    for (let r = 0; r <= VISIBLE_ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * CELL_SIZE);
      ctx.lineTo(CANVAS_W, r * CELL_SIZE);
      ctx.stroke();
    }

    // Locked board cells
    for (let row = HIDDEN; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const cell = state.board[row][col];
        if (cell !== 0) {
          const visRow = row - HIDDEN;
          drawCell(ctx, col, visRow, cellColor(cell));
        }
      }
    }

    // Line-clear flash
    if (state.phase === 'lineClear') {
      const progress = state.lineClearAccum / 200;
      const alpha    = (1 - progress) * 0.7;
      // Find which rows were full (they're now cleared, so find rows that ARE now empty
      // and were the ones just cleared — we highlight the top 'lastCleared' non-empty
      // rows by just flashing the whole board tinted)
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }

    // Ghost piece
    if (state.phase === 'playing') {
      const gRow = ghostRow(state.board, state.current, state.currentPos);
      if (gRow !== state.currentPos.y) {
        const matrix = pieceMatrix(state.current);
        const color  = PIECE_COLORS[state.current.type];
        for (let r = 0; r < matrix.length; r++) {
          for (let c = 0; c < matrix[r].length; c++) {
            if (!matrix[r][c]) continue;
            const visRow = (gRow + r) - HIDDEN;
            if (visRow < 0 || visRow >= VISIBLE_ROWS) continue;
            drawCell(ctx, state.currentPos.x + c, visRow, color, 0.18);

            // Outline only
            ctx.strokeStyle = hexToRgba(color, 0.45);
            ctx.lineWidth   = 1.5;
            const x = (state.currentPos.x + c) * CELL_SIZE + 1;
            const y = visRow * CELL_SIZE + 1;
            ctx.beginPath();
            ctx.roundRect(x, y, CELL_SIZE - 2, CELL_SIZE - 2, 3);
            ctx.stroke();
          }
        }
      }
    }

    // Active piece
    if (state.phase !== 'gameOver') {
      const matrix = pieceMatrix(state.current);
      const color  = PIECE_COLORS[state.current.type];
      for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
          if (!matrix[r][c]) continue;
          const visRow = (state.currentPos.y + r) - HIDDEN;
          if (visRow < 0 || visRow >= VISIBLE_ROWS) continue;
          drawCell(ctx, state.currentPos.x + c, visRow, color, 1, true);
        }
      }
    }

    // Webcam thumbnail (bottom-right corner)
    if (videoEl && videoEl.readyState >= 2) {
      const TW = 90, TH = 67;
      const tx = CANVAS_W - TW - 6;
      const ty = CANVAS_H - TH - 6;
      ctx.save();
      ctx.translate(tx + TW / 2, ty + TH / 2);
      ctx.scale(-1, 1); // mirror
      ctx.drawImage(videoEl, -TW / 2, -TH / 2, TW, TH);
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth   = 1;
      ctx.strokeRect(tx, ty, TW, TH);
    }
  }, [canvasRef]);
}
