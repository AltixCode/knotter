/**
 * Cord colours.
 *
 * Ten distinct hues, which covers the largest board's cord count. They are drawn
 * at full strength: a cord is the thing being judged, so it must not wash out.
 *
 * Colour alone never carries meaning that matters — every dot is also numbered,
 * and each cell is exposed to a screen reader with its cord number, so a player
 * who cannot separate two hues can still play. The set is ordered so adjacent
 * entries are far apart in hue.
 *
 * This is a palette file, which is the one place colours are allowed to be
 * written down.
 */
export const CORD_COLOURS = [
  '#7C5CFF',
  '#F59E0B',
  '#10B981',
  '#EC4899',
  '#0EA5E9',
  '#F97316',
  '#14B8A6',
  '#8B5CF6',
  '#DC2626',
  '#2563EB',
  '#65A30D',
  '#DB2777',
] as const;

export const colourAt = (index: number): string =>
  CORD_COLOURS[index % CORD_COLOURS.length] ?? CORD_COLOURS[0];
