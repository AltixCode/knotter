import { useMemo } from 'react';

import { generateKnot, type GeneratedKnot } from '@/logic/generate';
import { seedFromKey } from '@/logic/rng';

/**
 * The level's puzzle.
 *
 * Deterministic from the level number, so every player gets the same level 37
 * with nothing shipped or fetched. Memoised because uniqueness checking is the
 * expensive half of generation and must not run on every render.
 */
export function useKnot(level: number): GeneratedKnot {
  return useMemo(() => generateKnot(level, seedFromKey(`knotter:${level}`)), [level]);
}
