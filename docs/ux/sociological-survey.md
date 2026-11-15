# Multi-Persona Sociological UI/UX Visitor Survey

**Track:** `ux-sociological-survey_20261114` · **Engine:** `src/ux/VisitorPersonas.ts` + `src/ux/NavigationAudit.ts` · **Browser Telemetry:** `tests/e2e/uxSurveyCollector.ts` + `tests/e2e/uxSurvey.spec.ts`

## 1. Purpose & Sociological Methodology

`iknowyoucanseeme.xyz` is simultaneously an autonomous online artwork (**The Drift**) and a bilingual curatorial archive (**The Awake Layer**) unifying Alexander Usoltsev's photography and ceramic practice. Visitors do not approach an experimental WebGL exhibition with homogeneous habits, hardware, or time budgets: a pressed Parisian open-call juror scanning 40 works in 90 seconds operates under fundamentally different physical and cognitive constraints than an Instagram follower holding an iPhone SE with one thumb on a metro platform, a collector comparing pigment print dimensions on an iPad, or a keyboard-only visitor opting out of continuous motion via **Wake up / Se réveiller**.

To replace subjective impressions with reproducible evidence, this survey instruments real Chromium sessions across **5 viewports** (`375×667`, `390×844`, `820×1180`, `1440×900`, `1920×1080`) in **both locales** (`en`, `fr`), emulating physical `pointer: coarse` touch hardware on mobile/tablet contexts and `pointer: fine` on desktop contexts. Every measurement below comes directly from live `getBoundingClientRect()` geometry, computed CSS styles, and interactive click-path probes evaluated through `NavigationAudit`.

---

## 2. Empirical Multi-Viewport Telemetry Matrix (Baseline)

### 2.1 Drift HUD Geometry, Interior Collisions & Viewport Occlusion

On touch-capable contexts (`375×667`, `390×844`, `820×1180`), `TiltControl` unhides `[data-drift-tilt]` (*"Move with the phone"* / *"Bouger avec le téléphone"*) inside `.drift-top` alongside `[data-sound-toggle]` and `[data-drift-wake]`. Because `.drift-top` (`top: 16px; right: 16px`) and `.drift-help` (`top: 16px; left: 16px; max-width: 22rem`) occupy the exact same top horizontal band without collision avoidance, they collide across **every mobile and tablet viewport** in both languages. Simultaneously, `.drift-zones` (`flex-wrap: wrap`) stacks into **2 rows in English** and **4 full vertical rows in French** on mobile portrait screens.

| Locale | Viewport | Pointer | `.drift-top` Box `(x, y, w, h)` | `.drift-help` Box `(x, y, w, h)` | `.drift-compass` Box `(x, y, w, h)` | Top HUD Overlap (`px²`) | Zone Strip Rows | Union HUD Coverage |
|---|---|---|---|---|---|---|---|---|
| `en` | `375×667` | `coarse` | `(0, 16, 359, 60)` | `(16, 16, 352, 128)` | `(0, 527, 375, 132)` | **`20,580 px²`** (`343×60`) | `2` rows | **`38.19%`** |
| `fr` | `375×667` | `coarse` | `(0, 16, 359, 60)` | `(16, 16, 352, 146)` | `(0, 431, 375, 228)` | **`20,580 px²`** (`343×60`) | **`4` rows** | **`55.11%`** |
| `en` | `390×844` | `coarse` | `(0, 16, 374, 60)` | `(16, 16, 352, 128)` | `(0, 704, 390, 132)` | **`21,120 px²`** (`352×60`) | `2` rows | **`29.73%`** |
| `fr` | `390×844` | `coarse` | `(0, 16, 374, 60)` | `(16, 16, 352, 146)` | `(0, 608, 390, 228)` | **`21,120 px²`** (`352×60`) | **`4` rows** | **`43.03%`** |
| `en` | `820×1180` | `coarse` | `(366.77, 16, 437.23, 44)` | `(16, 16, 352, 128)` | `(0, 1088, 820, 84)` | **`54.12 px²`** (`1.23×44`) | `1` row | `13.76%` |
| `fr` | `820×1180` | `coarse` | `(265.97, 16, 538.03, 44)` | `(16, 16, 352, 146)` | `(0, 1040, 820, 132)` | **`4,489.32 px²`** (`102.03×44`) | **`2` rows** | `18.48%` |
| `en` | `1440×900` | `fine` | `(1188.38, 16, 235.63, 44)` | `(16, 16, 352, 128)` | `(0, 808, 1440, 84)` | `0 px²` | `1` row | `13.61%` |
| `fr` | `1440×900` | `fine` | `(1129.58, 16, 294.42, 44)` | `(16, 16, 352, 146)` | `(0, 808, 1440, 84)` | `0 px²` | `1` row | `14.30%` |
| `en` | `1920×1080` | `fine` | `(1668.38, 16, 235.63, 44)` | `(16, 16, 352, 128)` | `(0, 988, 1920, 84)` | `0 px²` | `1` row | `10.45%` |
| `fr` | `1920×1080` | `fine` | `(1609.58, 16, 294.42, 44)` | `(16, 16, 352, 146)` | `(0, 988, 1920, 84)` | `0 px²` | `1` row | `10.88%` |

