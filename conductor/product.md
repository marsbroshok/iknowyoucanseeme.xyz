# Product Definition — iknowyoucanseeme: Dreamland

## Vision

An immersive, bilingual (FR/EN) online artwork by photographer and ceramic artist **Alexander Usoltsev**. The site *is* Dreamland: a WebGL drift field where his photographs are the landscapes of an inner dream-home, and his ceramics are the flora, fauna and artifacts that have leaked into our world. Visitors wander non-linearly through three zones (**Arrival**, **Lens**, **Leak**) with a lens-like cursor and generative sound. A plain **awake layer** gives curators, search engines and low-power devices fast access to works, statements, CV and contact.

## Problem Statement

The current site (Hugo Blox academic/blog starter) reads like a hobby tech blog: template SEO defaults, developer-blog navigation, a generic "quirky" voice, an unfinished Dreamland page with placeholders, and no ceramics at all. It contradicts the artist's conceptual practice, which is about exile, home as an internal dreamscape, permeable borders, and the camera as an instrument of transformation.

## Artistic Premise (source: *Dreamland* exhibition statement)

- Home is not a physical place but the internal landscape of the dream.
- The border is permeable: memory and present merge; the alien becomes familiar, the familiar becomes strange.
- The camera transforms: custom filters, mirrors and multiple exposures render familiar archetypes in an unfamiliar language.
- The exhibition is a journey of perception: a disorienting **arrival** into vast colour fields, then a **lens** that sharpens to specific alien flora, fauna and fractured physics.
- *"The border is blurred, the realities are mixing, and the Dreamland is leaking into our world."*

## Core Concept

**One world.** Dreamland is the territory. Photographs = its landscapes. Ceramics = physical evidence (flora, fauna, artifacts) that leaked out of it. The site is the first territory of a wider *iknowyoucanseeme* universe; future series become new territories at the edge of the fog.

## Territories

| # | Territory (EN / FR) | Content | Source |
|---|---|---|---|
| 1 | **Dreamland** / **Dreamland** | The 15 catalogue works of the *Dreamland* exhibition (Atelier 51, 16–30 Oct 2025) across the Arrival and Lens zones. The Leak zone holds the Venice colour-leak portraits (consent confirmed) as Dreamland's "inhabitants" and unfired clay creatures as first "sketches" of its fauna, until finished ceramics exist | Catalogue PDF + Instagram 2025 |
| 2 | **The border is thin** / **La frontière s'efface** | 2026 work: ICM birds and swans in autumn (with Jiří Hřebíček) and the solar eclipse torn apart by mirrors and filters | Instagram 2026 |

The territory 2 title comes from the artist's own caption: *"There is a border between these worlds, but if you point the camera in the right direction and apply some pressure, it will thin out and reveal what's out there."*

## Origin of the Name (2019)

The hashtag *#iknowyoucanseeme* began with the 2019 group show *L'Emprunt, la Citation* (MPAA, 100 rue Didot, Paris, vernissage 12 Dec 2019): black-and-white portraits colourised by an AI that "hallucinated" their colours and exposed its biases. The gaze was originally the machine's. This story is told in About and informs the gaze moments. There is no full archive of older series.

## Exhibitions (known)

- *L'Emprunt, la Citation*, MPAA, Paris, Dec 2019 (group).
- *Dreamland*, Atelier 51, 16–30 Oct 2025 (solo).

## Identity

- **Artist name:** Alexander Usoltsev (leads).
- **Signature / domain / universe:** iknowyoucanseeme (`iknowyoucanseeme.xyz`).

## The Gaze ("I know you can see me")

The name is a reversal of the gaze: the dream watches back. The world quietly *notices* the visitor. Apparitions turn toward a lingering cursor, and in rare moments a line surfaces: *"I know you can see me" / « Je sais que tu me vois »*. It is used once at the threshold and sparingly after that, never as a gimmick.

## Audiences

| Audience | Need | Served by |
|---|---|---|
| Instagram followers (mostly mobile) | Be enchanted, linger, share a work | Drift world, tilt-to-drift, per-work share URLs |
| Curators, galleries, open calls | CV, statement, works list in seconds | Awake layer |
| Collectors / the curious | Ask about a work | Per-work "contact for availability" form |
| Search engines / AI crawlers | Indexable text | Awake layer is the canonical HTML |

## Primary Goals

