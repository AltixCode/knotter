import { beginAt, extendTo, ownerOf } from '../drawing';
import type { KnotterPuzzle } from '../grid';

const p = (r: number, c: number) => ({ r, c });

const PUZZLE: KnotterPuzzle = {
  size: 3,
  pairs: [
    { colour: 0, a: p(0, 0), b: p(0, 2) },
    { colour: 1, a: p(2, 0), b: p(1, 2) },
  ],
};

describe('ownerOf', () => {
  it('finds the cord holding a cell and its position along it', () => {
    expect(ownerOf({ 0: [p(0, 0), p(1, 0)] }, p(1, 0))).toEqual({ colour: 0, index: 1 });
  });

  it('returns null for a free cell', () => {
    expect(ownerOf({ 0: [p(0, 0)] }, p(2, 2))).toBeNull();
  });
});

describe('beginAt', () => {
  it('restarts a cord from its own dot and makes it active', () => {
    const start = beginAt(PUZZLE, { 0: [p(0, 0), p(1, 0), p(1, 1)] }, p(0, 0));
    expect(start.paths[0]).toEqual([p(0, 0)]);
    expect(start.active).toBe(0);
  });

  it('cuts a cord back to the touched cell, so a long cord need not be redrawn', () => {
    const start = beginAt(PUZZLE, { 0: [p(0, 0), p(1, 0), p(1, 1), p(0, 1)] }, p(1, 0));
    expect(start.paths[0]).toEqual([p(0, 0), p(1, 0)]);
    expect(start.active).toBe(0);
  });

  it('starts nothing on an empty cell no cord holds', () => {
    const paths = { 0: [p(0, 0)] };
    const start = beginAt(PUZZLE, paths, p(2, 2));
    expect(start.paths).toBe(paths);
    expect(start.active).toBeNull();
  });
});

describe('extendTo', () => {
  it('adds an adjacent free cell', () => {
    expect(extendTo(PUZZLE, { 0: [p(0, 0)] }, 0, p(1, 0))[0]).toEqual([p(0, 0), p(1, 0)]);
  });

  it('retracts when dragged back onto the previous cell', () => {
    expect(extendTo(PUZZLE, { 0: [p(0, 0), p(1, 0)] }, 0, p(0, 0))[0]).toEqual([p(0, 0)]);
  });

  it('refuses a diagonal or distant cell', () => {
    const paths = { 0: [p(0, 0)] };
    expect(extendTo(PUZZLE, paths, 0, p(1, 1))).toBe(paths);
    expect(extendTo(PUZZLE, paths, 0, p(2, 2))).toBe(paths);
  });

  it('refuses to revisit a cell the same cord already holds', () => {
    const paths = { 0: [p(0, 0), p(1, 0), p(1, 1)] };
    expect(extendTo(PUZZLE, paths, 0, p(1, 0))[0]).toEqual([p(0, 0), p(1, 0)]);
  });

  it("refuses to enter another colour's dot", () => {
    // (2,0) belongs to colour 1.
    const paths = { 0: [p(0, 0), p(1, 0)] };
    expect(extendTo(PUZZLE, paths, 0, p(2, 0))).toBe(paths);
  });

  it('enters its own far dot', () => {
    const paths = { 0: [p(0, 0), p(0, 1)] };
    expect(extendTo(PUZZLE, paths, 0, p(0, 2))[0]).toEqual([p(0, 0), p(0, 1), p(0, 2)]);
  });

  it('cuts another cord back when crossing it', () => {
    const paths = { 0: [p(0, 0)], 1: [p(2, 0), p(1, 0), p(1, 1)] };
    const next = extendTo(PUZZLE, paths, 0, p(1, 0));
    expect(next[0]).toEqual([p(0, 0), p(1, 0)]);
    expect(next[1]).toEqual([p(2, 0)]);
  });

  it('does nothing when no cord is being drawn', () => {
    const paths = { 0: [p(0, 0)] };
    expect(extendTo(PUZZLE, paths, null, p(1, 0))).toBe(paths);
  });

  it('does nothing when dragged onto its own head', () => {
    const paths = { 0: [p(0, 0), p(1, 0)] };
    expect(extendTo(PUZZLE, paths, 0, p(1, 0))).toBe(paths);
  });
});
