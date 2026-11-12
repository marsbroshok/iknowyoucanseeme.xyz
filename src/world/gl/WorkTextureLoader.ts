import { LinearMipmapLinearFilter, SRGBColorSpace, TextureLoader, type Texture } from 'three';

/**
 * Three.js side of texture streaming: loads a work image as an sRGB,
 * mipmapped texture and frees it. Used as the `load` / `release` pair of
 * `TextureStreamer` (src/world/stream).
 *
 * Verified in the browser (ADR 0006).
 */
export class WorkTextureLoader {
  private readonly loader = new TextureLoader();

  /**
   * Loads an image as a texture.
   *
   * @param url - Image URL (same origin).
   * @returns The texture; rejects when the image cannot be fetched or decoded.
   */
  load = async (url: string): Promise<Texture> => {
    const texture = await this.loader.loadAsync(url);
    texture.colorSpace = SRGBColorSpace;
    texture.minFilter = LinearMipmapLinearFilter;
    texture.anisotropy = 4;
    texture.needsUpdate = true;
    return texture;
  };

  /**
   * Frees a texture's GPU memory.
   *
   * @param texture - Texture to free.
   */
  release = (texture: Texture): void => {
    texture.dispose();
  };
}