**Key Geometric Observations:**
1. **Severe French Mobile Occlusion (`fr:375×667` & `fr:390×844`):** On a `375×667` French iPhone SE, `.drift-help` extends down to `y = 162 px` while `.drift-compass` (with 4 vertically stacked zone buttons) rises up to `y = 431 px`, leaving only a `269 px` central band (`44.89%` of the screen) for the 3D artwork while `.drift-top` sits directly over the opening sentences of `.drift-help` (`20,580 px²` collision).
2. **Unanticipated Tablet Touch Collision (`820×1180`):** Because tablets match `(pointer: coarse)` and expose `DeviceOrientationEvent`, `[data-drift-tilt]` un-hides and widens `.drift-top` to `538.03 px` in French, colliding by `102.03 × 44 px` (`4,489.32 px²`) with `.drift-help` even on an iPad screen, while French zone pills also wrap onto `2` rows at `820 px`.
3. **Threshold Screen Integrity:** Across all 10 `(locale × viewport)` runs, `.drift-top`, `.drift-threshold-line`, and `[data-threshold-enter]` exhibit **`0` bounding-box overlaps**.
4. **Awake Header vs Page Column Drift on Wide Screens:** Because `.page` is centered at `max-width: 72rem` (`1152 px`) while `.site-header` and `<footer>` span `100%` of the viewport, the header's left signature drifts **`144 px`** outside the content column at `1440×900` and **`384 px`** outside at `1920×1080` (with the right navigation links mirrored `384 px` past the right content margin).

### 2.2 Interactive Touch & Pointer Target Audit (`WCAG 2.5.8 AA` & `44×44 px` Thumb Comfort)

While `.drift button` and `.drift-zone-pill` enforce `min-height: 44px` (`10/10` passing on coarse pointers, `9/9` on desktop where `[data-drift-tilt]` is hidden), standalone `<a>` controls across `Header.astro`, `Footer.astro`, `WorksIndexPage.astro`, `WorkPage.astro`, and `FocusOverlay` lack block padding or minimum target sizing:

