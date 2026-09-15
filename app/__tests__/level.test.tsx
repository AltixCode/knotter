import { fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';

import LevelRoute from '../level/[id]';
import { setRouteParams } from './testRouter';
import { renderWithProviders } from '@/components/__tests__/renderWithProviders';
import { t } from '@/i18n';
import { generateKnot } from '@/logic/generate';
import { isSolved } from '@/logic/grid';
import { seedFromKey } from '@/logic/rng';
import { useAdsConsentStore } from '@/store/useAdsConsentStore';
import { useLevelsStore } from '@/store/useLevelsStore';
import { usePremiumStore } from '@/store/usePremiumStore';

const LEVEL = 1;
const { puzzle: PUZZLE, solution: SOLUTION } = generateKnot(LEVEL, seedFromKey(`knotter:${LEVEL}`));

beforeEach(() => {
  jest.clearAllMocks();
  usePremiumStore.setState({ isPremium: false, isReady: true });
  useAdsConsentStore.setState({ consent: { canServeAds: true, offerPrivacyOptions: false } });
  useLevelsStore.setState({ results: {}, isHydrated: true });
  setRouteParams({ id: String(LEVEL) });
});

describe('Level', () => {
  it('shows the level and how to play', async () => {
    const { getByText } = await renderWithProviders(<LevelRoute />);
    expect(getByText(t('levelLabel', { number: LEVEL }))).toBeTruthy();
    expect(getByText(t('fillEveryCell'))).toBeTruthy();
  });

  it('starts with nothing filled', async () => {
    const { getByText } = await renderWithProviders(<LevelRoute />);
    expect(getByText(t('coverageLabel', { count: 0 }))).toBeTruthy();
  });

  it('renders every cell of the board', async () => {
    const { getAllByLabelText } = await renderWithProviders(<LevelRoute />);
    const cells = getAllByLabelText(/^(Row|Γραμμή|Fila|Ligne|Zeile)/);
    expect(cells.length).toBe(PUZZLE.size * PUZZLE.size);
  });

  it('a hint lays a whole cord and raises coverage', async () => {
    const { getByLabelText, getByText, queryByText } = await renderWithProviders(<LevelRoute />);
    await fireEvent.press(getByLabelText(t('hint')));
    await waitFor(() => expect(queryByText(t('coverageLabel', { count: 0 }))).toBeNull());
    expect(getByText(t('levelLabel', { number: LEVEL }))).toBeTruthy();
  });

  it('clear empties the board again', async () => {
    const { getByLabelText, getByText } = await renderWithProviders(<LevelRoute />);
    await fireEvent.press(getByLabelText(t('hint')));
    await waitFor(() => expect(getByText(t('levelLabel', { number: LEVEL }))).toBeTruthy());
    await fireEvent.press(getByLabelText(t('clearCord')));
    await waitFor(() => expect(getByText(t('coverageLabel', { count: 0 }))).toBeTruthy());
  });

  it('ties the level when every cord is laid, and records it', async () => {
    // Premium, because a free player gets exactly one hint — that limit is the
    // paywall working, not a bug.
    usePremiumStore.setState({ isPremium: true });
    const { getByLabelText, getByText } = await renderWithProviders(<LevelRoute />);
    for (let i = 0; i < PUZZLE.pairs.length; i += 1) {
      await fireEvent.press(getByLabelText(t('hint')));
    }
    await waitFor(() => expect(getByText(t('solvedTitle'))).toBeTruthy());
    expect(useLevelsStore.getState().results[LEVEL]).toBeDefined();
  });

  it("level 1's own solution really solves it", () => {
    expect(isSolved(PUZZLE, SOLUTION)).toBe(true);
  });
});
