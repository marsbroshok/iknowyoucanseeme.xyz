import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * The sound in Chromium (keyed build with `window.__driftDebug`, port 4326),
 * "consent for the senses": no AudioContext exists before the visitor's
 * gesture (Enter on the threshold, or Drift on the awake page), the mute
 * toggle is always visible and remembered across reloads, and a hidden tab
 * suspends the audio. AudioContexts are counted by an init script that
 * wraps the constructor before any page script runs (test-side only).
 */
const KEYED = 'http://localhost:4326';

interface AudioLog {
  created: number;
  states: () => string[];
}
interface SoundDebug {
  state: string;
  muted: boolean;
  weights: Record<string, number>;
}

/** Counts AudioContexts and lets the test read their states. */
async function watchAudio(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const contexts: AudioContext[] = [];
    const Native = window.AudioContext;
    window.AudioContext = class extends Native {
      constructor(options?: AudioContextOptions) {
        super(options);
        contexts.push(this);
      }
    };
    (window as unknown as { __audio: AudioLog }).__audio = { get created() { return contexts.length; }, states: () => contexts.map((c) => c.state) } as AudioLog;
  });
}

const created = (page: Page) => page.evaluate(() => (window as unknown as { __audio: AudioLog }).__audio.created);
const states = (page: Page) => page.evaluate(() => (window as unknown as { __audio: AudioLog }).__audio.states());
const sound = (page: Page) => page.evaluate(() => (window as unknown as { __driftDebug?: { sound: SoundDebug | null } }).__driftDebug?.sound ?? null);
/** States of the contexts still open (Tone's own import-time context is closed when the engine takes over). */
const open = async (page: Page) => (await states(page)).filter((s) => s !== 'closed');

async function worldReady(page: Page): Promise<void> {
  await page.waitForFunction(() => ((window as unknown as { __driftDebug?: { frames: number } }).__driftDebug?.frames ?? 0) > 5, null, { timeout: 15_000 });
}

/** Hides or shows the tab as the browser would (visibilityState + visibilitychange). */
async function setHidden(page: Page, hidden: boolean): Promise<void> {
  await page.evaluate((h) => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (h ? 'hidden' : 'visible') });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
}

test.describe('Sound', () => {
  test('no AudioContext before Enter; Enter creates and runs one; the mute toggle is visible and accessible', async ({ page }) => {
    await watchAudio(page);
    await page.goto(`${KEYED}/en/`);
    await expect(page.locator('[data-threshold-enter]')).toBeFocused({ timeout: 15_000 });
    await worldReady(page);
    const toggle = page.locator('[data-sound-toggle]');
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveText('Mute sound');
    await page.waitForTimeout(1000);
    expect(await created(page)).toBe(0);
    expect((await sound(page))?.state).toBe('off');
    expect((await new AxeBuilder({ page }).include('[data-drift]').analyze()).violations).toEqual([]);

    await page.locator('[data-threshold-enter]').click();
    await expect.poll(async () => (await sound(page))?.state, { timeout: 10_000 }).toBe('playing');
    await expect.poll(() => open(page)).toEqual(['running']);
    const weights = (await sound(page))?.weights as Record<string, number>;
    expect(Object.values(weights).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
    // The world starts at the head of Dreamland's Arrival zone (TERRITORY_ORDER puts Dreamland first).
    expect(weights.arrival).toBeGreaterThan(0.9);
  });

  test('"Drift" on the awake page is the gesture: it enters and starts the sound', async ({ page }) => {
    await watchAudio(page);
    await page.addInitScript(() => localStorage.setItem('iknowyoucanseeme:mode', 'awake'));
    await page.goto(`${KEYED}/fr/`);
    await page.waitForTimeout(500);
    expect(await created(page)).toBe(0);
    await page.locator('[data-drift-start]').click();
    await expect(page.locator('[data-sound-toggle]')).toHaveText('Couper le son');
    await expect.poll(() => open(page), { timeout: 10_000 }).toEqual(['running']);
  });

  test('mute suspends the audio and is remembered: after a reload the short threshold fades by itself and nothing is created until unmute', async ({ page }) => {
    await watchAudio(page);
    await page.goto(`${KEYED}/en/`);
    await page.locator('[data-threshold-enter]').click({ timeout: 15_000 });
    await expect.poll(() => open(page), { timeout: 10_000 }).toEqual(['running']);
    await page.locator('[data-sound-toggle]').click();
    await expect(page.locator('[data-sound-toggle]')).toHaveText('Unmute sound');
    await expect.poll(() => open(page)).toEqual(['suspended']);

    await page.reload();
    const threshold = page.locator('[data-threshold]');
    await expect(threshold).toHaveAttribute('data-kind', 'short', { timeout: 15_000 });
    await expect(page.locator('[data-threshold-enter]')).toBeHidden();
    await expect(threshold).toBeHidden({ timeout: 3000 });
    await expect(page.locator('[data-sound-toggle]')).toHaveText('Unmute sound');
    await worldReady(page);
    expect(await created(page)).toBe(0);

    await page.locator('[data-sound-toggle]').click();
    await expect(page.locator('[data-sound-toggle]')).toHaveText('Mute sound');
    await expect.poll(() => open(page), { timeout: 10_000 }).toEqual(['running']);
  });

  test('a returning visitor with sound on still clicks Enter on the short threshold (the click unlocks audio)', async ({ page }) => {
    await watchAudio(page);
    await page.addInitScript(() => localStorage.setItem('iknowyoucanseeme:visited', '1'));
    await page.goto(`${KEYED}/en/`);
    const threshold = page.locator('[data-threshold]');
    await expect(threshold).toHaveAttribute('data-kind', 'short', { timeout: 15_000 });
    await expect(page.locator('[data-threshold-enter]')).toBeFocused();
    await page.waitForTimeout(1500);
    await expect(threshold).toBeVisible();
    expect(await created(page)).toBe(0);
    await page.keyboard.press('Enter');
    await expect(threshold).toBeHidden({ timeout: 3000 });
    await expect.poll(() => open(page), { timeout: 10_000 }).toEqual(['running']);
  });

  test('a hidden tab suspends the audio; showing it again resumes', async ({ page }) => {
    await watchAudio(page);
    await page.goto(`${KEYED}/en/`);
    await page.locator('[data-threshold-enter]').click({ timeout: 15_000 });
    await expect.poll(() => open(page), { timeout: 10_000 }).toEqual(['running']);
    await setHidden(page, true);
    await expect.poll(() => open(page)).toEqual(['suspended']);
    await setHidden(page, false);
    await expect.poll(() => open(page)).toEqual(['running']);
  });

  test('"Wake up" stops the sound', async ({ page }) => {
    await watchAudio(page);
    await page.goto(`${KEYED}/en/`);
    await page.locator('[data-threshold-enter]').click({ timeout: 15_000 });
    await expect.poll(() => open(page), { timeout: 10_000 }).toEqual(['running']);
    await page.locator('[data-drift-wake]').click();
    await expect.poll(() => open(page)).toEqual(['suspended']);
  });
});
