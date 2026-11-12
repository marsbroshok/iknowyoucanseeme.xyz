import fs from 'node:fs';
import path from 'node:path';

/**
 * All built HTML pages of a build directory, as paths relative to it
 * (e.g. `fr/oeuvres/arrivee/index.html`), sorted.
 *
 * @param dist - Build directory.
 * @returns Relative page paths.
 */
export function listBuiltPages(dist: string): string[] {
  return (fs.readdirSync(dist, { recursive: true }) as string[])
    .map((f) => f.split(path.sep).join('/'))
    .filter((f) => f.endsWith('.html'))
    .sort();
}

/**
 * Site URL path of a built page (`fr/oeuvres/x/index.html` → `/fr/oeuvres/x/`).
 *
 * @param file - Relative page path.
 * @returns The URL path.
 */
export function pageUrlPath(file: string): string {
  return `/${file.replace(/index\.html$/, '')}`;
}
