import type { LoopSource } from './RecordingLayer.js';

/** The part of an `AudioContext` a loop needs. */
export interface MediaElementContext {
  createMediaElementSource(element: HTMLMediaElement): AudioNode;
}

/**
 * A field recording streamed by an `<audio>` element (never preloaded:
 * `preload="none"`, the file is fetched when it first plays) and looped,
 * played into the Web Audio graph through a `MediaElementAudioSourceNode`.
 * A refused or failed play is reported in the console; the generative
 * sound carries on without it.
 */
export class MediaElementLoop implements LoopSource {
  /** The Web Audio node the recording plays into. */
  readonly node: AudioNode;
  private readonly element: HTMLAudioElement;

  /**
   * @param doc - The document (creates the element; it is never attached).
   * @param context - The raw audio context.
   * @param src - Site path of the file.
   */
  constructor(
    doc: Document,
    context: MediaElementContext,
    private readonly src: string,
  ) {
    this.element = doc.createElement('audio');
    this.element.preload = 'none';
    this.element.loop = true;
    this.element.crossOrigin = 'anonymous';
    this.element.src = src;
    this.node = context.createMediaElementSource(this.element);
  }

  /** Starts or resumes streaming and playing. */
  play(): void {
    this.element.play().catch((error: unknown) => console.error(`[sound] The field recording ${this.src} could not play; the generative sound carries on.`, error));
  }

  /** Pauses. */
  pause(): void {
    this.element.pause();
  }

  /** Stops, drops the stream and disconnects. */
  dispose(): void {
    this.element.pause();
    this.element.removeAttribute('src');
    this.element.load();
    this.node.disconnect();
  }
}
