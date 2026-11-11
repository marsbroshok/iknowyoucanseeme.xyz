import fs from 'fs';
import { parse } from 'node-html-parser';

export interface IgPost {
  id: string; // generating an ID from date + index
  date: string; // ISO
  caption: string;
  media: string[];
}

/**
 * parseIgPosts
 */
export function parseIgPosts(options: { postsHtml?: string; reelsHtml?: string }): IgPost[] {
  const posts: IgPost[] = [];

  const processFile = (filePath: string) => {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing export file: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const root = parse(content) as import('node-html-parser').HTMLElement;

    const blocks = root.querySelectorAll('.pam.uiBoxWhite');

    blocks.forEach((block: import('node-html-parser').HTMLElement, index: number) => {
      const imgs: string[] = block.querySelectorAll('img').map((el: import('node-html-parser').HTMLElement) => el.attributes?.src || '');
      const vids: string[] = block.querySelectorAll('video').map((el: import('node-html-parser').HTMLElement) => el.attributes?.src || '');
      const allMedia = [...imgs, ...vids].filter(Boolean);

      // Whitelist check
      allMedia.forEach(m => {
        if (!m.startsWith('media/posts/') && !m.startsWith('media/reels/') && !m.startsWith('your_instagram_activity/media/')) {
          throw new Error(`Media path outside whitelist: ${m}`);
        }
      });

      // Get date
      const dateEl = block.querySelector('._3-94');
      if (!dateEl) {
        return;
      }
      const rawDate = (dateEl.text || '').trim();
      const date = parseDate(rawDate);

      // Get caption
      const h2 = block.querySelector('h2');
      let caption = '';
      if (h2) {
        // preserve line breaks
        let rawHtml = h2.innerHTML;
        rawHtml = rawHtml.replace(/<br\s*\/?>/gi, '\n');
        caption = rawHtml.replace(/<[^>]*>?/gm, '').trim();
        caption = caption.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
      }

      posts.push({
        id: `post-${date}-${index}`,
        date,
        caption,
        media: allMedia
      });
    });
  };

  if (options.postsHtml) processFile(options.postsHtml);
  if (options.reelsHtml) processFile(options.reelsHtml);

  return posts;
}

function parseDate(raw: string): string {
  // Format: "Nov 10, 2026 1:29 am"
  const match = raw.match(/([a-zA-Z]{3})\s+(\d+),\s+(\d{4})\s+(\d+):(\d+)\s+(am|pm)/i);
  if (match) {
    const [, mon, day, year, hr, min, ampm] = match;
    const months = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };
    let hour = parseInt(hr, 10);
    if (ampm.toLowerCase() === 'pm' && hour < 12) hour += 12;
    if (ampm.toLowerCase() === 'am' && hour === 12) hour = 0;
    
    const d = new Date(Date.UTC(parseInt(year, 10), (months as Record<string, number>)[mon.toLowerCase()], parseInt(day, 10), hour, parseInt(min, 10)));
    return d.toISOString().replace('Z', '');
  }
  return '';
}
