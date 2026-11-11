import { describe, it, expect } from 'vitest';
import { parseIgPosts } from '../src/intake/IgExportParser.js';
import fs from 'fs';
import path from 'path';

describe('IgExportParser', () => {
  it('parses posts correctly and decodes HTML entities', () => {
    const fixtureHtml = `
      <html><body>
      <div class="pam _3-95 _2pi0 _2lej uiBoxWhite noborder">
        <img src="media/posts/202611/img1.jpg" />
        <video src="media/posts/202611/vid1.mp4" />
        <div class="_3-94 _2lem">Nov 10, 2026 1:29 am</div>
        <div class="_3-95 _2pi0 _2lej uiBoxWhite noborder">
          <h2>Caption line 1<br/>Caption line 2 &amp; more</h2>
        </div>
      </div>
      <div class="pam _3-95 _2pi0 _2lej uiBoxWhite noborder">
        <img />
        <video />
        <div class="_3-94 _2lem">Invalid Date 2026</div>
      </div>
      <div class="pam _3-95 _2pi0 _2lej uiBoxWhite noborder">
        <img src="media/posts/202611/img3.jpg" />
        <!-- missing date entirely -->
      </div>
      <div class="pam _3-95 _2pi0 _2lej uiBoxWhite noborder">
        <img src="media/posts/202611/img4.jpg" />
        <div class="_3-94 _2lem"></div>
      </div>
      </body></html>
    `;
    const tempFile = path.resolve(__dirname, 'temp_posts2.html');
    fs.writeFileSync(tempFile, fixtureHtml);
    
    // Test ignores missing caption
    const fixtureReel = `
      <html><body>
      <div class="pam _3-95 _2pi0 _2lej uiBoxWhite noborder">
        <video src="media/reels/202611/reel.mp4" />
        <div class="_3-94 _2lem">Aug 29, 2026 10:00 pm</div>
      </div>
      <div class="pam _3-95 _2pi0 _2lej uiBoxWhite noborder">
        <video src="media/reels/202611/reel2.mp4" />
        <div class="_3-94 _2lem">Jan 01, 2026 12:30 am</div>
      </div>
      <div class="pam _3-95 _2pi0 _2lej uiBoxWhite noborder">
        <video src="media/reels/202611/reel3.mp4" />
        <div class="_3-94 _2lem">Jan 01, 2026 12:30 pm</div>
      </div>
      </body></html>
    `;
    const tempReel = path.resolve(__dirname, 'temp_reels2.html');
    fs.writeFileSync(tempReel, fixtureReel);

    const posts = parseIgPosts({ postsHtml: tempFile, reelsHtml: tempReel });
    
    expect(posts.length).toBe(6);
    expect(posts[0].date).toBe('2026-11-10T01:29:00.000');
    expect(posts[0].caption).toBe('Caption line 1\nCaption line 2 & more');
    expect(posts[0].media).toEqual(['media/posts/202611/img1.jpg', 'media/posts/202611/vid1.mp4']);

    expect(posts[1].date).toBe(''); // invalid date returns empty

    expect(posts[2].date).toBe('');
    expect(posts[2].media).toEqual(['media/posts/202611/img4.jpg']);

    expect(posts[3].date).toBe('2026-08-29T22:00:00.000');
    expect(posts[3].caption).toBe('');
    expect(posts[3].media).toEqual(['media/reels/202611/reel.mp4']);

    expect(posts[4].date).toBe('2026-01-01T00:30:00.000');
    expect(posts[5].date).toBe('2026-01-01T12:30:00.000');
    
    fs.unlinkSync(tempFile);
    fs.unlinkSync(tempReel);
  });

  it('refuses paths outside whitelist', () => {
    const fixtureHtml = `
      <html><body>
      <div class="pam _3-95 _2pi0 _2lej uiBoxWhite noborder">
        <img src="messages/secret.jpg" />
        <div class="_3-94 _2lem">Nov 10, 2026 1:29 am</div>
      </div>
      </body></html>
    `;
    const tempFile = path.resolve(__dirname, 'temp_bad2.html');
    fs.writeFileSync(tempFile, fixtureHtml);
    
    expect(() => parseIgPosts({ postsHtml: tempFile })).toThrow(/outside whitelist/i);
    
    fs.unlinkSync(tempFile);
  });

  it('fails loudly on missing files', () => {
    expect(() => parseIgPosts({ postsHtml: 'does_not_exist.html' })).toThrow(/Missing export file/);
  });
});
