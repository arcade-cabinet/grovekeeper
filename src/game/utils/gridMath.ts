export interface GridPosition {
  col: number;
  row: number;
}

export interface WorldPosition {
  x: number;
  z: number;
}

export function gridToWorld(
  col: number,
  row: number,
  tileSize = 1,
): WorldPosition {
  return { x: col * tileSize, z: row * tileSize };
}

export function worldToGrid(
  x: number,
  z: number,
  tileSize = 1,
): GridPosition {
  return { col: Math.floor(x / tileSize), row: Math.floor(z / tileSize) };
}

export function isInBounds(pos: GridPosition, gridSize: number): boolean {
  return (
    pos.col >= 0 && pos.col < gridSize && pos.row >= 0 && pos.row < gridSize
  );
}

export function gridToIndex(
  col: number,
  row: number,
  gridSize: number,
): number {
  return row * gridSize + col;
}

export function indexToGrid(index: number, gridSize: number): GridPosition {
  return { col: index % gridSize, row: Math.floor(index / gridSize) };
}

export function tileCenterWorld(
  col: number,
  row: number,
  tileSize = 1,
): WorldPosition {
  return { x: col * tileSize + tileSize / 2, z: row * tileSize + tileSize / 2 };
}

export function gridDistance(a: GridPosition, b: GridPosition): number {
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
}

export function tilesInRadius(
  center: GridPosition,
  radius: number,
  gridSize: number,
): GridPosition[] {
  const result: GridPosition[] = [];
  for (let row = center.row - radius; row <= center.row + radius; row++) {
    for (let col = center.col - radius; col <= center.col + radius; col++) {
      if (isInBounds({ col, row }, gridSize)) {
        result.push({ col, row });
      }
    }
  }
  return result;
}
