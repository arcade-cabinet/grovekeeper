/**
 * Tests for hedge maze placement system.
 * References GAME_SPEC.md Garden Labyrinth section.
 */
import {
  generateMaze,
  mazeToHedgePieces,
  placeMazeDecorations,
} from "./hedgePlacement";

describe("hedgePlacement", () => {
  describe("generateMaze", () => {
    it("generates a 12x12 maze by default", () => {
      const maze = generateMaze(42);
      expect(maze.size).toBe(12);
      expect(maze.grid.length).toBe(12);
      expect(maze.grid[0].length).toBe(12);
    });

    it("generates a custom-sized maze", () => {
      const maze = generateMaze(42, 8);
      expect(maze.size).toBe(8);
      expect(maze.grid.length).toBe(8);
    });

    it("marks all cells as visited (fully connected)", () => {
      const maze = generateMaze(42);
      for (let x = 0; x < maze.size; x++) {
        for (let z = 0; z < maze.size; z++) {
          expect(maze.grid[x][z].visited).toBe(true);
        }
      }
    });

    it("clears center 2x2 for reward area", () => {
      const maze = generateMaze(42);
      const { centerX, centerZ } = maze;
      for (let dx = 0; dx < 2; dx++) {
        for (let dz = 0; dz < 2; dz++) {
          expect(maze.grid[centerX + dx][centerZ + dz].isCenter).toBe(true);
        }
      }
    });

    it("removes walls between center cells", () => {
      const maze = generateMaze(42);
      const { centerX: cx, centerZ: cz } = maze;
      // East wall of top-left center should be removed
      expect(maze.grid[cx][cz].walls.east).toBe(false);
      // West wall of top-right center should be removed
      expect(maze.grid[cx + 1][cz].walls.west).toBe(false);
    });

    it("is deterministic for same seed", () => {
      const a = generateMaze(42);
      const b = generateMaze(42);
      for (let x = 0; x < a.size; x++) {
        for (let z = 0; z < a.size; z++) {
          expect(a.grid[x][z].walls).toEqual(b.grid[x][z].walls);
        }
      }
    });

    it("produces different mazes for different seeds", () => {
      const a = generateMaze(42);
      const b = generateMaze(999);
      // Check that at least one wall differs
      let hasDifference = false;
      for (let x = 0; x < a.size && !hasDifference; x++) {
        for (let z = 0; z < a.size && !hasDifference; z++) {
          const aw = a.grid[x][z].walls;
          const bw = b.grid[x][z].walls;
          if (
            aw.north !== bw.north ||
            aw.south !== bw.south ||
            aw.east !== bw.east ||
            aw.west !== bw.west
          ) {
            hasDifference = true;
          }
        }
      }
      expect(hasDifference).toBe(true);
    });
  });

  describe("generateMaze — solvability (Spec §17.5)", () => {
    /**
     * A recursive-backtracker maze is a spanning tree over the grid, which
     * means every cell is reachable from every other cell (perfect maze).
     * BFS from [0][0] must visit all N² cells.
     */
    it("maze is solvable — all cells reachable from (0,0) via BFS", () => {
      const maze = generateMaze(42);
      const visited = new Set<string>();
      const queue: [number, number][] = [[0, 0]];
      visited.add("0,0");

      while (queue.length > 0) {
        const [x, z] = queue.shift()!;
        const cell = maze.grid[x][z];

        if (!cell.walls.north && z > 0 && !visited.has(`${x},${z - 1}`)) {
          visited.add(`${x},${z - 1}`);
          queue.push([x, z - 1]);
        }
        if (!cell.walls.south && z < maze.size - 1 && !visited.has(`${x},${z + 1}`)) {
          visited.add(`${x},${z + 1}`);
          queue.push([x, z + 1]);
        }
        if (!cell.walls.west && x > 0 && !visited.has(`${x - 1},${z}`)) {
          visited.add(`${x - 1},${z}`);
          queue.push([x - 1, z]);
        }
        if (!cell.walls.east && x < maze.size - 1 && !visited.has(`${x + 1},${z}`)) {
          visited.add(`${x + 1},${z}`);
          queue.push([x + 1, z]);
        }
      }

      expect(visited.size).toBe(maze.size * maze.size);
    });

    it("center cell (centerX, centerZ) is reachable from (0,0) via BFS", () => {
      const maze = generateMaze(42);
      const { centerX, centerZ } = maze;
      const target = `${centerX},${centerZ}`;

      const visited = new Set<string>();
      const queue: [number, number][] = [[0, 0]];
      visited.add("0,0");

      while (queue.length > 0) {
        const [x, z] = queue.shift()!;
        const cell = maze.grid[x][z];

        if (!cell.walls.north && z > 0 && !visited.has(`${x},${z - 1}`)) {
          visited.add(`${x},${z - 1}`);
          queue.push([x, z - 1]);
        }
        if (!cell.walls.south && z < maze.size - 1 && !visited.has(`${x},${z + 1}`)) {
          visited.add(`${x},${z + 1}`);
          queue.push([x, z + 1]);
        }
        if (!cell.walls.west && x > 0 && !visited.has(`${x - 1},${z}`)) {
          visited.add(`${x - 1},${z}`);
          queue.push([x - 1, z]);
        }
        if (!cell.walls.east && x < maze.size - 1 && !visited.has(`${x + 1},${z}`)) {
          visited.add(`${x + 1},${z}`);
          queue.push([x + 1, z]);
        }
      }

      expect(visited.has(target)).toBe(true);
    });

    it("center cell is reachable across multiple seeds", () => {
      // Verify center reachability is not seed-specific
      const seeds = [1, 12345, 999999, 0xdeadbeef];
      for (const seed of seeds) {
        const maze = generateMaze(seed);
        const { centerX, centerZ } = maze;
        const target = `${centerX},${centerZ}`;
        const visited = new Set<string>();
        const queue: [number, number][] = [[0, 0]];
        visited.add("0,0");
        while (queue.length > 0) {
          const [x, z] = queue.shift()!;
          const cell = maze.grid[x][z];
          if (!cell.walls.north && z > 0 && !visited.has(`${x},${z - 1}`)) { visited.add(`${x},${z - 1}`); queue.push([x, z - 1]); }
          if (!cell.walls.south && z < maze.size - 1 && !visited.has(`${x},${z + 1}`)) { visited.add(`${x},${z + 1}`); queue.push([x, z + 1]); }
          if (!cell.walls.west && x > 0 && !visited.has(`${x - 1},${z}`)) { visited.add(`${x - 1},${z}`); queue.push([x - 1, z]); }
          if (!cell.walls.east && x < maze.size - 1 && !visited.has(`${x + 1},${z}`)) { visited.add(`${x + 1},${z}`); queue.push([x + 1, z]); }
        }
        expect(visited.has(target)).toBe(true);
      }
    });
  });

  describe("mazeToHedgePieces", () => {
    it("produces hedge pieces from a maze", () => {
      const maze = generateMaze(42);
      const pieces = mazeToHedgePieces(maze, 42);
      expect(pieces.length).toBeGreaterThan(0);
    });

    it("all pieces have valid model paths and rotations", () => {
      const maze = generateMaze(42);
      const pieces = mazeToHedgePieces(maze, 42);
      const validTypes = new Set(["basic", "diagonal", "round", "slope", "triangle"]);
      for (const piece of pieces) {
        // Model path follows hedges/<type>/<type>_<size>.glb or hedges/junction/<type>/<id>.glb
        expect(piece.modelPath).toMatch(/^hedges\/[a-z]+\/.+\.glb$/);
        expect([0, 90, 180, 270]).toContain(piece.rotation);
        expect(validTypes.has(piece.pieceType)).toBe(true);
      }
    });

    it("includes both straight wall pieces and corner fill pieces", () => {
      const maze = generateMaze(42);
      const pieces = mazeToHedgePieces(maze, 42);
      const hasBasicOrDiag = pieces.some((p) => p.pieceType === "basic" || p.pieceType === "diagonal");
      const hasRoundOrTri = pieces.some((p) => p.pieceType === "round" || p.pieceType === "triangle");
      expect(hasBasicOrDiag).toBe(true);
      expect(hasRoundOrTri).toBe(true);
    });

    it("is deterministic for same seed", () => {
      const maze = generateMaze(42);
      const a = mazeToHedgePieces(maze, 42);
      const b = mazeToHedgePieces(maze, 42);
      expect(a).toEqual(b);
    });

    /**
     * For a 12×12 perfect maze (spanning tree), ~169 wall segment pieces are
     * placed in Phase 1, plus ~80-150 corner/junction fill pieces in Phase 2.
     * Expected total ≈ 250-320 pieces.
     */
    it("piece count is in correct range for a 12x12 maze", () => {
      const maze = generateMaze(42);
      const pieces = mazeToHedgePieces(maze, 42);
      // Minimum: wall segments alone guarantee well above zero.
      expect(pieces.length).toBeGreaterThanOrEqual(120);
      // Maximum: wall segments (~312) + corner fills (~169 vertices × max 1 piece each).
      expect(pieces.length).toBeLessThanOrEqual(500);
    });
  });

  describe("placeMazeDecorations", () => {
    it("places center reward decorations", () => {
      const maze = generateMaze(42);
      const decorations = placeMazeDecorations(maze, 42);
      const centerDeco = decorations.filter(
        (d) => d.modelPath.includes("fountain"),
      );
      expect(centerDeco.length).toBeGreaterThanOrEqual(1);
    });

    it("places bench decorations at center", () => {
      const maze = generateMaze(42);
      const decorations = placeMazeDecorations(maze, 42);
      const benches = decorations.filter((d) =>
        d.modelPath.includes("bench"),
      );
      expect(benches.length).toBe(2);
    });

    it("places decorations at dead ends", () => {
      const maze = generateMaze(42);
      const decorations = placeMazeDecorations(maze, 42);
      // There should be at least some decorations beyond the center 3
      expect(decorations.length).toBeGreaterThan(3);
    });

    it("all decorations have valid model paths", () => {
      const maze = generateMaze(42);
      const decorations = placeMazeDecorations(maze, 42);
      for (const deco of decorations) {
        expect(deco.modelPath).toMatch(/\.glb$/);
        expect(deco.category).toMatch(
          /^(flowers|stone|fences|structure)$/,
        );
      }
    });

    it("is deterministic for same seed", () => {
      const maze = generateMaze(42);
      const a = placeMazeDecorations(maze, 42);
      const b = placeMazeDecorations(maze, 42);
      expect(a).toEqual(b);
    });
  });
});
