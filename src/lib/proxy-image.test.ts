import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { lookup } from 'node:dns/promises';
import { get } from 'node:https';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../../app/api/media-proxy/route';
import { fetchProxyImage, isPublicAddress, MAX_IMAGE_BYTES } from './proxy-image';
import { parseImageProxyUrl } from './media-url';

vi.mock('node:dns/promises', () => ({ lookup: vi.fn() }));
vi.mock('node:https', () => ({ get: vi.fn() }));

const png = Buffer.from('89504e470d0a1a0a0000000d494844520000000100000001', 'hex');
const url = 'https://upload.wikimedia.org/wikipedia/commons/a/ab/test.png';

function upstream(body: Buffer | null, type = 'image/png', status = 200, length?: number) {
  const stream = Object.assign(new PassThrough(), {
    statusCode: status,
    headers: { 'content-type': type, ...(length === undefined ? {} : { 'content-length': String(length) }) },
  });
  vi.mocked(get).mockImplementation(((_url: unknown, _options: unknown, callback: (s: typeof stream) => void) => {
    const request = new EventEmitter();
    queueMicrotask(() => {
      callback(stream);
      if (body) stream.end(body);
    });
    return request;
  }) as typeof get);
  return stream;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(lookup).mockResolvedValue([{ address: '208.80.154.240', family: 4 }] as never);
});
afterEach(() => vi.restoreAllMocks());

describe('image proxy trust boundary', () => {
  it.each([
    'http://upload.wikimedia.org/image.png', 'https://127.0.0.1/a',
    'https://[::1]/a', 'https://169.254.169.254/a', 'https://2130706433/a',
    'https://upload.wikimedia.org.evil.example/a', 'https://evil.example/upload.wikimedia.org/a',
    'https://upload.wikimedia.org@evil.example/a', 'https://user:password@upload.wikimedia.org/a',
    'https://upload.wikimedia.org:8443/a', 'https://upload.wikimedia.org./a',
    'file:///etc/passwd', 'data:text/html,test',
  ])('rejects %s before DNS/network access', async (candidate) => {
    const response = await GET(new NextRequest(`http://localhost/api/media-proxy?url=${encodeURIComponent(candidate)}`));
    expect(response.status).toBe(400);
    expect(lookup).not.toHaveBeenCalled();
    expect(get).not.toHaveBeenCalled();
  });

  it.each(['127.0.0.1', '10.0.0.1', '172.16.0.1', '192.168.0.1', '169.254.169.254', '100.64.0.1',
    '0.0.0.0', '224.0.0.1', '::1', '::', 'fc00::1', 'fe80::1', '::ffff:127.0.0.1', '2001:db8::1'])
  ('rejects nonpublic DNS address %s', async (address) => {
    expect(isPublicAddress(address)).toBe(false);
    vi.mocked(lookup).mockResolvedValue([{ address: '208.80.154.240', family: 4 }, { address, family: address.includes(':') ? 6 : 4 }] as never);
    await expect(fetchProxyImage(url, new AbortController().signal)).rejects.toThrow('not public');
    expect(get).not.toHaveBeenCalled();
  });

  it('pins the checked address while keeping the HTTPS host', async () => {
    upstream(png);
    const image = await fetchProxyImage(url, new AbortController().signal);
    expect(image.contentType).toBe('image/png');
    const [target, options] = vi.mocked(get).mock.calls[0] as unknown as [URL, { lookup: Function; family: number }];
    expect(target.hostname).toBe('upload.wikimedia.org');
    const callback = vi.fn();
    options.lookup(target.hostname, {}, callback);
    expect(callback).toHaveBeenCalledWith(null, '208.80.154.240', 4);
    expect(options.family).toBe(4);
    expect(lookup).toHaveBeenCalledTimes(1);
    expect(parseImageProxyUrl('https://tse3.mm.bing.net/th/id/example')).not.toBeNull();
  });

  it('rejects redirects without making a second request', async () => {
    upstream(null, 'text/html', 302);
    await expect(fetchProxyImage(url, new AbortController().signal)).rejects.toThrow('did not return an image');
    expect(get).toHaveBeenCalledTimes(1);
  });

  it.each(['text/html', 'image/svg+xml'])('rejects active content %s', async (type) => {
    upstream(Buffer.from('<svg onload="alert(1)"></svg>'), type);
    await expect(fetchProxyImage(url, new AbortController().signal)).rejects.toThrow('Unsupported image type');
  });

  it('rejects HTML disguised as a raster image', async () => {
    upstream(Buffer.from('<html>not an image</html>'));
    await expect(fetchProxyImage(url, new AbortController().signal)).rejects.toThrow('Invalid image content');
  });

  it('rejects oversized content before buffering it', async () => {
    upstream(null, 'image/png', 200, MAX_IMAGE_BYTES + 1);
    await expect(fetchProxyImage(url, new AbortController().signal)).rejects.toThrow('byte limit');
  });

  it('serves valid bytes with safe headers on both cache miss and hit', async () => {
    upstream(png);
    for (const state of ['MISS', 'HIT']) {
      const response = await GET(new NextRequest(`http://localhost/api/media-proxy?url=${encodeURIComponent(url)}`));
      expect(response.status).toBe(200);
      expect(response.headers.get('x-proxy-cache')).toBe(state);
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
      expect(response.headers.get('content-security-policy')).toContain('sandbox');
      expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array(png));
    }
    expect(get).toHaveBeenCalledTimes(1);
  });
});
