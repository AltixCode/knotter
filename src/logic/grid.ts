/**
 * Knotter — join each pair of coloured dots with one cord, fill every cell, and
 * never cross.
 *
 * This is the public-domain Numberlink rule set. A puzzle is a grid plus a list
 * of endpoint pairs; a solution is one path per colour.
 *
 * Pure: no React, no React Native, no Expo.
 */

export interface Point {
  r: number;
  c: number;
}

export interface Endpoints {
  colour: number;
  a: Point;
  b: Point;
}

export interface KnotterPuzzle {
  size: number;
  pairs: Endpoints[];
}

/** One cord, in the order it was drawn. */
export type Path = Point[];
/** Paths by colour index. */
export type Paths = Record<number, Path>;

export const samePoint = (a: Point, b: Point): boolean => a.r === b.r && a.c === b.c;

export const adjacent = (a: Point, b: Point): boolean =>
  Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;

export const inBounds = (p: Point, size: number): boolean =>
  p.r >= 0 && p.r < size && p.c >= 0 && p.c < size;

export const NEIGHBOURS: Point[] = [
  { r: 1, c: 0 },
  { r: -1, c: 0 },
  { r: 0, c: 1 },
  { r: 0, c: -1 },
];

/** The endpoint colour at a cell, or null when it is not an endpoint. */
export function endpointAt(puzzle: KnotterPuzzle, at: Point): number | null {
  for (const pair of puzzle.pairs) {
    if (samePoint(pair.a, at) || samePoint(pair.b, at)) return pair.colour;
  }
  return null;
}

/**
 * Whether a single cord is well formed: contiguous, inside the grid, no repeat,
 * and — if it has both ends — joining that colour's two dots.
 *
 * A partial cord is valid. The drawing UI asks after every cell, so a path still
 * being drawn must not be reported as broken.
 */
export function pathLegal(puzzle: KnotterPuzzle, colour: number, path: Path): boolean {
  if (path.length === 0) return true;
  const pair = puzzle.pairs.find((p) => p.colour === colour);
  if (!pair) return false;

  const seen = new Set<string>();
  for (let i = 0; i < path.length; i += 1) {
    const cell = path[i]!;
    if (!inBounds(cell, puzzle.size)) return false;
    const key = `${cell.r},${cell.c}`;
    if (seen.has(key)) return false;
    seen.add(key);
    if (i > 0 && !adjacent(path[i - 1]!, cell)) return false;

    // A cord may pass through its own two dots only, never another colour's.
    const owner = endpointAt(puzzle, cell);
    if (owner !== null && owner !== colour) return false;
  }

  // It must start on one of its dots.
  return samePoint(path[0]!, pair.a) || samePoint(path[0]!, pair.b);
}

/** True when the cord joins both of its colour's dots. */
export function pathComplete(puzzle: KnotterPuzzle, colour: number, path: Path): boolean {
  const pair = puzzle.pairs.find((p) => p.colour === colour);
  if (!pair || path.length < 2) return false;
  const first = path[0]!;
  const last = path[path.length - 1]!;
  return (
    (samePoint(first, pair.a) && samePoint(last, pair.b)) ||
    (samePoint(first, pair.b) && samePoint(last, pair.a))
  );
}

/** Cells claimed by more than one cord. */
export function overlaps(paths: Paths): Point[] {
  const owner = new Map<string, number>();
  const clashes: Point[] = [];
  for (const [colour, path] of Object.entries(paths)) {
    for (const cell of path ?? []) {
      const key = `${cell.r},${cell.c}`;
      const held = owner.get(key);
      if (held !== undefined && held !== Number(colour)) clashes.push(cell);
      else owner.set(key, Number(colour));
    }
  }
  return clashes;
}

/**
 * Solved when every cord joins its dots, no two cords share a cell, and every
 * cell on the board is covered.
 *
 * Full coverage is what makes this Numberlink rather than "connect the dots":
 * without it, almost every puzzle has many answers and none of them feel earned.
 */
export function isSolved(puzzle: KnotterPuzzle, paths: Paths): boolean {
  if (overlaps(paths).length > 0) return false;

  const covered = new Set<string>();
  for (const pair of puzzle.pairs) {
    const path = paths[pair.colour] ?? [];
    if (!pathLegal(puzzle, pair.colour, path)) return false;
    if (!pathComplete(puzzle, pair.colour, path)) return false;
    path.forEach((cell) => covered.add(`${cell.r},${cell.c}`));
  }
  return covered.size === puzzle.size * puzzle.size;
}
