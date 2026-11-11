import sharp from 'sharp';

/**
 * processImage
 */
export async function processImage(inputBuffer: Buffer): Promise<Buffer> {
  const image = sharp(inputBuffer);
  
  const pipeline = image.rotate(); // applies EXIF rotation if any
  
  pipeline.resize({
    width: 2400,
    height: 2400,
    fit: 'inside',
    withoutEnlargement: true
  });
  
  return pipeline
    .toColorspace('srgb')
    .jpeg({ quality: 88, progressive: true })
    .toBuffer();
}