| Control Group | Sampled Selector | Rendered Size (`en` / `fr`) | WCAG 2.5.8 (`≥ 24×24 px`) | Coarse Comfort (`≥ 44×44 px`) |
|---|---|---|---|---|
| Drift top & zone buttons | `.drift-top button`, `[data-zone-pill]`, `[data-focus-close]` | `76–218 × 44–60 px` | Pass | Pass |
| Header signature | `.site-header .signature` | `134.41 × 21 px` | **Fail (`21 px` tall)** | **Fail (`21 px` tall)** |
| Header section links | `.site-header nav a` (`Works`, `Exhibitions`, `About`, `Contact`) | `42–92.41 × 18 px` | **Fail (`18 px` tall)** | **Fail (`18 px` tall)** |
| Header locale switch | `.site-header nav a[hreflang]` (`FR` / `EN`) | **`16.81 × 18 px`** | **Fail (both axes `< 24 px`)** | **Fail (both axes `< 44 px`)** |
| Footer legal link | `footer a` | `100.81–134.41 × 18 px` | **Fail (`18 px` tall)** | **Fail (`18 px` tall)** |
| Works index territory filters | `.works-index nav a` | `84.58–147.33 × 20 px` | **Fail (`20 px` tall)** | **Fail (`20 px` tall)** |
| Work detail CTAs | `[data-drift-link]`, `.work a[href*="contact"]` | `107.53–254.38 × 18–20 px` | **Fail (`18–20 px` tall)** | **Fail (`18–20 px` tall)** |
| Work `prev / next` links | `.prev-next a` | `78–190 × 45 px` (2 stacked text lines) | Pass (`45 px` tall) | Pass (`45 px` tall) |
| `FocusOverlay` links | `[data-focus-work]`, `[data-focus-contact]` | `135.09–254.38 × 20 px` | **Fail (`20 px` tall)** | **Fail (`20 px` tall)** |

- **Aggregate Fine-Pointer Target Pass Rate (`1440×900`, `1920×1080`):** **`9 / 22` (`40.91%`)** meet `24×24 px`.
- **Aggregate Coarse-Pointer Target Pass Rate (`375×667`, `390×844`, `820×1180`):** **`10 / 23` (`43.48%`)** meet `44×44 px`.

### 2.3 Cross-Site Wayfinding Capability Matrix (`0 / 8` Passing at Baseline)

| Check ID | Capability Tested | Observed Baseline (`en` & `fr`) | Status |
|---|---|---|---|
| `globalDriftEntry` | 1-click Drift entry from non-Home Awake routes when `mode === 'awake'` | Header has no Drift link; visitor must click `iknowyoucanseeme` (`/{lang}/`) then click `[data-drift-start]` (**`2` clicks**) | **Fail** |
| `reversibleWorksFilter` | 1-click reset of `#territory` `:target` filter to all 40 works + photo/ceramic medium filter | Clicking `#dreamland` hides *The border is thin*, stranding view at **`28 / 40` works** with `0` reset links and `0` medium controls | **Fail** |
| `workBreadcrumbAndContext` | Top hierarchy breadcrumb (`Works → Territory → Zone`), `i / N` sequence position, thumbnail `prev/next` | `0` top breadcrumbs, `0` sequence counters, territory link buried near bottom, `0` `prev/next` thumbnails | **Fail** |
| `territoryContinuity` | In-page `#zone-*` jump bar, territory Drift portal link, cross-territory continuation | `0` `#zone-*` jump links (`<section class="zone">` lacks `id`), `0` Drift links in `<main>`, `0` links to sibling territory | **Fail** |
| `awakeWakeContinuity` | Clicking `Wake up` from `/?w=<slug>` preserves a visible link to that work's Awake page | Waking up from `/?w=venise-portrait-5` lands on Awake Home where `venise-portrait-5` has **`0` visible links** | **Fail** |
| `driftGuidedStepping` | Visible clickable/tappable `Previous / Current (i / N) / Next` work stepper in Drift HUD | `[data-drift-works]` buttons have `opacity: 0; pointer-events: none` until `Tab × 3`; `0` visible stepper buttons | **Fail** |
| `tactileLensControl` | Visible 1-tap/click camera Lens indicator & cycle button in Drift HUD | Requires memorised `L` key or 500 ms motionless touch hold; `0` clickable lens controls | **Fail** |
| `focusInPlaceBrowsing` | `FocusOverlay` displays curatorial metadata (year, size, medium, availability) + `Prev / Next` buttons | Non-specimen works show title + poetic fragment only (`0` year/size/medium/availability lines) and `0` in-dialog step buttons | **Fail** |

---

