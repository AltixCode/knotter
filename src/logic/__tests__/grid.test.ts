import {
  adjacent,
  endpointAt,
  inBounds,
  isSolved,
  overlaps,
  pathComplete,
  pathLegal,
  samePoint,
  type KnotterPuzzle,
} from '../grid';

const p = (r: number, c: number) => ({ r, c });

/**
 * A 3x3 with two colours whose cords together cover every cell.
 *
 * The dot placement is not arbitrary. Colour the grid like a chessboard: a 3x3
 * has five cells of one shade and four of the other, and a cord between two
 * same-shade cells always covers one more of that shade than the other. Putting
 * dots on all four corners — every corner is the same shade — makes full
 * coverage impossible, and an earlier version of this fixture did exactly that.
 * One same-shade pair and one mixed pair is the combination that balances.
 */
const PUZZLE: KnotterPuzzle = {
  size: 3,
  pairs: [
    { colour: 0, a: p(0, 0), b: p(0, 2) },
    { colour: 1, a: p(2, 0), b: p(1, 2) },
  ],
};

/** Five cells for colour 0, four for colour 1 — nine in total, none shared. */
const SOLUTION = {
  0: [p(0, 0), p(1, 0), p(1, 1), p(0, 1), p(0, 2)],
  1: [p(2, 0), p(2, 1), p(2, 2), p(1, 2)],
};

describe('helpers', () => {
  it('compares points by value', () => {
    expect(samePoint(p(1, 2), p(1, 2))).toBe(true);
    expect(samePoint(p(1, 2), p(2, 1))).toBe(false);
  });

  it('knows orthogonal neighbours from diagonals', () => {
    expect(adjacent(p(0, 0), p(0, 1))).toBe(true);
    expect(adjacent(p(0, 0), p(1, 1))).toBe(false);
    expect(adjacent(p(0, 0), p(0, 2))).toBe(false);
  });

  it('bounds-checks', () => {
    expect(inBounds(p(0, 0), 3)).toBe(true);
    expect(inBounds(p(3, 0), 3)).toBe(false);
    expect(inBounds(p(-1, 0), 3)).toBe(false);
  });
});

describe('endpointAt', () => {
  it('finds the colour of a dot', () => {
    expect(endpointAt(PUZZLE, p(0, 0))).toBe(0);
    expect(endpointAt(PUZZLE, p(1, 2))).toBe(1);
    expect(endpointAt(PUZZLE, p(2, 0))).toBe(1);
  });

  it('returns null for an ordinary cell', () => {
    expect(endpointAt(PUZZLE, p(1, 1))).toBeNull();
    expect(endpointAt(PUZZLE, p(2, 2))).toBeNull();
  });
});

describe('pathLegal', () => {
  it('accepts an empty path — the player has not started', () => {
    expect(pathLegal(PUZZLE, 0, [])).toBe(true);
  });

  it('accepts a legal partial cord, because the UI asks after every cell', () => {
    expect(pathLegal(PUZZLE, 0, [p(0, 0), p(1, 0)])).toBe(true);
  });

  it('rejects a cord that does not start on one of its own dots', () => {
    expect(pathLegal(PUZZLE, 0, [p(1, 1), p(1, 0)])).toBe(false);
  });

  it('rejects a jump between non-neighbours', () => {
    expect(pathLegal(PUZZLE, 0, [p(0, 0), p(2, 2)])).toBe(false);
  });

  it('rejects revisiting a cell', () => {
    expect(pathLegal(PUZZLE, 0, [p(0, 0), p(1, 0), p(0, 0)])).toBe(false);
  });

  it('rejects leaving the grid', () => {
    expect(pathLegal(PUZZLE, 0, [p(0, 0), p(-1, 0)])).toBe(false);
  });

  it("rejects passing through another colour's dot", () => {
    // Otherwise a cord could tunnel through a dot it does not own, which makes
    // most puzzles trivially solvable. (2,0) belongs to colour 1.
    expect(pathLegal(PUZZLE, 0, [p(0, 0), p(1, 0), p(2, 0)])).toBe(false);
  });

  it('rejects an unknown colour', () => {
    expect(pathLegal(PUZZLE, 9, [p(0, 0)])).toBe(false);
  });
});

describe('pathComplete', () => {
  it('is true when the cord joins its two dots, either way round', () => {
    expect(pathComplete(PUZZLE, 1, SOLUTION[1])).toBe(true);
    expect(pathComplete(PUZZLE, 1, [...SOLUTION[1]].reverse())).toBe(true);
  });

  it('is false for a cord that stops short', () => {
    expect(pathComplete(PUZZLE, 1, [p(2, 0), p(2, 1)])).toBe(false);
  });

  it('is false for a single cell', () => {
    expect(pathComplete(PUZZLE, 1, [p(2, 0)])).toBe(false);
  });
});

describe('overlaps', () => {
  it('finds nothing when cords keep to themselves', () => {
    expect(overlaps(SOLUTION)).toEqual([]);
  });

  it('names a cell two cords both claim', () => {
    const clash = { 0: [p(0, 0), p(1, 0)], 1: [p(2, 0), p(1, 0)] };
    expect(overlaps(clash)).toContainEqual(p(1, 0));
  });
});

describe('isSolved', () => {
  it('accepts a set of cords that joins every pair and covers the board', () => {
    expect(isSolved(PUZZLE, SOLUTION)).toBe(true);
  });

  it('rejects a board with a cell left uncovered', () => {
    // Full coverage is what makes this Numberlink rather than connect-the-dots:
    // without it almost every puzzle has many answers.
    const short = { 0: [p(0, 0), p(0, 1), p(0, 2)], 1: [p(2, 0), p(2, 1), p(2, 2), p(1, 2)] };
    expect(isSolved(PUZZLE, short)).toBe(false);
  });

  it('rejects an incomplete cord', () => {
    expect(isSolved(PUZZLE, { ...SOLUTION, 1: [p(2, 0), p(2, 1)] })).toBe(false);
  });

  it('rejects two cords sharing a cell', () => {
    const clash = { 0: SOLUTION[0], 1: [p(2, 0), p(1, 0), p(1, 1), p(1, 2)] };
    expect(isSolved(PUZZLE, clash)).toBe(false);
  });

  it('rejects a missing cord entirely', () => {
    expect(isSolved(PUZZLE, { 0: SOLUTION[0] })).toBe(false);
  });
});
