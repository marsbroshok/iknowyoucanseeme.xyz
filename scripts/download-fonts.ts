import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import subsetFont from 'subset-font';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const destDir = path.join(__dirname, '../public/fonts');
if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

async function downloadAndSubset() {
  const frauncesUrl = 'https://github.com/undercasetype/Fraunces/raw/master/fonts/variable/Fraunces%5BSOFT%2CWONK%2Copsz%2Cwght%5D.ttf';
  const jbUrl = 'https://github.com/JetBrains/JetBrainsMono/raw/master/fonts/variable/JetBrainsMono%5Bwght%5D.ttf';

  console.log('Downloading fonts...');
  const [frauncesReq, jbReq] = await Promise.all([
    fetch(frauncesUrl),
    fetch(jbUrl)
  ]);
  
  if (!frauncesReq.ok || !jbReq.ok) throw new Error('Font download failed');
  
  const frauncesBuf = Buffer.from(await frauncesReq.arrayBuffer());
  const jbBuf = Buffer.from(await jbReq.arrayBuffer());

  // ASCII + extended French chars + punctuation
  const text = Array.from({ length: 384 }, (_, i) => String.fromCharCode(i)).join('') + '’“”«»—–';

  console.log('Subsetting Fraunces...');
  const frauncesSubset = await subsetFont(frauncesBuf, text, { targetFormat: 'woff2' });
  fs.writeFileSync(path.join(destDir, 'Fraunces.woff2'), frauncesSubset);

  console.log('Subsetting JetBrains Mono...');
  const jbSubset = await subsetFont(jbBuf, text, { targetFormat: 'woff2' });
  fs.writeFileSync(path.join(destDir, 'JetBrainsMono.woff2'), jbSubset);

  // OFL Licenses
  const frauncesOfl = await fetch('https://raw.githubusercontent.com/undercasetype/Fraunces/master/OFL.txt');
  const jbOfl = await fetch('https://raw.githubusercontent.com/JetBrains/JetBrainsMono/master/OFL.txt');
  
  fs.writeFileSync(path.join(destDir, 'Fraunces-OFL.txt'), await frauncesOfl.text());
  fs.writeFileSync(path.join(destDir, 'JetBrainsMono-OFL.txt'), await jbOfl.text());

  // Remove the old unsubsetted TTFs
  if (fs.existsSync(path.join(destDir, 'Fraunces.ttf'))) fs.unlinkSync(path.join(destDir, 'Fraunces.ttf'));
  if (fs.existsSync(path.join(destDir, 'JetBrainsMono.ttf'))) fs.unlinkSync(path.join(destDir, 'JetBrainsMono.ttf'));

  console.log('Done!');
}

downloadAndSubset().catch(console.error);
