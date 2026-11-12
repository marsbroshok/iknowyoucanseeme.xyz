# Exhibition mode (gallery screens)

The site has an exhibition mode for a screen or tablet in a gallery: the
drift runs by itself, visitors can play with it, and it goes back to its
start when they leave. Nothing is installed; it is the normal website with
`?kiosk=1` added to the address.

## Addresses

| Screen language | Address |
|---|---|
| English | `https://www.iknowyoucanseeme.xyz/en/?kiosk=1` |
| French | `https://www.iknowyoucanseeme.xyz/fr/?kiosk=1` |

## What the mode does

- **Straight into the world.** No threshold screen and no click needed; the
  drift starts at the beginning of the path (Dreamland · Arrival) on any
  device that can show the world (WebGL2). A stored "Wake up" choice on that
  browser is ignored, and pressing "Wake up" in the mode is not remembered.
- **Drifts by itself.** After 10 s without anyone touching the screen, the
  camera glides to the next work along the zone path (Arrival → Lens →
  Leak, then the next territory), one work every 12 s, and starts over
  after the last one.
- **Back to the start.** 90 s after the last touch, click, key or scroll,
  the screen closes any open work, goes back to the world if a visitor woke
  up, and returns to the start of the path. An untouched screen is never
  reset (it is already there).
- **No cursor.** The mouse cursor hides after 5 s without movement and comes
  back when the mouse moves.
- **Sound after the first tap.** Browsers allow sound only after a gesture:
  the first tap, click or key press on the screen starts it. Until then the
  world is silent. "Mute sound" stays visible.
- **No way out.** Every link on the page is taken out (no external sites,
  no other pages), so a visitor cannot leave the drift. In the dialog of a
  work, the links and the contact form are replaced by a **QR code** to the
  work's page in the screen language: visitors scan it with their phone to
  read more or ask about the work there.
- **The leak is local.** Drift time on the gallery screen colours the
  awake pages of that browser only (see "Clear the leak" on the legal page).

## Setting up a screen

1. Use a recent Chrome or Edge (or Safari on an iPad) on a device with a
   real graphics chip; open one of the addresses above once to check that
   the world appears (not the still "awake" page).
2. Full screen, without browser controls:
   - Chrome / Edge on a computer: start the browser in kiosk mode, e.g.
     `chrome --kiosk "https://www.iknowyoucanseeme.xyz/en/?kiosk=1"`
     (Edge: `msedge --kiosk "…" --edge-kiosk-type=fullscreen`).
   - iPad: add the address to the home screen, open it from there, and use
     Guided Access (Settings → Accessibility → Guided Access) to lock the
     screen to it.
   - Android tablet: Chrome → "Add to home screen", then screen pinning
     (Settings → Security → App pinning).
3. Turn off sleep and screen lock in the device settings, and plug it in.
4. Speakers: set the device volume once; the site never goes above −12 dBFS.
5. Tap the screen once after opening, so sound can start.

## Checking that it works

- Leave the screen alone for 10 s: the camera should start gliding.
- Open a work (tap it): a QR code shows instead of links. Scan it with a
  phone: the work's page opens in the screen language.
- Leave it alone for 90 s: the work closes and the drift starts again at
  the beginning.

## Notes

- The QR codes are made at build time (`tools/kiosk/KioskQrIntegration.ts`,
  files under `/qr/<lang>/<slug>.svg`). They do not exist in `npm run dev`;
  use `npm run build` and serve `dist/` to try the mode locally.
- Timing lives in `src/kiosk/KioskState.ts` (`KIOSK`); the page wiring in
  `src/kiosk/KioskMode.ts` and `src/world/island/DriftBoot.ts`. Design
  notes: `docs/adr/0012-leak-specimens-and-exhibition-mode.md`.
