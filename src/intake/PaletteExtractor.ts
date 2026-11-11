import sharp from 'sharp';

// Seeded RNG for deterministic k-means initialization
function lcg(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export async function extractPalette(buffer: Buffer, k: number = 5): Promise<string[]> {
  // downsample for speed
  const pixels = await sharp(buffer)
    .resize(50, 50, { fit: 'inside' })
    .removeAlpha()
    .raw()
    .toBuffer();

  const numPixels = pixels.length / 3;

  // Random seeded initialization
  const rng = lcg(42);
  const centroids: number[][] = [];
  
  for (let i = 0; i < k; i++) {
    const idx = Math.floor(rng() * numPixels) * 3;
    centroids.push([pixels[idx], pixels[idx+1], pixels[idx+2]]);
  }

  const assignments = new Int32Array(numPixels);
  let changed = true;
  let iterations = 0;
  
  while (changed && iterations < 20) {
    changed = false;
    iterations++;
    
    // Assign
    for (let i = 0; i < numPixels; i++) {
      const r = pixels[i*3];
      const g = pixels[i*3+1];
      const b = pixels[i*3+2];
      
      let minDist = Infinity;
      let bestC = 0;
      
      for (let c = 0; c < k; c++) {
        const dist = (r - centroids[c][0]) ** 2 + 
                     (g - centroids[c][1]) ** 2 + 
                     (b - centroids[c][2]) ** 2;
        if (dist < minDist) {
          minDist = dist;
          bestC = c;
        }
      }
      
      if (assignments[i] !== bestC) {
        assignments[i] = bestC;
        changed = true;
      }
    }
    
    // Update
    const sums = Array.from({length: k}, () => [0,0,0,0]); // r, g, b, count
    for (let i = 0; i < numPixels; i++) {
      const c = assignments[i];
      sums[c][0] += pixels[i*3];
      sums[c][1] += pixels[i*3+1];
      sums[c][2] += pixels[i*3+2];
      sums[c][3]++;
    }
    
    for (let c = 0; c < k; c++) {
      if (sums[c][3] > 0) {
        centroids[c] = [
          sums[c][0] / sums[c][3],
          sums[c][1] / sums[c][3],
          sums[c][2] / sums[c][3],
        ];
      }
    }
  }

  // Deduplicate and format as hex
  const hexes = new Set<string>();
  for (const c of centroids) {
    // Only add if it actually matched some pixels
    // Wait, let's recount
    hexes.add(rgbToHex(Math.round(c[0]), Math.round(c[1]), Math.round(c[2])));
  }

  return Array.from(hexes).slice(0, k);
}

function rgbToHex(r: number, g: number, b: number) {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}
