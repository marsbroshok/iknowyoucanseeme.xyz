# Spec: Ceramic Specimens in 3D (BLOCKED)

**Track ID:** `ceramics-3d_20261111` · **Type:** Feature · **Phase:** 4+ · **Depends on:** `leak_20261111` · **Status:** blocked (waiting for finished ceramics and photogrammetry scans)

## Overview

When finished ceramics exist, 3–5 key pieces are scanned (Polycam / RealityScan on a phone), exported as glTF, and float as rotatable specimens in the Leak zone, with turntable videos as the fallback.

## Functional Requirements (draft)

- **FR1 Intake extension:** `intake generate` accepts `intake/ceramics/<slug>/{model.glb, turntable.mp4, photos/*}`; models are optimised (Meshopt/Draco, texture ≤ 2048 px) and validated (glTF validator, triangle and size budgets).
- **FR2 Specimen viewer:** `GLTFLoader` + lazy decoder; slow idle rotation; drag to rotate; lens modes adapted for 3D (filter, light leak).
- **FR3 Awake layer:** turntable video (muted, loop, poster) plus photos on ceramic work pages; `medium: ceramic`.

## Unblock Conditions

- At least 3 finished pieces photographed (`intake/ceramics/`), and at least 1 scan exported as `.glb`.

## Out of Scope

- Scanning itself (human activity).
