# Integrating Neanderthal

The playground is a reference application. The reusable part is the Markdown renderer and its image resolver contract. There is no `npm install neanderthal` workflow for this repository yet: the package is private and has no library exports or library build.

## 1. Choose the parts

| Use case | Files | Requirements |
| --- | --- | --- |
| Generate marker strings | `src/core/types.ts`, `src/core/media-markdown.ts` | TypeScript, `mdast-util-from-markdown`, `@types/mdast`; no React or AI key |
| Display capsules | Those core files, the three components, and the browser helpers listed below | React, Tailwind CSS, and an image resolver |
| Run the playground | Clone the repository | Next.js and the pnpm lockfile |

For a first experiment, run the repository locally and render `StreamingMarkdownView` in a page of your own, using the [README snippet](../README.md#use-it-in-your-app) as a starting point.

## 2. Copy the renderer

Preserve this relative structure in your application, for example under `src/neanderthal/`:

```text
src/neanderthal/
  components/
    StreamingMarkdownView.tsx
    InlineCapsule.tsx
    MediaLightbox.tsx
  core/
    types.ts
    media-markdown.ts
  lib/
    wikimedia.ts
    bounded-cache.ts
    media-url.ts
    request-limits.ts
```

Retain the MIT license notice with copied source. You do not need the playground page, presets, or Gemini routes. `collectMediaTokens` in `media-markdown.ts` is used by the playground's media panel, not by the React Markdown renderer.

In an existing React 19 application, install the renderer dependencies:

```bash
npm install react-markdown@10 remark-gfm@4 lucide-react@0.475 mdast-util-from-markdown@2
npm install -D @types/mdast@4
```

Keep React and React DOM versions aligned. This checkout was tested with React/React DOM 19.2.8; older React versions have not been verified. The renderer has no direct Next.js imports; the provided API routes do.

## 3. Configure styling

Components use Tailwind CSS v4 classes, without a compiled stylesheet. For a Next.js app without Tailwind:

```bash
npm install -D tailwindcss@4 @tailwindcss/postcss@4 postcss@8
```

Merge the plugin into your existing `postcss.config.mjs`:

```js
export default {
  plugins: { '@tailwindcss/postcss': {} },
};
```

Import global CSS once from your root layout. For `app/globals.css` with the copied files in `src/neanderthal/`:

```css
@import "tailwindcss";
@source "../src/neanderthal";

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.animate-shimmer {
  background: linear-gradient(90deg,
    rgb(255 255 255 / 3%) 0%,
    rgb(255 255 255 / 12%) 50%,
    rgb(255 255 255 / 3%) 100%);
  background-size: 200% 100%;
  animation: shimmer 1.8s infinite linear;
}

/* Required, not decorative. `.capsule` applies the baseline offset the Craft
   settings produce, and `.animate-rise-in` centres the hover card on the
   capsule; without them the capsule sits off the text baseline and the card
   is offset by half its width. Each entry animation defines only a `from`
   frame, so the resting state stays correct if animation never runs. */
.capsule {
  transform: translateY(var(--capsule-offset, 0px));
}
.capsule:active {
  transform: translateY(var(--capsule-offset, 0px)) scale(0.96);
}

@keyframes fade-in {
  from { opacity: 0; }
}
@keyframes rise-in {
  from { opacity: 0; transform: translate(-50%, var(--rise-from, 6px)) scale(0.96); }
}
@keyframes zoom-in {
  from { opacity: 0; transform: translateY(10px) scale(0.95); }
}

.animate-fade-in { animation: fade-in 180ms ease-out; }
.animate-rise-in { transform: translateX(-50%); animation: rise-in 200ms cubic-bezier(0.16, 1, 0.3, 1); }
.animate-zoom-in { animation: zoom-in 200ms cubic-bezier(0.16, 1, 0.3, 1); }

@media (prefers-reduced-motion: reduce) {
  .animate-fade-in,
  .animate-rise-in,
  .animate-zoom-in,
  .animate-shimmer {
    animation: none;
  }
  .capsule:active {
    transform: translateY(var(--capsule-offset, 0px));
  }
}
```

Adjust `@source` relative to your CSS file. Explicit registration matters when source lives outside automatic scan locations; see [Tailwind source detection](https://tailwindcss.com/docs/detecting-classes-in-source-files). Keep your host application's fonts and layout. The components currently use dark colors; copying the playground's entire CSS would also change your page background and scrollbars.

## 4. Connect the resolver

The browser client calls **`/api/resolve` on the page's origin**. There is no configurable endpoint or resolver prop yet.

| Query parameter | Purpose |
| --- | --- |
| `q` | Image search description |
| `context` | Optional short topic for disambiguation |
| `source` | Optional `wikipedia` or `duckduckgo` preference |
| `exclude` | Previous image URL; repeat for up to 16 exclusions |
| `occurrence` | Zero-based alternative index |

An application-owned endpoint can return:

```json
{
  "query": "Deep sea anglerfish",
  "title": "Anglerfish",
  "description": "A deep-sea fish with a bioluminescent lure.",
  "thumbnailUrl": "/images/your-licensed-anglerfish.jpg",
  "fullImageUrl": "/images/your-licensed-anglerfish-large.jpg",
  "sourceUrl": "https://en.wikipedia.org/wiki/Anglerfish",
  "vendor": "wikipedia",
  "status": "loaded"
}
```

Supply actual image assets; the paths above are examples. Use the vendor label only when accurate. Supporting a different provider properly also requires changing the current Wikipedia/DuckDuckGo labels and types.

Return `thumbnailUrl: null` and `status: "not-found"` when no result exists. The client checks `thumbnailUrl` to decide whether resolution succeeded. Failed HTTP responses use the fallback/not-found path. Validate response fields and URLs on your server.

For a **Next.js integration**, copy `app/api/resolve/route.ts` and `app/api/media-proxy/route.ts` to the same route paths, plus `src/lib/proxy-image.ts` and the browser helpers above. Install `ipaddr.js@2`. Update the route imports if you changed the source directory. The proxy requires the Node.js runtime (22 or 24), including DNS and HTTPS APIs; it cannot run in an Edge runtime. For another backend, implement the contract above with trusted image URLs; the proxy route is only needed when your response points to it.

The supplied proxy allows only the exact HTTPS hosts in `media-url.ts`, requires public DNS addresses, pins the checked address, rejects redirects, and accepts signature-checked PNG/JPEG/GIF/WebP/AVIF up to 8 MiB. SVG and HTML are rejected. Add a host only after reviewing it; arbitrary user-controlled hosts should not be accepted. A full image request has a five-second deadline and the resolver has a 15-second total deadline. Per-process caches and concurrency limits do not replace public deployment rate limits.

The supplied API routes require a server, not a static-only deployment. A React SPA can use them if its server or development proxy exposes `/api/resolve` on the page's origin.

## 5. Render and inspect

Render `StreamingMarkdownView` and hold the inspected media in your own state. Without `onInspect`, capsules and hover previews still render, but clicking one does not open a lightbox.

```tsx
'use client';

import { useCallback, useState } from 'react';
import { StreamingMarkdownView } from './src/neanderthal/components/StreamingMarkdownView';
import { MediaLightbox } from './src/neanderthal/components/MediaLightbox';
import { DEFAULT_CAPSULE_SETTINGS, type ResolvedMedia } from './src/neanderthal/core/types';

export function Answer({ content, isStreaming }: { content: string; isStreaming?: boolean }) {
  const [inspected, setInspected] = useState<ResolvedMedia | null>(null);
  const close = useCallback(() => setInspected(null), []);

  return (
    <>
      <StreamingMarkdownView
        content={content}
        isStreaming={isStreaming}
        settings={DEFAULT_CAPSULE_SETTINGS}
        onInspect={setInspected}
      />
      <MediaLightbox media={inspected} onClose={close} />
    </>
  );
}
```

Mount one `MediaLightbox` per screen, not one per block: it is a modal, and the playground keeps a single instance above the whole essay.

To customize geometry, pass a stable settings object to `StreamingMarkdownView`:

```tsx
const settings = { ...DEFAULT_CAPSULE_SETTINGS, height: 28, borderRadius: 10 };
```

Define constant settings outside the component, or use state for interactive settings. `visualsPerParagraph` only influences the playground's AI prompt; it does not add or remove markers from supplied Markdown.

## 6. Feed a stream

Accumulate text from your existing stream and pass all Markdown received so far:

```tsx
<Answer content={accumulatedMarkdown} isStreaming={isReceiving} />
```

An update might contain `Look at ![Angler`, followed by `Look at ![Anglerfish](neanderthal:image).`. Set `isStreaming` to false when the stream finishes or fails. Handle cancellation and errors in your app. Use a document-specific React `key` when switching to an unrelated document.

Batch incoming updates for long answers: the renderer reparses the accumulated Markdown on every content update. The playground's simulated stream is not a large-document benchmark.

## 7. Generate markers

```ts
import { createNeanderthalMediaMarkdown } from './src/neanderthal/core/media-markdown';

const marker = createNeanderthalMediaMarkdown('Anglerfish', {
  vendorPreference: 'wikipedia',
  fallbackUrl: 'https://your-image-host.example/anglerfish.jpg',
});
```

Replace the fallback with an image you control. Fallback URLs must be absolute HTTP(S). They are used when metadata resolution fails or a resolved image later fails to load. Fallbacks stay separate from shared cached metadata, and duplicate fallback images are suppressed within an answer. Provider choices are preferences, not restrictions.

Ordinary links use `react-markdown`'s URL filter. Do not add raw HTML rendering or replace that filter with an unrestricted function. See [react-markdown security](https://github.com/remarkjs/react-markdown#security).

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Unstyled capsules | Tailwind v4 scans the copied files |
| Capsules become dots | Check `/api/resolve` and the image request separately |
| Wikimedia 403 | Respect the upstream robot policy; check delivery from your intended host |
| Click has no effect | Supply `onInspect` and an inspector |
| Server key set but no live answer | The key is read server-side and passed in as a prop; restart the dev server after editing `.env.local` |
| Preview has no extra resolution | The demo returns the same thumbnail and full-image URL |

Code examples, duplicate image claims, fallback caching, and browser cache growth have regression coverage. Modal keyboard accessibility and deployment access controls remain release work. The renderer is type-checked against this repository; a clean external-app integration and a published package are not yet verified.
