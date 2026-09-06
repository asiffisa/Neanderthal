import { NextRequest } from 'next/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { canonicalImageUrl } from '../../../src/lib/media-url';

beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllGlobals());
const firstUrl = 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Specimen.png';
const secondUrl = 'https://upload.wikimedia.org/wikipedia/commons/c/cd/Second.png';
const wiki = () => Response.json({ query: { pages: {
  1: { title: 'Audit specimen', index: 1, extract: 'Audit specimen', thumbnail: { source: firstUrl } },
  2: { title: 'Audit specimen anatomy', index: 2, extract: 'Audit specimen anatomy', thumbnail: { source: secondUrl } },
} } });

it('honors encoded exclusions and occurrence on an exact title match', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => wiki()));
  const { GET } = await import('./route');
  const proxyUrl = `/api/media-proxy?url=${encodeURIComponent(firstUrl)}`;
  const params = new URLSearchParams({ q: 'Audit specimen', source: 'wikipedia', exclude: proxyUrl });
  const result = await (await GET(new NextRequest(`http://localhost/api/resolve?${params}`))).json();
  expect(canonicalImageUrl(result.thumbnailUrl)).toBe(secondUrl);
  const occurrence = await (await GET(new NextRequest('http://localhost/api/resolve?q=Audit%20specimen&source=wikipedia&occurrence=1'))).json();
  expect(canonicalImageUrl(occurrence.thumbnailUrl)).toBe(secondUrl);
});

it('validates query size and alternative indices before provider calls', async () => {
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  const { GET } = await import('./route');
  for (const search of [`q=${'x'.repeat(301)}`, 'q=valid&occurrence=Infinity', 'q=valid&source=unknown']) {
    expect((await GET(new NextRequest(`http://localhost/api/resolve?${search}`))).status).toBe(400);
  }
  expect(fetcher).not.toHaveBeenCalled();
});

it('cancels a stalled metadata body without continuing the fallback chain', async () => {
  let cancelled = false;
  const controller = new AbortController();
  const fetcher = vi.fn(async () => {
    queueMicrotask(() => controller.abort());
    return new Response(new ReadableStream({ cancel() { cancelled = true; } }));
  });
  vi.stubGlobal('fetch', fetcher);
  const { GET } = await import('./route');
  const response = await GET(new NextRequest('http://localhost/api/resolve?q=Audit%20specimen', { signal: controller.signal }));
  expect(response.status).toBe(499);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(cancelled).toBe(true);
});

it('strictly rejects Wikipedia template banners like Question_book-new.svg.png', async () => {
  const junkUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Question_book-new.svg/600px-Question_book-new.svg.png';
  const realUrl = 'https://upload.wikimedia.org/wikipedia/commons/a/ab/RealPhoto.png';
  const wikiWithJunk = () => Response.json({ query: { pages: {
    1: { title: 'Pressure gradient', index: 1, extract: 'Pressure gradient', thumbnail: { source: junkUrl } },
    2: { title: 'Pressure gradient fluid', index: 2, extract: 'Pressure gradient fluid', thumbnail: { source: realUrl } },
  } } });
  vi.stubGlobal('fetch', vi.fn(async () => wikiWithJunk()));
  const { GET } = await import('./route');
  const result = await (await GET(new NextRequest('http://localhost/api/resolve?q=Pressure%20gradient&source=wikipedia'))).json();
  expect(canonicalImageUrl(result.thumbnailUrl)).toBe(realUrl);
});

it('resolves Latin irregular plurals like bacterium to Bacteria article', async () => {
  const bacteriaUrl = 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Bacteria_cells.png';
  const wikiBacteria = () => Response.json({ query: { pages: {
    1: { title: 'Bacteria', index: 1, extract: 'Bacteria are ubiquitous single-celled organisms.', thumbnail: { source: bacteriaUrl } },
  } } });
  vi.stubGlobal('fetch', vi.fn(async () => wikiBacteria()));
  const { GET } = await import('./route');
  const result = await (await GET(new NextRequest('http://localhost/api/resolve?q=entire%20bacterium&source=wikipedia'))).json();
  expect(canonicalImageUrl(result.thumbnailUrl)).toBe(bacteriaUrl);
  expect(result.title).toBe('Bacteria');
});

it('resolves hyphenated compound terms like actin-like cytoskeleton to Cytoskeleton', async () => {
  const cytoUrl = 'https://upload.wikimedia.org/wikipedia/commons/c/c2/FluorescentCells.jpg';
  const wikiCyto = () => Response.json({ query: { pages: {
    1: { title: 'Cytoskeleton', index: 1, extract: 'The cytoskeleton is a complex dynamic network of actin filaments.', thumbnail: { source: cytoUrl } },
  } } });
  vi.stubGlobal('fetch', vi.fn(async () => wikiCyto()));
  const { GET } = await import('./route');
  const result = await (await GET(new NextRequest('http://localhost/api/resolve?q=actin-like%20cytoskeleton&source=wikipedia'))).json();
  expect(canonicalImageUrl(result.thumbnailUrl)).toBe(cytoUrl);
  expect(result.title).toBe('Cytoskeleton');
});

