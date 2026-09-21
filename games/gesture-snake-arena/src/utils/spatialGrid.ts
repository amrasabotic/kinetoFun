/**
 * Uniform spatial grid for efficient nearest-neighbor and collision queries.
 * Each cell is a flat list of { id, x, y } entries.
 */

export interface GridEntry {
  id: number;
  x: number;
  y: number;
}

export class SpatialGrid {
  private cells: Map<number, GridEntry[]> = new Map();
  readonly cellSize: number;
  private width: number;
  private cols: number;

  constructor(worldWidth: number, worldHeight: number, cellSize: number) {
    this.cellSize = cellSize;
    this.width = worldWidth;
    this.cols = Math.ceil(worldWidth / cellSize);
    // rows = Math.ceil(worldHeight / cellSize); (implicit)
  }

  clear() { this.cells.clear(); }

  private key(cx: number, cy: number): number {
    return cy * this.cols + cx;
  }

  insert(entry: GridEntry) {
    const cx = Math.floor(entry.x / this.cellSize);
    const cy = Math.floor(entry.y / this.cellSize);
    const k = this.key(cx, cy);
    let cell = this.cells.get(k);
    if (!cell) { cell = []; this.cells.set(k, cell); }
    cell.push(entry);
  }

  query(x: number, y: number, radius: number): GridEntry[] {
    const results: GridEntry[] = [];
    const minCX = Math.floor((x - radius) / this.cellSize);
    const maxCX = Math.floor((x + radius) / this.cellSize);
    const minCY = Math.floor((y - radius) / this.cellSize);
    const maxCY = Math.floor((y + radius) / this.cellSize);

    for (let cy = minCY; cy <= maxCY; cy++) {
      for (let cx = minCX; cx <= maxCX; cx++) {
        const cell = this.cells.get(this.key(cx, cy));
        if (cell) results.push(...cell);
      }
    }
    return results;
  }
}