## 3. Seven-Persona Sociological Field Study & Lived Walkthroughs

### Summary Scoreboard (Baseline)

| Persona ID | Archetype | Primary Locale & Viewport | Pointer | Collision Score | Clearance Score | Target Score | Wayfinding Score | **Baseline UX Score** |
|---|---|---|---|---|---|---|---|---|
| `curator` | Contemporary Art Curator & Open-Call Juror | `fr` · `1440×900` | `fine` | `6.00 / 6` | `6.00 / 6` | `4.91 / 12` | `0 / 76` | **`16.91 / 100`** |
| `instagram-mobile` | Mobile Social Follower (Link-in-Bio) | `en` · `390×844` | `coarse` | `0.00 / 16` | `8.82 / 10` | `7.83 / 18` | `0 / 56` | **`16.64 / 100`** |
| `collector` | Collector & Patron Evaluating Physical Works | `fr` · `820×1180` | `coarse` | `2.01 / 8` | `8.00 / 8` | `6.96 / 16` | `0 / 68` | **`16.97 / 100`** |
| `peer-artist` | Fellow Photographer & Ceramic Artist | `en` · `1440×900` | `fine` | `8.00 / 8` | `10.00 / 10` | `4.09 / 10` | `0 / 72` | **`22.09 / 100`** |
| `gallery-qr` | Physical Exhibition QR Wall-Label Visitor | `fr` · `390×844` | `coarse` | `0.00 / 14` | `5.49 / 10` | `6.96 / 16` | `0 / 60` | **`12.45 / 100`** |
| `non-gamer` | Non-Gamer Cultural Visitor & Exhibition Goer | `en` · `1440×900` | `fine` | `10.00 / 10` | `8.00 / 8` | `4.91 / 12` | `0 / 70` | **`22.91 / 100`** |
| `keyboard-a11y` | Keyboard-Only, Screen-Reader & Motion-Sensitive Visitor | `en` · `1440×900` | `fine` | `10.00 / 10` | `6.00 / 6` | `5.73 / 14` | `0 / 70` | **`21.73 / 100`** |

---

### Persona 1: `curator` — Pressed Contemporary Art Curator & Open-Call Juror (`16.91 / 100`)

- **Sociological Posture:** Reviews 45 residency applications in one afternoon in French on a `1440×900` studio display (~90 seconds per dossier). Immediately clicks **Se réveiller** on the Threshold to inspect the structured Awake catalogue, exhibition history, and curatorial statements.
- **Lived Session Transcript:**
  1. Clicks `Se réveiller` (`iknowyoucanseeme:mode = 'awake'`), then navigates to `/fr/oeuvres/`. Header links sit `144 px` left/right of the `.page` margin at `18 px` height.
  2. Clicks `Dreamland` (`#dreamland`). CSS `.works-index:has(section:target) section:not(:target)` hides *La frontière s'efface*, dropping the grid from `40` works to `28`. When she wants to see all 40 works again or isolate the 4 ceramic pieces mentioned in the artist's biography (`Photographe et artiste céramiste`), there is **no reset control** and **no photography-vs-ceramics filter**.
  3. Opens `/fr/oeuvres/solitude/`. On `1440×900`, the large vertical image pushes `<h1>Solitude</h1>`, dimensions, and medium below the initial scroll fold; there is no top breadcrumb indicating zone (*Arrivée*) or sequence (`2 / 28`), and `Œuvre précédente / Œuvre suivante` at the bottom lack visual thumbnails.
  4. Having verified the CV on `/fr/expositions/` and biography on `/fr/a-propos/`, she decides to spend her final 20 seconds experiencing the 3D installation—but the header contains **no `Dériver` link**. Clicking `iknowyoucanseeme` only returns to Awake Home because her `'awake'` preference is stored; she must hunt for the inline `Dériver` button (`2` hops).

### Persona 2: `instagram-mobile` — Mobile Social Follower (`16.64 / 100`)

