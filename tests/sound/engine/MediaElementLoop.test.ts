// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { MediaElementLoop } from '../../../src/sound/engine/MediaElementLoop.js';

/** A context that records the element it was given (test double). */
function context() {
  const node = { disconnect: vi.fn() } as unknown as AudioNode;
  const elements: HTMLMediaElement[] = [];
  return { node, elements, ctx: { createMediaElementSource: (el: HTMLMediaElement) => (elements.push(el), node) } };
}

afterEach(() => vi.restoreAllMocks());

describe('MediaElementLoop', () => {
  it('streams a looping file without preloading, through a media element source', () => {
    const { ctx, elements, node } = context();
    const loop = new MediaElementLoop(document, ctx, '/audio/sea.ogg');
    const el = elements[0] as HTMLAudioElement;
    expect(el.tagName).toBe('AUDIO');
    expect(el.preload).toBe('none');
    expect(el.loop).toBe(true);
    expect(el.crossOrigin).toBe('anonymous');
    expect(el.getAttribute('src')).toBe('/audio/sea.ogg');
    expect(el.isConnected).toBe(false);
    expect(loop.node).toBe(node);
  });

  it('plays and pauses the element; a refused play is reported, not thrown', async () => {
    const { ctx } = context();
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValueOnce(undefined).mockRejectedValueOnce(new DOMException('blocked', 'NotAllowedError'));
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const loop = new MediaElementLoop(document, ctx, '/audio/sea.ogg');
    loop.play();
    loop.pause();
    loop.play();
    await new Promise((r) => setTimeout(r, 0));
    expect(play).toHaveBeenCalledTimes(2);
    expect(pause).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledTimes(1);
    expect(error.mock.calls[0][0]).toBe('[sound] The field recording /audio/sea.ogg could not play; the generative sound carries on.');
  });

  it('dispose stops, drops the stream and disconnects', () => {
    const { ctx, elements, node } = context();
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    const load = vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined);
    new MediaElementLoop(document, ctx, '/audio/sea.ogg').dispose();
    expect(pause).toHaveBeenCalledTimes(1);
    expect(load).toHaveBeenCalledTimes(1);
    expect(elements[0].hasAttribute('src')).toBe(false);
    expect(node.disconnect).toHaveBeenCalledTimes(1);
  });
});
