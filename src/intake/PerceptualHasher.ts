import sharp from 'sharp';

/**
 * dHash
 */
export function dHash(pixels: Uint8Array): bigint {
  if (pixels.length !== 72) {
    throw new Error('dHash requires exactly 9x8 pixels (72 bytes)');
  }

  let hash = 0n;
  let bitIndex = 0n;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const idx = row * 9 + col;
      const left = pixels[idx];
      const right = pixels[idx + 1];
      if (left > right) {
        hash |= (1n << bitIndex);
      }
      bitIndex++;
    }
  }

  return hash;
}

/**
 * hammingDistance
 */
export function hammingDistance(h1: bigint, h2: bigint): number {
  let xor = h1 ^ h2;
  let count = 0;
  while (xor > 0n) {
    count += Number(xor & 1n);
    xor >>= 1n;
  }
  return count;
}

/**
 * hashImageBuffer
 */
export async function hashImageBuffer(buffer: Buffer): Promise<bigint> {
  const pixels = await sharp(buffer)
    .greyscale()
    .resize(9, 8, { fit: 'fill' })
    .raw()
    .toBuffer();
  
  return dHash(new Uint8Array(pixels));
}