- **Sociological Posture:** Taps `iknowyoucanseeme.xyz` from Instagram's in-app browser on an iPhone (`390×844`, and `375×667` on compact devices), holding the phone one-handed with a coarse right thumb.
- **Lived Session Transcript:**
  1. Taps **Enter** on the Threshold. Immediately upon entering the Drift, `.drift-top` (`3 buttons`: `Mute sound`, `Wake up`, `Move with the phone`, spanning `374 × 60 px`) renders directly on top of `.drift-help` (`352 × 128 px`), producing **`21,120 px²` of text-on-button collision** (`20,580 px²` on `375×667`).
  2. At the bottom of the screen, `.drift-zones` wraps onto `2` stacked rows in English (`132 px` total compass height) and **`4` stacked rows in French (`228 px` tall, `43.03%` total viewport occlusion on `390×844` and `55.11%` on `375×667`)**.
  3. Swiping drags the camera slightly, but because works sit staggered in 3D fog without a thumb-reachable `‹ Prev · Current · Next ›` bar, tapping off-center misses raycast targets, and discovering the 5 mobile camera lenses requires an undocumented 500 ms motionless press without dragging (`0` visible lens buttons).
  4. Tapping a work opens `FocusOverlay`, where `See the work page` and `Ask about this work` render at `20 px` height (`< 44 px`), and viewing the next work forces closing the modal and dragging again.

### Persona 3: `collector` — Collector & Patron Evaluating Physical Works (`16.97 / 100`)

- **Sociological Posture:** Explores the exhibition on an iPad (`820×1180`, `pointer: coarse`, French & English) and later on a desktop monitor, looking for physical objecthood: pigment print dimensions, ceramic editions, year, and availability status.
- **Lived Session Transcript:**
  1. Enters `/fr/` on iPad (`820×1180`). Because iPadOS exposes touch and device orientation, `[data-drift-tilt]` (`Bouger avec le téléphone`) appears in `.drift-top` (`538.03 px` wide), colliding with `.drift-help` across `102.03 × 44 px` (`4,489.32 px²`), while French zone pills wrap onto `2` rows.
  2. Taps *Solitude* to open `FocusOverlay`. The modal displays the image, title, and poetic fragment, **omitting dimensions, medium, year, and availability status** (`focusCuratorialMetaVisible = false`), and provides **no `Previous / Next` buttons** to compare works side-by-side in the dialog.
  3. Follows `Voir la page de l'œuvre` (`20 px` tall touch target, `< 44 px`) to `/fr/oeuvres/solitude/`, reads the metadata and availability status, then visits `/fr/oeuvres/` hoping to view all ceramic works together—only to find ceramics mixed invisibly at the bottom of *Dreamland* with no medium filter.

### Persona 4: `peer-artist` — Fellow Photographer & Ceramic Artist (`22.09 / 100`)

- **Sociological Posture:** Contemporary photographer and ceramist on a `1440×900` laptop (`en`) drawn by Usoltsev's in-camera techniques (mirror folds, custom colour gels, ICM, multiple exposure) and clay specimens.
- **Lived Session Transcript:**
  1. Desktop Drift layout has `0` HUD collisions and `13.61%` chrome coverage, so the 3D boreal curtains and fog read cleanly.
  2. Hovering a photograph activates its default lens, yet `[data-drift-lens]` stays invisible whenever the pointer leaves a mesh, and cycling across all 6 shaders (`gel`, `mirror`, `exposure`, `fracture`, `flare`, `icm`) depends entirely on noticing `"L or a long press changes the lens"` inside a dense two-paragraph block (`0` interactive lens pill).
  3. Visits `/en/territories/dreamland/` to read the three-part curatorial progression (*Arrival → Lens → Leak*). The long page offers **no top `#zone-*` jump links** to skip straight to *Leak*'s ceramic sketches, **no `"See in the drift"` portal** per zone/territory, and ends abruptly at the footer with **no continuation card** into *The border is thin* (2026 ICM & solar eclipse series).

