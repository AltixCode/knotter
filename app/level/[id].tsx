import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, View } from 'react-native';

import { BannerAdSlot } from '@/components/BannerAdSlot';
import { KnotBoard, type DrawState } from '@/components/game/KnotBoard';
import { Button, Screen, Text } from '@/components/ui';
import { useKnot } from '@/hooks/useKnot';
import { t } from '@/i18n';
import { isSolved } from '@/logic/grid';
import { TOTAL_LEVELS } from '@/logic/stars';
import { shouldShowInterstitial } from '@/monetization/adPolicy';
import { showInterstitial } from '@/monetization/interstitial';
import { isRewardedReady, showRewarded } from '@/monetization/rewarded';
import { useLevelsStore } from '@/store/useLevelsStore';
import { usePremiumStore } from '@/store/usePremiumStore';
import { useTheme } from '@/theme';

const FREE_HINTS = 1;

export default function LevelRoute() {
  const params = useLocalSearchParams<{ id?: string }>();
  const level = Math.max(1, Math.min(TOTAL_LEVELS, Number(params.id ?? 1) || 1));
  // Keyed so changing level REMOUNTS: resetting from an effect leaves one frame
  // showing the previous level's cords on a different board.
  return <LevelSession key={level} level={level} />;
}

function LevelSession({ level }: { level: number }) {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const { puzzle, solution } = useKnot(level);

  // Paths and the drag's active cord move together, so the board can update
  // both from one functional setState and never read a stale value mid-drag.
  const [draw, setDraw] = useState<DrawState>({ paths: {}, active: null });
  const paths = draw.paths;
  const [hintsUsed, setHintsUsed] = useState(0);
  const recorded = useRef(false);

  const solved = isSolved(puzzle, paths);
  const filled = new Set(Object.values(paths).flat().map((p) => `${p.r},${p.c}`)).size;
  const coverage = Math.round((filled / (puzzle.size * puzzle.size)) * 100);

  const recordClear = useLevelsStore((s) => s.recordClear);
  const isPremium = usePremiumStore((s) => s.isPremium);

  useEffect(() => {
    if (!solved || recorded.current) return;
    recorded.current = true;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Par is the board area: a perfect solve fills every cell exactly once.
    recordClear(level, filled, puzzle.size * puzzle.size);

    if (
      shouldShowInterstitial({
        gamesPlayed: level,
        lastInterstitialAt: 0,
        now: Date.now(),
        adsRemoved: isPremium,
      })
    ) {
      showInterstitial();
    }
  }, [solved, level, filled, puzzle.size, recordClear, isPremium]);

  const clear = useCallback(() => setDraw({ paths: {}, active: null }), []);

  const applyHint = useCallback(() => {
    // Lay one whole cord from the known answer — the one still missing.
    for (const pair of puzzle.pairs) {
      const drawn = paths[pair.colour] ?? [];
      const answer = solution[pair.colour] ?? [];
      if (drawn.length !== answer.length) {
        setDraw((current) => ({
          ...current,
          paths: { ...current.paths, [pair.colour]: answer },
        }));
        return true;
      }
    }
    return false;
  }, [puzzle.pairs, paths, solution]);

  const onHint = useCallback(() => {
    const allowance = isPremium ? Number.POSITIVE_INFINITY : FREE_HINTS;
    if (hintsUsed < allowance) {
      if (applyHint()) setHintsUsed((n) => n + 1);
      return;
    }
    if (!isRewardedReady()) {
      Alert.alert(t('noHintsLeft'), t('adNotReady'));
      return;
    }
    void showRewarded().then((earned) => {
      if (earned && applyHint()) setHintsUsed((n) => n + 1);
    });
  }, [applyHint, hintsUsed, isPremium]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Screen scroll>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginTop: spacing.base,
          }}
        >
          <Text variant="title">{t('levelLabel', { number: level })}</Text>
          <Text variant="caption" tone="muted">
            {t('coverageLabel', { count: coverage })}
          </Text>
        </View>
        <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>
          {t('fillEveryCell')}
        </Text>

        <View style={{ marginTop: spacing.lg }}>
          <KnotBoard puzzle={puzzle} paths={paths} onChange={setDraw} />
        </View>

        {solved ? (
          <View style={{ alignItems: 'center', marginTop: spacing.xl, gap: spacing.sm }}>
            <Text variant="heading" tone="accent">
              {t('solvedTitle')}
            </Text>
            <Text variant="caption" tone="muted">
              {t('cordsLabel', { count: puzzle.pairs.length })}
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md }}>
              <Button
                label={t('nextLevel')}
                onPress={() => router.replace(`/level/${Math.min(TOTAL_LEVELS, level + 1)}`)}
              />
              <Button label={t('backToLevels')} variant="ghost" onPress={() => router.replace('/')} />
            </View>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl }}>
            <Button label={t('hint')} variant="secondary" onPress={onHint} style={{ flex: 1 }} />
            <Button label={t('clearCord')} variant="ghost" onPress={clear} style={{ flex: 1 }} />
          </View>
        )}
      </Screen>
      <BannerAdSlot />
    </View>
  );
}
