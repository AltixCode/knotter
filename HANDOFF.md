# Knotter — handoff

> Written 2026-09-15. **Unverified is UNKNOWN, never a pass** — a green build is
> not a verification. Every row below says what was actually run.

**Knotter** — one cord per colour pair, filling every cell.
Plan: `/Volumes/ExtremePro/Dev/next_mobile_apps/PLAN.md` (PLAN.md §4).
Portfolio rules: `Dev/AGENTS.md`, then `Dev/docs/agents/18-app-lifecycle.md`.

## State at a glance

| | |
|---|---|
| Stage | **Feature-complete**, not yet released |
| Tests | 305 passing |
| Device pass | ⬜ never run |
| App Store | metadata, IAP, price, availability and privacy all done; needs screenshots and a build |
| Released | ⬜ no |

## Verification state

| Gate | State |
|---|---|
| Lint | ✅ |
| Typecheck | ✅ |
| Unit tests (305) | ✅ |
| i18n completeness — 14 locales | ✅ |
| UI rules — colour tokens, `t()` | ✅ |
| iOS + Android bundle export | ✅ |
| CI on a self-hosted runner | 🔨 running when this was written — re-check with `gh run list` |
| `check:release` with real identifiers | ✅ passes in CI |
| Builds / launches on the iOS simulator | ⬜ |
| Interaction driven on the Android emulator | ⬜ |
| Light **and** dark checked on device | ⬜ |
| Purchase flow against a real offering | ⬜ no store product exists yet |
| Ads served under real consent | ⬜ no consent message published yet |

## What is built

**Knotter is feature-complete and every device-free gate is green.**

- Game engines: Numberlink rules, uniqueness solver, carve-then-keep-the-ends generator, drag logic
- Screens: level select, play, settings, paywall
- 305 tests, all passing
- Free tier: levels 1-50; 1 hint per level

Run `npm run verify` to re-prove all of it in one command.

## What is left

1. **Device pass** — `npm run verify:device`. **Not yet run for this app.** This is the next step.
2. **Screenshots** — capture from the running app during that device pass. They
   are the one store asset that cannot be produced ahead of time.
3. **Store records** — see "Blocked on a person" below.
4. **Submit** — `npm run build:production` then `npm run submit:production`.

## Identifiers — already provisioned, do not recreate

Changing a bundle id means deleting and recreating the RevenueCat app, which
**invalidates its public SDK keys**. These are settled.

| | |
|---|---|
| Bundle id / package | `com.altixcode.knotter` |
| Scheme | `knotter://` |
| GitHub | `AltixCode/knotter` |
| RevenueCat project | `proj7fe62017` |
| RevenueCat iOS app | `appd5f7f92b18` |
| RevenueCat Android app | `appabe76749c4` |
| Entitlement | `remove_ads` (`entle44e6f1fe2`) |
| Offering / package | `default` (`ofrngd6ff9cc068`) / `$rc_lifetime` (`pkgeeb7e40e1ac`) |
| AdMob app (iOS) | `ca-app-pub-2504845459806550~8179283974` |
| AdMob app (Android) | `ca-app-pub-2504845459806550~4924144254` |
| AdMob banner (iOS / Android) | `ca-app-pub-2504845459806550/5686561587` / `ca-app-pub-2504845459806550/4805171863` |
| AdMob interstitial (iOS / Android) | `ca-app-pub-2504845459806550/9464445484` / `ca-app-pub-2504845459806550/7548728589` |
| AdMob rewarded (iOS / Android) | `ca-app-pub-2504845459806550/6581287967` / `ca-app-pub-2504845459806550/8288674199` |
| App Store app id | `6812275869` |
| App Store name | Knotter Cord Puzzle |
| IAP id / product | `6812277160` / `com.altixcode.knotter.removeads` |