### Persona 5: `gallery-qr` — Physical Exhibition QR Wall-Label Visitor (`12.45 / 100`)

- **Sociological Posture:** Visitor standing inside the gallery who scans a printed wall-label QR code (`/fr/oeuvres/<slug>/` or `/fr/?w=<slug>`) on a `390×844` smartphone in French. Records the **lowest baseline score (`12.45 / 100`)** due to compounding mobile French HUD collisions and broken Drift ↔ Awake work handoff.
- **Lived Session Transcript:**
  1. Scanning a work label opens `/fr/oeuvres/solitude/` (`Voir dans la dérive` link is `20 px` tall, `< 44 px`, and the page lacks a zone/sequence header orienting where the piece sits within the show).
  2. Taps `Voir dans la dérive` (`/fr/?w=solitude`), clicks `Entrer` on the short threshold, and encounters the `21,120 px²` French `.drift-top` / `.drift-help` overlap plus the `4`-row `228 px` zone stack (`43.03%` screen occlusion).
  3. Drifts slightly to a Leak portrait (`/fr/?w=venise-portrait-5`) and taps **Se réveiller** to read its full Awake page quietly—landing on `/fr/?w=venise-portrait-5` (Awake Home), which displays generic featured teasers and **drops `venise-portrait-5` completely** (`wakePreservesSettledWorkLink = false`).

### Persona 6: `non-gamer` — Non-Gamer Cultural Visitor (`22.91 / 100`)

- **Sociological Posture:** Regular museum visitor on a `1440×900` desktop using a standard mouse without scroll-wheel inertia habits, 3D drag-and-steer muscle memory, or gamer keyboard reflexes (`WASD` / `Tab` / `L` / `Shift`).
- **Lived Session Transcript:**
  1. Enters the Drift and sees 4–6 atmospheric works suspended at staggered depths. Clicking a distant, semi-transparent apparition before drifting close enough does not advance along the path; `.drift-zones` jumps across entire zones, leaving **no mouse-clickable `‹ Previous · Current (1 / 40) · Next ›` work stepper** to glide methodically from piece to piece.
  2. Opens `FocusOverlay` on the nearest work (`Arrivée`), expecting carousel-style `‹ / ›` arrows to browse the exhibition at her own pace—none exist, forcing repeated open/close/drag cycles.
  3. Escapes to the Awake layer (`/en/works/`), clicks `#the-border-is-thin`, cannot find an `"All works"` button to undo the filter, and later on `/en/exhibitions/` sees no header button to re-enter the 3D world.

### Persona 7: `keyboard-a11y` — Keyboard-Only, Screen-Reader & Motion-Sensitive Visitor (`21.73 / 100`)

- **Sociological Posture:** Navigates via `Tab`, `Shift+Tab`, `Enter`, `Escape`, and arrow keys, or activates **Wake up** immediately under `prefers-reduced-motion: reduce` (honoring ADR 0009, where reduced motion does not hide the artwork automatically, making `Wake up` the primary agency control).
- **Lived Session Transcript:**
  1. Existing accessibility foundations are solid: `0` axe violations, polite live regions (`[data-drift-said]`, `[data-drift-lens]`, `.drift-compass-here`), and `Tab × 3` (`Mute` → `Wake up` → nearest work in `[data-drift-works]`).
  2. However, when arriving on a shared deep link (`/?w=venise-portrait-5`) and activating **Wake up** to avoid WebGL motion, focus lands on `[data-drift-start]` on Awake Home with **no adjacent `[data-awake-resume]` link** to open the Awake page of `venise-portrait-5`—forcing the visitor to traverse the entire site index to relocate the work.
  3. Inside `FocusOverlay`, `ArrowLeft` / `ArrowRight` do not step between works; on Awake pages, `13 / 22` standalone links fail the WCAG 2.5.8 AA `24×24 px` target-size threshold (notably the `16.81 × 18 px` language switcher), and `WorkPage` lacks a `<nav class="work-breadcrumb">` landmark for structural screen-reader orientation.
