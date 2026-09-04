import { lookup } from 'node:dns/promises';
import { get } from 'node:https';
import { Readable } from 'node:stream';
import ipaddr from 'ipaddr.js';
import { parseImageProxyUrl } from './media-url';
import { abortable, readBoundedBody, RequestError } from './request-limits';

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export function isPublicAddress(address: string): boolean {
  try {
    // Reject mapped/tunneled IPv6 as well as loopback, link-local and private ranges.
    return ipaddr.parse(address).range() === 'unicast';
  } catch {
    return false;
  }
}

function imageType(bytes: Uint8Array): string | undefined {
  const head = Buffer.from(bytes.buffer, bytes.byteOffset, Math.min(bytes.length, 32));
  if (head.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
  if (head[0] === 255 && head[1] === 216 && head[2] === 255) return 'image/jpeg';
  if (/^GIF8[79]a/.test(head.toString('ascii'))) return 'image/gif';
  if (head.toString('ascii', 0, 4) === 'RIFF' && head.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  if (head.toString('ascii', 4, 8) === 'ftyp' && /^(avif|avis)$/.test(head.toString('ascii', 8, 12))) return 'image/avif';
  return undefined;
}

export async function fetchProxyImage(value: string, signal: AbortSignal) {
  signal.throwIfAborted();
  const url = parseImageProxyUrl(value);
  if (!url) throw new RequestError('Image URL is not allowed', 400);
  const addresses = await abortable(lookup(url.hostname, { all: true }), signal);
  if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new RequestError('Image destination is not public', 400);
  }
  const address = addresses.find((item) => item.family === 4) || addresses[0];
  signal.throwIfAborted();
  const response = await new Promise<Response>((resolve, reject) => {
    const request = get(url, {
      signal,
      // Pin the checked address to the connection; no second DNS lookup/rebinding.
      family: address.family,
      lookup: (_host, _options, callback) => callback(null, address.address, address.family),
      headers: {
        'User-Agent': process.env.USER_AGENT || 'NeanderthalApp/1.0 (https://github.com/asiffisa/Neanderthal)',
        Accept: 'image/avif,image/webp,image/png,image/jpeg,image/gif',
        'Accept-Encoding': 'identity',
      },
    }, (upstream) => {
      const status = upstream.statusCode || 502;
      // Node HTTPS does not follow redirects. Reject before reading a new target.
      if (status !== 200) {
        upstream.destroy();
        reject(new RequestError('Image provider did not return an image', status >= 400 && status <= 599 ? status : 502));
        return;
      }
      const contentType = (upstream.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
      if (!['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif'].includes(contentType)) {
        upstream.destroy();
        reject(new RequestError('Unsupported image type', 415));
        return;
      }
      const headers = new Headers({ 'content-type': contentType });
      if (upstream.headers['content-length']) headers.set('content-length', upstream.headers['content-length']);
      resolve(new Response(Readable.toWeb(upstream) as ReadableStream<Uint8Array>, { headers }));
    });
    request.on('error', reject);
  });
  const buffer = await readBoundedBody(response, MAX_IMAGE_BYTES, signal);
  const contentType = imageType(buffer);
  if (!contentType || contentType !== response.headers.get('content-type')) {
    throw new RequestError('Invalid image content', 415);
  }
  return { buffer, contentType };
}