1. The site functions as an **artwork**, not a shop. Sales are irrelevant to the design; **no prices are shown**.
2. Unify photography and ceramics into one coherent artistic message.
3. Express the Dreamland statement through interaction: drifting, the lens, the leak.
4. Stay maintainable by the artist through files in git (with AI assistance).

## Key Features

### The Threshold (first screen)
- Near-black night-blue void, one quiet line of text (FR/EN), and a single slowly breathing colour leak.
- Clicking **Entrer / Enter** unlocks sound and starts the drift. A small **Se réveiller / Wake up** link to the awake layer is always visible.

### The Drift (immersive world)
- Continuous foggy WebGL field navigated by scroll, drag or device tilt; non-linear; works appear as apparitions on approach.
- Three soft zones mirroring the exhibition:
  1. **Arrival:** vast atmospheric colour fields (e.g. *Immersion I/II, Solitude, Arrivée*).
  2. **Lens:** sharper, specific flora and fauna (e.g. *Les Reflets I–III, La Frontière s'estompe, Un Étranger*).
  3. **Leak:** ceramics as specimens; the threshold back to "our world".
- A faint horizon/compass so visitors are never truly lost.
- **Lens interaction:** the cursor/finger emulates the artist's camera techniques over works: custom colour filters/gels, mirror fold/kaleidoscope, multiple exposure (blending with another work), fracture & re-collage, light leaks/lens flare, and motion blur/ICM.
- **Text in the world:** no paragraphs. Fragments of the statement and work fragments surface near works like overheard thoughts, and reading them all reconstructs the statement.
- **Sound:** generative WebAudio ambience reacting to position, layered with the artist's field recordings; starts only on a threshold click.

### The Awake Layer (plain HTML)
- Works index (title FR/EN, year, size, medium, series/zone), per-work pages.
- Series statements, exhibitions & CV (e.g. Atelier 51, 16–30 Oct 2025), about/portrait, contact.
- **The Leak:** the longer someone drifts, the more dream colour and stray apparitions stain the awake pages, without ever hurting legibility.
- Automatic fallback for weak devices, save-data and bots. `prefers-reduced-motion` does **not** switch to the awake layer (artist decision, 2026-11-12): the always-visible **Wake up / Se réveiller** control is the way out for anyone who does not want movement.

### Cross-cutting
- Bilingual FR + EN with per-work URLs (`/fr/oeuvres/<slug>`, `/en/works/<slug>`) and share images.
- Contact: per-work pre-filled form via a static form service, plus a visible email fallback.
- Cookieless analytics (GoatCounter).
- **Exhibition companion:** a QR code per work (printable wall labels) opens that work in the world (Phase 1). An **exhibition/kiosk mode** for a gallery screen or tablet comes later.
- Images: no watermark, served at ≤ 2400 px in modern formats; © all rights reserved.

## Content Model

`territories → zones → works`, plus `exhibitions`, `pages`, `audio`.
Work fields: `slug, title_fr, title_en, territory, zone, year, medium (photo | ceramic), techniques[], size, availability, fragment_fr, fragment_en, images[], dominant_palette (build-time)`.

## Ceramics Roadmap

Phase 1: photographs + short turntable videos as floating specimens. Later: 3–5 photogrammetry scans exported as glTF, rotatable in WebGL.

## Delivery Phases

0. **Intake:** Instagram export, Dreamland originals, catalogue → content files, draft texts.
1. **Awake layer → GO LIVE** (replaces the old site; old Hugo tagged `legacy-hugo`).
2. **The Drift:** world, zones, lens, mobile tilt, deep links.
3. **Sound.**
4. **The Leak & ceramic specimens**, then 3D scans.

## Non-Goals

- E-commerce, checkout, or public prices.
- A blog/journal (may be revisited later).
- Watermarks or heavy image DRM.
- A visual CMS (content lives in git).

## Success Criteria

**Artistic (what matters to the artist):**
- **People linger:** median drift time and number of works approached per visit (GoatCounter events).
- **Curators and galleries reach out:** contact-form inquiries and exhibition invitations.

**Technical:**
- The old Hugo site is fully replaced; no template defaults remain.
- Every catalogued work is reachable both in the world and as an awake-layer page in FR and EN.
- First meaningful view in < 2.5 s on 4G; Lighthouse ≥ 95 on awake pages; world ≥ 60 fps desktop and ≥ 40 fps on a mid-range phone.