it('searches canonical scientific term directly without appending context, resolving in single call', async () => {
  const ergosphereUrl = 'https://upload.wikimedia.org/wikipedia/commons/e/e5/Ergosphere.png';
  const fetchMock = vi.fn(async (url: string) => {
    // Verify that the search parameter is "Ergosphere", not "Ergosphere Ergospheric Frame-Dragging Dynamo"
    expect(url).toContain('gsrsearch=Ergosphere');
    expect(url).not.toContain('Ergospheric+Frame-Dragging');
    return Response.json({ query: { pages: {
      1: { title: 'Ergosphere', index: 1, extract: 'The ergosphere is a region outside a rotating black hole.', thumbnail: { source: ergosphereUrl } },
    } } });
  });
  vi.stubGlobal('fetch', fetchMock);
  const { GET } = await import('./route');
  const result = await (await GET(new NextRequest('http://localhost/api/resolve?q=Ergosphere&context=Ergospheric%20Frame-Dragging%20Dynamo&source=wikipedia'))).json();
  expect(canonicalImageUrl(result.thumbnailUrl)).toBe(ergosphereUrl);
  expect(result.title).toBe('Ergosphere');
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it('immediately rejects trivial divisions, metrics, and sensations without invoking fetch', async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  const { GET } = await import('./route');

  const termsToTest = ['slice', 'Slice', 'surface', 'temperature', 'smell', 'portion', 'layer'];
  for (const term of termsToTest) {
    const res = await GET(new NextRequest(`http://localhost/api/resolve?q=${encodeURIComponent(term)}`));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('not-found');
    expect(data.thumbnailUrl).toBeNull();
  }

  expect(fetchMock).not.toHaveBeenCalled();
});

it('strictly rejects person biographies like Darby Allin when searching single-token allin', async () => {
  const wrestlerUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Darby_Allin.jpg/960px-Darby_Allin.jpg';
  const fetchMock = vi.fn(async (url: string) => {
    // Return the exact pages Wikipedia returns for search "allin"
    if (url.includes('gsrsearch=allin')) {
      return Response.json({
        query: {
          pages: {
            1: { title: 'GG Allin', index: 1, extract: 'Kevin Michael "GG" Allin was an American punk rock musician.' },
            2: { title: 'Allin', index: 2, extract: 'Allin is both a surname and a given name. Notable people with the name include:' },
            3: { title: 'Darby Allin', index: 3, extract: 'Samuel Ratsch (born January 7, 1993) is an American professional wrestler.', thumbnail: { source: wrestlerUrl } },
          },
        },
      });
    }
    // Any candidate queries return empty
    return Response.json({ query: { pages: {} } });
  });

  vi.stubGlobal('fetch', fetchMock);
  const { GET } = await import('./route');

  // Test both with and without context
  const resWithContext = await GET(new NextRequest('http://localhost/api/resolve?q=allin&context=Onions%20%26%20Tears&source=wikipedia'));
  const dataWithContext = await resWithContext.json();
  expect(dataWithContext.title).not.toBe('Darby Allin');
  expect(dataWithContext.thumbnailUrl).toBeNull();
  expect(dataWithContext.status).toBe('not-found');

  const resBare = await GET(new NextRequest('http://localhost/api/resolve?q=allin&source=wikipedia'));
  const dataBare = await resBare.json();
  expect(dataBare.title).not.toBe('Darby Allin');
  expect(dataBare.thumbnailUrl).toBeNull();
  expect(dataBare.status).toBe('not-found');
});

it('resolves typo allin to Alliin chemical entity via candidate spelling resolution', async () => {
  const alliinUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/L-alliin-2D-skeletal.png/960px-L-alliin-2D-skeletal.png';
  const wrestlerUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Darby_Allin.jpg/960px-Darby_Allin.jpg';

  const fetchMock = vi.fn(async (url: string) => {
    if (url.includes('gsrsearch=allin')) {
      return Response.json({
        query: {
          pages: {
            1: { title: 'Allin', index: 2, extract: 'Allin is both a surname and a given name.' },
            2: { title: 'Darby Allin', index: 3, extract: 'Samuel Ratsch (born January 7, 1993) is an American professional wrestler.', thumbnail: { source: wrestlerUrl } },
          },
        },
      });
    }
    if (url.includes('titles=')) {
      return Response.json({
        query: {
          pages: {
            3444669: {
              pageid: 3444669,
              title: 'Alliin',
              extract: 'Alliin is a sulfoxide that is a natural constituent of fresh garlic.',
              thumbnail: { source: alliinUrl },
            },
          },
        },
      });
    }
    return Response.json({ query: { pages: {} } });
  });

  vi.stubGlobal('fetch', fetchMock);
  const { GET } = await import('./route');

  const res = await GET(new NextRequest('http://localhost/api/resolve?q=allin&context=Onions%20%26%20Tears&source=wikipedia'));
  const data = await res.json();
  expect(data.title).toBe('Alliin');
  expect(canonicalImageUrl(data.thumbnailUrl)).toBe(canonicalImageUrl(alliinUrl));
  expect(data.status).toBe('loaded');
});

