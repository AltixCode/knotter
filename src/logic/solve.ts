import {
  NEIGHBOURS,
  endpointAt,
  inBounds,
  samePoint,
  type KnotterPuzzle,
  type Paths,
  type Point,
} from './grid';

/**
 * Numberlink solver.
 *
 * Routes the colours one at a time, depth-first: run a cord from the colour's
 * first dot until it reaches the second, then move to the next colour. When
 * every colour is placed the board must be fully covered, which is checked at
 * the end rather than during the search — a partially routed board legitimately
 * has holes.
 *
 * A "dead cell" prune was tried here and removed: rejecting any branch with an
 * empty cell having fewer than two FREE neighbours is not sound, because a
 * neighbouring cell may be a dot the cord will legitimately enter from. It made
 * the solver report zero answers for puzzles that plainly have one. The search
 * is bounded by a visit cap instead, which is correct if slower.
 */

const key = (p: Point) => `${p.r},${p.c}`;

export function countSolutions(puzzle: KnotterPuzzle, limit = 2, maxVisits = 400_000): number {
  const { size, pairs } = puzzle;
  const occupied = new Map<string, number>();
  for (const pair of pairs) {
    occupied.set(key(pair.a), pair.colour);
    occupied.set(key(pair.b), pair.colour);
  }

  let found = 0;
  let visits = 0;

  const route = (index: number, head: Point): boolean => {
    if (visits++ > maxVisits) return true; // Bail out; caller treats as "unknown".
    const pair = pairs[index]!;

    if (samePoint(head, pair.b)) {
      if (index + 1 === pairs.length) {
        if (occupied.size === size * size) found += 1;
        return found >= limit;
      }
      const next = pairs[index + 1]!;
      return route(index + 1, next.a);
    }

    for (const d of NEIGHBOURS) {
      const step = { r: head.r + d.r, c: head.c + d.c };
      if (!inBounds(step, size)) continue;

      const held = occupied.get(key(step));
      // The only occupied cell a cord may enter is its own far dot.
      if (held !== undefined && !samePoint(step, pair.b)) continue;

      const isTarget = samePoint(step, pair.b);
      if (!isTarget) occupied.set(key(step), pair.colour);
      if (route(index, step)) {
        if (!isTarget) occupied.delete(key(step));
        return true;
      }
      if (!isTarget) occupied.delete(key(step));
    }
    return false;
  };

  const first = pairs[0];
  if (!first) return 0;
  route(0, first.a);
  return found;
}

/** Whether the puzzle has exactly one full-coverage answer. */
export function isUnique(puzzle: KnotterPuzzle): boolean {
  return countSolutions(puzzle, 2) === 1;
}

/** Rebuilds the solution paths from a puzzle known to have one. */
export function solutionPaths(puzzle: KnotterPuzzle): Paths | null {
  const { size, pairs } = puzzle;
  const occupied = new Map<string, number>();
  const paths: Paths = {};
  for (const pair of pairs) {
    occupied.set(key(pair.a), pair.colour);
    occupied.set(key(pair.b), pair.colour);
    paths[pair.colour] = [];
  }
  let visits = 0;

  const route = (index: number, head: Point, trail: Point[]): boolean => {
    if (visits++ > 400_000) return false;
    const pair = pairs[index]!;
    if (samePoint(head, pair.b)) {
      paths[pair.colour] = [...trail, head];
      if (index + 1 === pairs.length) return occupied.size === size * size;
      const next = pairs[index + 1]!;
      if (route(index + 1, next.a, [])) return true;
      paths[pair.colour] = [];
      return false;
    }
    for (const d of NEIGHBOURS) {
      const step = { r: head.r + d.r, c: head.c + d.c };
      if (!inBounds(step, size)) continue;
      const held = occupied.get(key(step));
      if (held !== undefined && !samePoint(step, pair.b)) continue;
      const isTarget = samePoint(step, pair.b);
      if (!isTarget) occupied.set(key(step), pair.colour);
      if (route(index, step, [...trail, head])) return true;
      if (!isTarget) occupied.delete(key(step));
    }
    return false;
  };

  const first = pairs[0];
  if (!first) return null;
  return route(0, first.a, []) ? paths : null;
}

/** Test seam so a puzzle's own dots can be read without exporting internals. */
export const dotColourAt = endpointAt;
