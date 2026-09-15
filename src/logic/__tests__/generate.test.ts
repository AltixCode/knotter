import { generateKnot, shapeForLevel } from '../generate';
import { isSolved } from '../grid';
import { countSolutions } from '../solve';

describe('shapeForLevel', () => {
  it('starts on a small board that is already crowded', () => {
    // Crowding is what makes a Numberlink unique; a sparse board admits several
    // answers regardless of how it was built.
    expect(shapeForLevel(1).size).toBe(5);
    expect(shapeForLevel(1).colours).toBe(5);
  });

  it('grows the board and the cord count as levels go on', () => {
    expect(shapeForLevel(120).size).toBeGreaterThan(shapeForLevel(1).size);
    expect(shapeForLevel(60).colours).toBeGreaterThan(shapeForLevel(1).colours);
  });

  it('keeps roughly one cord per row, never a sparse board', () => {
    for (const level of [1, 50, 150, 500]) {
      const shape = shapeForLevel(level);
      expect(shape.colours).toBeGreaterThanOrEqual(shape.size);
      expect(shape.colours).toBeLessThanOrEqual(shape.size + 2);
    }
  });
});

describe('generateKnot', () => {
  it('is deterministic for a seed', () => {
    expect(generateKnot(1, 321)).toEqual(generateKnot(1, 321));
  });

  it('gives different puzzles for different seeds', () => {
    expect(generateKnot(1, 1)).not.toEqual(generateKnot(1, 2));
  });

  it.each([1, 5, 12])('produces a level %i whose own solution solves it', (level) => {
    const { puzzle, solution } = generateKnot(level, level * 37 + 5);
    expect(isSolved(puzzle, solution)).toBe(true);
  });

  it.each([1, 5, 12])('produces a level %i with exactly one answer', (level) => {
    // Two answers lets a player deduce correctly, be told they are wrong, and
    // stop trusting the app.
    expect(countSolutions(generateKnot(level, level * 13 + 7).puzzle, 3)).toBe(1);
  });

  it('gives every cord two distinct ends', () => {
    const { puzzle } = generateKnot(8, 99);
    for (const pair of puzzle.pairs) {
      expect(pair.a).not.toEqual(pair.b);
    }
  });

  it('covers the whole board with its solution', () => {
    const { puzzle, solution } = generateKnot(6, 42);
    const cells = new Set(
      Object.values(solution).flat().map((p) => `${p.r},${p.c}`),
    );
    expect(cells.size).toBe(puzzle.size * puzzle.size);
  });

  it('holds up across many seeds', () => {
    for (let seed = 0; seed < 8; seed += 1) {
      const { puzzle, solution } = generateKnot(3, seed);
      expect(isSolved(puzzle, solution)).toBe(true);
    }
  });
});
