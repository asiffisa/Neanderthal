const IMAGE_HOSTS = new Set([
  'upload.wikimedia.org',
  'external-content.duckduckgo.com',
  'images.duckduckgo.com',
  'tse1.mm.bing.net', 'tse2.mm.bing.net', 'tse3.mm.bing.net', 'tse4.mm.bing.net',
  'images.unsplash.com',
  'framerusercontent.com',
  'media.giphy.com', 'i.giphy.com',
  'media0.giphy.com', 'media1.giphy.com', 'media2.giphy.com', 'media3.giphy.com', 'media4.giphy.com',
]);

/** A closed host list: never accept arbitrary image hosts or subdomain suffixes. */
export function parseImageProxyUrl(value: string | null | undefined): URL | null {
  if (!value || value.length > 4096) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port ||
        !IMAGE_HOSTS.has(url.hostname)) return null;
    url.hash = '';
    return url;
  } catch {
    return null;
  }
}

/** Identity only; this function does not grant permission to fetch the URL. */
export function canonicalImageUrl(value: string): string {
  try {
    let url = new URL(value, 'https://neanderthal.invalid');
    if (url.pathname === '/api/media-proxy' && url.searchParams.has('url')) {
      url = new URL(url.searchParams.get('url')!);
    }
    url.hash = '';
    if (url.hostname === 'upload.wikimedia.org') {
      // Different thumbnail sizes and tracking parameters still identify one image.
      url.pathname = url.pathname.replace(/\/thumb\/(.+)\/[^/]+$/, '/$1');
      url.search = '';
    } else {
      for (const key of [...url.searchParams.keys()]) {
        if (key.startsWith('utm_')) url.searchParams.delete(key);
      }
      url.searchParams.sort();
    }
    return url.href;
  } catch {
    return value;
  }
}
