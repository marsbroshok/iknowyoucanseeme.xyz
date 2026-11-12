import type { Page } from '@playwright/test';

/**
 * Starts a page with the sound muted (the visitor's stored choice), for
 * tests about the world rather than the sound: with sound on, a returning
 * or deep-linked visit's short threshold waits for the Enter click (it
 * unlocks audio, docs/adr/0011); muted, it fades by itself as before. The
 * sound itself is covered by sound.spec.ts.
 *
 * @param page - The page, before its first navigation.
 */
export async function soundOff(page: Page): Promise<void> {
  await page.addInitScript(() => localStorage.setItem('iknowyoucanseeme:sound', 'off'));
}