All ten release identifiers plus `EXPO_TOKEN` are already GitHub repo secrets.
Locally they come from `/Volumes/ExtremePro/Dev/mobile_expo_apps/.admob-ids/knotter.env` —
never commit that file.

## Blocked on a person — cannot be scripted

These three have no write API at all. Browser sessions live in the Playwright
MCP profile (`~/Library/Caches/ms-playwright-mcp/`).

1. **App Store Connect record — done.** App `6812275869` exists, with
   the `remove_ads` non-consumable at $3.99 USA base, auto-equalized, plus a
   free app price schedule and availability in every territory. The store name
   is **Knotter Cord Puzzle**, which may differ from the in-app name: App
   Store display names are globally unique and several short ones in this batch
   were already taken.
   Still console-only, and therefore still blocked on a person: the App Privacy
   data-usage questionnaire, and `contentRightsDeclaration` — `PATCH /v1/apps`
   answers 200 for the latter and stores nothing. Without both, adding the
   version to a review submission fails `409 STATE_ERROR.ENTITY_STATE_INVALID`
   while `versions check-readiness` still reports ready.
2. **Play Console app.** A Play app has **no package name until its first bundle
   is uploaded**, so the order is: create app → upload an AAB to internal testing
   → *then* create the `remove_ads` product. Build that first AAB from a
   **non-production** profile so testers generate no live ad impressions.
3. **AdMob GDPR + US-states consent messages.** The apps and all six ad units
   exist, but **no consent message is published**. The SDK can only present a
   message that exists, and this app fails closed — so in the EEA it currently
   shows **no ads at all**. Publish both under Privacy & messaging.

Also expect **"Requires review — limited ad serving"** on every new AdMob app
for a few days. That is normal, not an integration fault.

## Decisions that are the owner's, not an agent's

- Publish on altixcode.com and itsata.com? **Not yet asked.** Procedure:
  `docs/agents/14-portfolio-demos.md`.
- App Store name. Casual and puzzle names are heavily contested; budget several
  attempts. Apple checks the whole title string, so `Name: Descriptor` often
  clears when the bare name does not. ASC names stay editable until first release.

## Traps already paid for — do not rediscover

- `npm run test:ci` enforces coverage thresholds; a plain `jest` run does not.
  CI has caught this twice.
- **A coverage shortfall in CI may not be about coverage.** Jest's default worker
  count exhausted the shared runner's file descriptors — `ENFILE: file table
  overflow` — and three suites failed to LOAD, so their files went uncovered and
  the job blamed the thresholds. `test:ci` runs `--runInBand` for this reason;
  do not remove it.
- **`package-lock.json` must be committed.** Without it every job dies at
  setup-node with "Dependencies lock file is not found", and `npm ci` cannot run
  at all. Generate one without installing: `npm install --package-lock-only`.
- RNTL 14: `render` and `fireEvent` are async — **await both**. Put each
  screen's tests in its own file, and never call `jest.restoreAllMocks()` in a
  screen test: it restores spies the renderer relies on and the next test's tree
  is torn down as it renders.
- Reset a board by **remounting a keyed component**, never by setState in an
  effect — otherwise one frame shows the previous puzzle on the new board.
- Keep gesture hit-testing on the JS thread. A worklet calling a plain JS helper
  throws *"Tried to synchronously call a Remote Function"* on first touch:
  invisible to Jest, fatal on device.
- `expo run:android` wants the **AVD name**, not the adb serial, and can fail in
  seconds leaving the previous APK installed. Always check its exit code.
- iOS verification stops at build / install / launch / render: Simulator.app is
  missing from this Xcode install, so the ATT prompt cannot be dismissed. **Drive
  interaction on Android.**
- Export `JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home`
  for any Android build, or Gradle silently falls back to JDK 25 and CMake dies.
- Shared code is generated. Fix it in `AltixCode/next-mobile-apps` (`_template/`)
  and re-run `node scripts/bootstrap.mjs knotter`, never in this copy —
  otherwise the next regeneration reverts it.
