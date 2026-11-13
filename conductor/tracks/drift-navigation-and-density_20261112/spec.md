# Spec: Deep-Link Wake-Up Entry Fix & Compact Spatial Layout

**Track ID:** `drift-navigation-and-density_20261112` · **Type:** Bugfix & Feature · **Depends on:** `voice-and-gaze-dedup_20261112`

## Overview

Address two spatial/navigation UX issues found by the artist on desktop:
1. **"See it in the drift" from Wake-up mode does nothing:** When a visitor clicks **Wake up** (`localStorage` stores `mode = 'awake'`), navigates to a work page, and clicks **"See it in the drift"** (`/{lang}/?w=<slug>`), `DriftBoot` currently honours the stored `'awake'` mode and leaves the visitor stranded on the static Awake home page instead of entering the drift at that work.
2. **3D field is too sparse on desktop:** Works are currently spaced 9 units apart with ±13 units of lateral wander, 300 units between territories, and heavy exponential fog (`0.045`), leaving 85–95% of the desktop viewport empty with only 1–2 tiny works visible at a time.

## Functional Requirements

- **FR1 Deep-Link Override of Stored `'awake'` Mode (`DriftBoot.ts`, `DeviceProfile.ts`):**
  - When `win.location.search` contains a syntactically non-empty `?w=<slug>` (that resolves to a known work slug in the manifest, and `kiosk` is false), AND the device itself is capable of running the world (`DeviceProfile.decide(caps, 'world').mode === 'world'`, i.e. WebGL2 available and Save-Data off), `bootDrift` MUST treat the navigation as an explicit request to enter the drift: persist `preference.write('world')` and enter the world focused on `<slug>`.
  - Devices that are genuinely incapable (no WebGL2 or Save-Data on) continue to stay safely on the Awake layer even with `?w=<slug>`.
  - Kiosk mode (`?kiosk=1`) continues to ignore `?w=<slug>` per Track 10's kiosk invariant.
- **FR2 Compact, Layered Gallery Density (`FieldLayout.ts`, `StageSettings.ts`, `ApparitionCurve.ts`, `DriftWorld.ts`):**
  - Compact longitudinal and lateral dimensions in `FIELD` (`src/world/core/FieldLayout.ts`) so the field reads as an intimate, layered dreamscape on desktop while preserving collision-free spacing:
    - `spacing`: `3.2` (was `6`), `pitch`: `4.6` (was `9`), `jitter`: `0.7` (was `1.5`, so `pitch - 2 * jitter = 3.2 === spacing`), `lateral`: `3.4` (was `7`), `curveAmplitude`: `2.4` (was `6`), `curveWavelength`: `64` (was `120`), `zoneGap`: `10` (was `18`).
    - Bring territories much closer so *The border is thin* is reachable without a 300-unit void: `territoryDistance`: `48` (was `300`), `territoryGap`: `30` (was `200`).
    - Alternate lateral placement left/right of the path (`(-1)^i` band + seeded offset within `[0.6, lateral]`) so consecutive works frame both sides of the visitor's sightline rather than stacking directly behind one another or wandering off-screen.
  - Tune visibility depth (`FOG_DENSITY` in `StageSettings.ts` from `0.045` → `0.030`, and `ApparitionCurve` `near`/`far` + `TextureBudget` radius in `DriftWorld.ts`) so **at least 4–6 works are simultaneously visible** at staggered depths from the Arrival start pose on desktop (`1440×900`).

## Non-Functional Requirements

- Maintain ≥ 60 fps desktop and low-tier budgets (`TextureBudget` caps respected).
- All `FieldLayout` mathematical invariants (determinism, minimum pairwise 3D/ground spacing ≥ `FIELD.spacing`, cross-territory minimum distance ≥ `FIELD.territoryGap`, zone ordering) verified by `fast-check` property tests.
- 100% coverage on changed TS modules.

## Acceptance Criteria

1. Playwright e2e test: click **Wake up** → open a work page (`/en/works/arrivee/`) → click **"See it in the drift"** → world mounts automatically (`html.drift-active`) facing `arrivee`, without clicking a second `Drift` button.
2. Playwright e2e density test at desktop viewport (`1440×900`): at initial spawn in `Dreamland · Arrival`, ≥ 4 works are simultaneously visible (opacity > 0.12 and projected inside the viewport).
3. `npm run check` and `npm run test:e2e` pass under both `CI=true` and `CI` unset.
