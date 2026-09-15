import { makeRng, shuffled, type Rng } from './rng';
import { countSolutions, solutionPaths } from './solve';
import {
  NEIGHBOURS,
  inBounds,
  type Endpoints,
  type KnotterPuzzle,
  type Paths,
  type Point,
} from './grid';

/**
 * Generates a Knotter puzzle with exactly one answer.
 *
 * Backwards, like the rest of the portfolio's generators: carve a set of paths
 * that together cover the whole grid, then throw everything away except each
 * path's two ends. The carving IS the answer, so a solution is guaranteed to
 * exist; the solver is then only asked whether it is the ONLY one.
 *
 * That last check is the expensive half and the reason the puzzle is worth
 * playing. A Numberlink with two answers lets a player deduce correctly, be
 * told they are wrong, and stop trusting the app.
 */

export interface GeneratedKnot {
  puzzle: KnotterPuzzle;
  solution: Paths;
}

const key = (p: Point) => `${p.r},${p.c}`;

/**
 * Fills the grid with `colours` self-avoiding paths.
 *
 * Each path grows from a free cell until it runs out of room, then the next
 * starts. Growth prefers a random free neighbour, which produces the winding
 * cords the puzzle is named for rather than straight lines.
 */
function carve(size: number, colours: number, rng: Rng): Point[][] | null {
  const used = new Set<string>();
  const paths: Point[][] = [];

  const freeCells = (): Point[] => {
    const out: Point[] = [];
    for (let r = 0; r < size; r += 1) {
      for (let c = 0; c < size; c += 1) if (!used.has(key({ r, c }))) out.push({ r, c });
    }
    return out;
  };

  for (let colour = 0; colour < colours; colour += 1) {
    const free = freeCells();
    if (free.length === 0) return null;
    const start = shuffled(free, rng)[0]!;
    used.add(key(start));
    const path: Point[] = [start];

    // The last colour must absorb everything left, or the board is not covered.
    const isLast = colour === colours - 1;
    for (;;) {
      const head = path[path.length - 1]!;
      const options = shuffled(
        NEIGHBOURS.map((d) => ({ r: head.r + d.r, c: head.c + d.c })).filter(
          (n) => inBounds(n, size) && !used.has(key(n)),
        ),
        rng,
      );
      const step = options[0];
      if (!step) break;
      // Stop non-final cords early sometimes, so the colours differ in length.
      if (!isLast && path.length >= 3 && rng.next() < 0.22) break;
      used.add(key(step));
      path.push(step);
    }
    paths.push(path);
  }

  return used.size === size * size ? paths : null;
}

export interface KnotShape {
  size: number;
  colours: number;
}

/**
 * Bigger boards, then more cords on them.
 *
 * The cord count is high on purpose — roughly one per row. Numberlink gets its
 * uniqueness from being crowded: three cords on a 5x5 leaves 25 cells with so
 * much slack that the endpoints admit several answers, and a puzzle with
 * several answers is the one defect this genre cannot survive. Difficulty comes
 * from board size, not from removing cords.
 */
export function shapeForLevel(level: number): KnotShape {
  const size = level < 15 ? 5 : level < 45 ? 6 : level < 100 ? 7 : 8;
  const colours = size + Math.min(2, Math.floor(level / 25));
  return { size, colours };
}

export function generateKnot(level: number, seed: number): GeneratedKnot {
  const shape = shapeForLevel(level);
  const rng = makeRng(seed);

  for (let attempt = 0; attempt < 120; attempt += 1) {
    const carved = carve(shape.size, shape.colours, rng);
    if (!carved) continue;
    // A one-cell cord has both dots in the same place.
    if (carved.some((path) => path.length < 2)) continue;

    const pairs: Endpoints[] = carved.map((path, colour) => ({
      colour,
      a: path[0]!,
      b: path[path.length - 1]!,
    }));
    const puzzle: KnotterPuzzle = { size: shape.size, pairs };

    if (countSolutions(puzzle, 2) !== 1) continue;
    const solution = solutionPaths(puzzle);
    if (!solution) continue;

    return { puzzle, solution };
  }

  throw new Error(`Knotter: no uniquely-solvable level ${level} for seed ${seed}`);
}
