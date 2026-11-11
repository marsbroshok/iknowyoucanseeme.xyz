import fs from 'fs';
import path from 'path';
import { AllProposals } from './ProposalEngine.js';

function escapeHtml(unsafe: string) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function renderReviewSheet(proposals: AllProposals, outputPath: string) {
  let html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Intake Review Sheet</title>
<style>
  body { font-family: sans-serif; background: #f0f0f0; padding: 20px; }
  .section { margin-bottom: 40px; }
  .row { display: flex; margin-bottom: 20px; background: white; padding: 10px; border-radius: 4px; overflow-x: auto; }
  .item { margin-right: 20px; flex-shrink: 0; max-width: 250px; }
  img { max-width: 200px; max-height: 200px; display: block; margin-bottom: 10px; }
  .caption { font-size: 12px; color: #555; white-space: pre-wrap; word-wrap: break-word; }
  h2 { border-bottom: 2px solid #ccc; padding-bottom: 5px; }
</style>
</head>
<body>
<h1>Intake Review Sheet</h1>
`;

  // Catalogue
  html += `<div class="section"><h2>Catalogue Matches</h2>\n`;
  for (const p of proposals.catalogue) {
    html += `<div class="row">
      <div class="item">
        <strong>${escapeHtml(p.title_fr)}</strong><br>
        <small>${escapeHtml(p.zone)}</small><br>
        <!-- Catalogue thumbnail -> intake/catalogue/img-000.jpg etc -->
        <img src="../catalogue/img-00${p.slug}.jpg" alt="cat" />
      </div>`;
      
    for (let i = 0; i < p.matches.length; i++) {
      const m = p.matches[i];
      // paths are relative to repo root or intake. Let's assume src is relative to intake root
      html += `<div class="item">
        <strong>${i === 0 ? 'Best Match' : 'Alternative'}</strong><br>
        <small>Dist: ${m.distance}</small><br>
        <img src="../${escapeHtml(m.src)}" />
        <div class="caption">${escapeHtml(m.postDate)}<br>${escapeHtml(m.postCaption.substring(0, 100))}...</div>
      </div>`;
    }
    html += `</div>\n`;
  }
  html += `</div>\n`;
  
  html += `</body></html>`;
  
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outputPath, html);
}
