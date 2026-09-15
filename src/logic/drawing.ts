import { adjacent, endpointAt, samePoint, type KnotterPuzzle, type Paths, type Point } from './grid';

/**
 * What a drag does to the cords.
 *
 * This is the interaction's real logic, so it lives here rather than inside the
 * board component: it is where the genre's feel comes from, it has more branches
 * than anything else in the app, and none of them are testable through a gesture.
 */

/** Which cord owns a cell, and how far along it. */
export function ownerOf(paths: Paths, at: Point): { colour: number; index: number } | null {
  for (const [colour, path] of Object.entries(paths)) {
    const index = (path ?? []).findIndex((p) => samePoint(p, at));
    if (index !== -1) return { colour: Number(colour), index };
  }
  return null;
}

export interface DragStart {
  paths: Paths;
  /** The cord this drag is drawing, or null if the touch started nowhere. */
  active: number | null;
}

/**
 * Touching down.
 *
 * On a dot, that cord restarts from it. On a cell an existing cord runs through,
 * the cord is cut back to there so the drag continues from that point — without
 * which, fixing the last two cells of a long cord means redrawing all of it.
 *
 * The active cord is RETURNED rather than inferred later. Working it out from
 * adjacency during the drag is ambiguous: where two cords both have a head
 * beside the touched cell — which happens constantly on a crowded board — there
 * is no way to tell which one the finger is drawing.
 */
export function beginAt(puzzle: KnotterPuzzle, paths: Paths, at: Point): DragStart {
  const dot = endpointAt(puzzle, at);
  if (dot !== null) return { paths: { ...paths, [dot]: [at] }, active: dot };

  const owner = ownerOf(paths, at);
  if (!owner) return { paths, active: null };
  return {
    paths: { ...paths, [owner.colour]: (paths[owner.colour] ?? []).slice(0, owner.index + 1) },
    active: owner.colour,
  };
}

/**
 * Dragging onto a cell.
 *
 * Returns the paths unchanged when the move is not allowed, so the caller can
 * treat "nothing happened" and "something happened" the same way.
 */
export function extendTo(
  puzzle: KnotterPuzzle,
  paths: Paths,
  active: number | null,
  at: Point,
): Paths {
  if (active === null) return paths;

  const path = paths[active] ?? [];
  const head = path[path.length - 1];
  if (!head || samePoint(head, at)) return paths;

  // Backing onto the previous cell retracts rather than rejects.
  const previous = path[path.length - 2];
  if (previous && samePoint(previous, at)) {
    return { ...paths, [active]: path.slice(0, -1) };
  }

  if (!adjacent(head, at)) return paths;
  if (path.some((p) => samePoint(p, at))) return paths;

  // A cord may never enter another colour's dot.
  const dot = endpointAt(puzzle, at);
  if (dot !== null && dot !== active) return paths;

  // Entering a cell another cord holds cuts that cord back to just before it.
  const next: Paths = { ...paths };
  const owner = ownerOf(paths, at);
  if (owner && owner.colour !== active) {
    next[owner.colour] = (paths[owner.colour] ?? []).slice(0, owner.index);
  }
  next[active] = [...path, at];
  return next;
}
