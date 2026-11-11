import sharp from 'sharp';

export async function processImage(inputBuffer: Buffer): Promise<Buffer> {
  const image = sharp(inputBuffer);
  const metadata = await image.metadata();
  
  const width = metadata.width!;
  const height = metadata.height!;
  
  const pipeline = image.rotate(); // applies EXIF rotation if any
  
  // Resize if long edge > 2400
  if (Math.max(width, height) > 2400) {
    if (width >= height) {
      pipeline.resize({ width: 2400, withoutEnlargement: true });
    } else {
      pipeline.resize({ height: 2400, withoutEnlargement: true });
    }
  }
  
  return pipeline
    .toColorspace('srgb')
    .jpeg({ quality: 88, progressive: true })
    .toBuffer();
}
