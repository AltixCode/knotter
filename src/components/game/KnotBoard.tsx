import * as Haptics from 'expo-haptics';
import React, { useCallback } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { Text } from '@/components/ui';
import { t } from '@/i18n';
import { beginAt, extendTo, ownerOf } from '@/logic/drawing';
import { endpointAt, inBounds, type KnotterPuzzle, type Paths, type Point } from '@/logic/grid';
import { colourAt } from '@/theme/cordColours';
import { useTheme, withAlpha } from '@/theme';

/**
 * Drag from a dot to lay its cord.
 *
 * Starting a drag on a cell that already belongs to a cord TRUNCATES that cord
 * back to there and carries on from it. That is the behaviour this genre lives
 * on: without it, fixing the last two cells of a long cord means redrawing the
 * whole thing.
 *
 * Hit-testing is on the JS thread, deliberately. The paths are React state the
 * validator reads, and a worklet calling a plain JS helper throws "Tried to
 * synchronously call a Remote Function" on the first touch — invisible to Jest,
 * fatal on device.
 */
export interface DrawState {
  paths: Paths;
  /** The cord the current drag is drawing, if any. */
  active: number | null;
}

function Grid({
  puzzle,
  paths,
  onChange,
  side,
  gap,
}: {
  puzzle: KnotterPuzzle;
  paths: Paths;
  onChange: (update: (prev: DrawState) => DrawState) => void;
  side: number;
  gap: number;
}) {
  const { colors } = useTheme();

  const cellAt = useCallback(
    (x: number, y: number): Point | null => {
      const step = side + gap;
      if (step <= 0) return null;
      const c = Math.floor(x / step);
      const r = Math.floor(y / step);
      const at = { r, c };
      return inBounds(at, puzzle.size) ? at : null;
    },
    [side, gap, puzzle.size],
  );

  // The drag's active cord lives in the same state as the paths, and both are
  // updated functionally. A ref would work but the linter cannot tell a deferred
  // gesture callback from render; reading the latest state through the updater
  // is both accepted and immune to a stale closure mid-drag.
  const begin = useCallback(
    (at: Point) => {
      onChange((prev) => {
        const start = beginAt(puzzle, prev.paths, at);
        if (start.paths !== prev.paths) void Haptics.selectionAsync();
        return { paths: start.paths, active: start.active };
      });
    },
    [puzzle, onChange],
  );

  const extend = useCallback(
    (at: Point) => {
      onChange((prev) => {
        const next = extendTo(puzzle, prev.paths, prev.active, at);
        if (next === prev.paths) return prev;
        void Haptics.selectionAsync();
        return { paths: next, active: prev.active };
      });
    },
    [puzzle, onChange],
  );

  const pan = Gesture.Pan()
    .runOnJS(true)
    .onBegin((e) => {
      const at = cellAt(e.x, e.y);
      if (at) begin(at);
    })
    .onUpdate((e) => {
      const at = cellAt(e.x, e.y);
      if (at) extend(at);
    });

  return (
    <GestureDetector gesture={pan}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
        {Array.from({ length: puzzle.size }, (_, r) =>
          Array.from({ length: puzzle.size }, (_, c) => {
            const at = { r, c };
            const dot = endpointAt(puzzle, at);
            const owner = ownerOf(paths, at);
            const colour = dot ?? owner?.colour ?? null;
            const label =
              colour === null
                ? t('cellA11y', { row: r + 1, col: c + 1 })
                : `${t('cellA11y', { row: r + 1, col: c + 1 })}, ${t('cordColour', { number: colour + 1 })}`;
            return (
              <View
                key={`${r}-${c}`}
                accessible
                accessibilityLabel={label}
                style={{
                  width: side,
                  height: side,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor:
                    owner !== null && dot === null
                      ? withAlpha(colourAt(owner.colour), 0.4)
                      : colors.surface,
                }}
              >
                {dot !== null ? (
                  <View
                    style={{
                      width: side * 0.68,
                      height: side * 0.68,
                      borderRadius: side * 0.34,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: colourAt(dot),
                    }}
                  >
                    <Text variant="micro" color={colors.onAccent}>
                      {String(dot + 1)}
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          }),
        )}
      </View>
    </GestureDetector>
  );
}

export function KnotBoard(props: {
  puzzle: KnotterPuzzle;
  paths: Paths;
  onChange: (update: (prev: DrawState) => DrawState) => void;
}) {
  const { width, height } = useWindowDimensions();
  const { spacing, colors, radius } = useTheme();
  const gap = props.puzzle.size > 6 ? 2 : 3;
  // Sized from the space there is. A flat cap set against a small phone leaves
  // the board in the top third of a 6.9" screen with the rest empty, and a 13"
  // iPad worse — which reads as an app nobody has opened on a modern device.
  const cap = width >= 700 ? 690 : 552;
  const available = Math.min(width - spacing.base * 2, height * 0.58, cap);
  const side = Math.floor((available - gap * (props.puzzle.size - 1)) / props.puzzle.size);
  const board = side * props.puzzle.size + gap * (props.puzzle.size - 1);

  return (
    <View
      style={{
        width: board,
        height: board,
        alignSelf: 'center',
        borderRadius: radius.md,
        backgroundColor: colors.surfaceAlt,
      }}
    >
      <Grid {...props} side={side} gap={gap} />
    </View>
  );
}
