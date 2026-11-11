# Spec: Awake Layer Pages

**Track ID:** `awake-layer_20261111` · **Type:** Feature · **Phase:** 1 · **Depends on:** `astro-foundation_20261111`

## Overview

Build the plain, fast, bilingual "awake" layer: the canonical HTML for every work, territory and page. It serves curators, search engines, reduced-motion users and weak devices, and is what the WebGL world enhances later.

## Functional Requirements

- **FR1 Awake home `/{lang}/`:** signature, one-line threshold text, the two territories as entry blocks (statement excerpt + 3 works), links to About, Exhibitions, Contact. This page will later host the drift world (progressive enhancement), so its HTML must stay meaningful on its own.
- **FR2 Territory pages `/{lang}/territories|territoires/<slug>/`:** statement, then works grouped by zone (Dreamland: Arrival → Lens → Leak) with zone statements.
- **FR3 Work pages `/{lang}/works|oeuvres/<slug>/`:** large image(s), FR title (+ EN subtitle on the EN site), fragment, metadata line (size · year · medium · techniques), availability line ("contact for availability" for anything not marked sold/not-for-sale, never a price), a contact link pre-filled with the work, prev/next within the territory, and "see it in the drift" placeholder (enabled in `drift-world`).
- **FR4 Works index `/{lang}/works|oeuvres/`:** plain list of all works (thumbnail, title, territory, year), filterable without JS by territory via anchors.
- **FR5 Exhibitions `/{lang}/exhibitions|expositions/`:** reverse-chronological CV list.
- **FR6 About `/{lang}/about|a-propos/`:** bio, 2019 origin story, portrait (if provided; otherwise none), exhibitions summary.
- **FR7 Contact `/{lang}/contact/`:** Web3Forms form (name, email, message, hidden `work` field pre-filled from `?work=<slug>`, honeypot), success/failure states, visible email fallback `marsbroshok+iknowyoucanseeme@gmail.com`. Access key from `PUBLIC_WEB3FORMS_KEY`; **if the key is absent the form is not rendered and only the email is shown** (explicit, documented behaviour, not a silent fallback).
- **FR8 Legal `/{lang}/legal|mentions-legales/`:** © all rights reserved, image use, cookieless analytics note, publisher identity.
- **FR9 SEO:** per-page title/description, JSON-LD (`Person` on About; `VisualArtwork` on work pages with `artMedium`, `width`, `height`, `dateCreated`, `creator`), `sitemap.xml` with hreflang, `robots.txt`.
- **FR10 OG images:** per work, a 1200×630 JPEG generated at build (work image on `--ink` with title in Fraunces), via a tested build script.

## Non-Functional Requirements

- Lighthouse on home, a territory and a work page: Performance ≥ 95 (mobile), Accessibility 100, SEO 100.
- WCAG 2.2 AA; axe zero violations on every route (e2e iterates over all generated routes).
- Zero JS except contact form enhancement (≤ 3 KB, progressive: the form also works as a plain POST).

## Acceptance Criteria

1. Every kept work has EN and FR pages, reachable from the index and its territory.
2. No page contains a price or "€" (guard test over `dist/`).
3. Contact form posts to Web3Forms with the work slug when a key is present; email-only mode when absent (both covered by e2e).

## Assumptions

- Publisher identity on the legal page = artist name + contact email (no postal address published).

## Out of Scope

- The WebGL world, sound, leak effect, deployment.
