# Neanderthal

Inline image capsules for streaming Markdown. Write ordinary prose, add a visual marker after a subject, and let the React renderer resolve an image without interrupting the text.

```markdown
An anglerfish ![Deep sea anglerfish](neanderthal:image) attracts prey with a glowing lure.
```

The web UI is a playground: it demonstrates streaming, capsule sizing, hover previews, and image inspection. Your application can use the renderer without the playground controls or Gemini integration.

**Status:** experimental, source-based integration. This is a Next.js application, not a published npm library. The proxy, request limits, cache bounds, and image/Markdown correctness fixes are implemented. The [production review](docs/PRODUCTION_REVIEW.md) records verification and remaining public-release requirements, including shared-key access controls and dependency advisories.

## Try the playground

Use Node.js 22 or 24 and npm. This checkout was verified with Node 24.11.1; `package-lock.json` is the dependency lockfile.

```bash
git clone https://github.com/asiffisa/Neanderthal.git
cd Neanderthal
npm ci
npm run dev -- --hostname 127.0.0.1
```

Open [localhost:3000](http://localhost:3000). No Gemini key is needed for preset answers or custom Markdown. Image search still requires an internet connection.

1. Choose a preset to watch an answer stream.
2. Adjust the Craft controls to change capsule size and alignment.
3. Hover over a capsule for a preview; click or tap it to inspect the image.
4. With no key saved, paste Markdown containing a visual marker into the input and send it.

### Optional live AI answers

Open **Add Key** in the preset toolbar, enter your Gemini API key, choose a model, and save. The toolbar scrolls horizontally; the key control is at its far end.

The playground stores the key in browser `localStorage` and sends it to the server hosting this application, which forwards requests to Google. Use a deployment you trust. **Clear** in the key dialog removes the saved key. See Google's [key guidance](https://ai.google.dev/gemini-api/docs/api-key) and [model catalog](https://ai.google.dev/gemini-api/docs/models) for account access and availability.

For a private server-side experiment, copy the environment template and set `GEMINI_API_KEY`:

```bash
cp .env.example .env.local
```

The API routes accept this server key as a fallback. The current playground decides whether to generate live answers from the key saved in the browser, so setting only `.env.local` does **not** enable all live-answer UI flows. Do not put a shared server key on an unauthenticated public deployment: the endpoints currently lack access control and usage limits.

### Check and build

```bash
npm test
npm exec tsc -- --noEmit
npm run build
npm run start -- --hostname 127.0.0.1
```

`npm run package` is an alias for the Next.js application build, not a library package. `npm run lint` currently prompts for ESLint setup; it is not an automated validation gate yet.

## Use it in your application

Follow the [integration guide](docs/INTEGRATION.md) for the exact files, dependencies, CSS, resolver contract, and streaming behavior. A small [React example](examples/InlineMediaExample.tsx) imports the existing source directly.

```tsx
import { StreamingMarkdownView } from './src/components/StreamingMarkdownView';
import { DEFAULT_CAPSULE_SETTINGS } from './src/core/types';

<StreamingMarkdownView
  content="An anglerfish ![Deep sea anglerfish](neanderthal:image) uses a glowing lure."
  settings={DEFAULT_CAPSULE_SETTINGS}
/>
```

This assumes Tailwind CSS is configured and `/api/resolve` exists on the same origin. Add `onInspect` and `MediaLightbox` for click-to-inspect behavior, as shown in the example. Gemini is optional; the renderer accepts Markdown from any source.

## Markdown contract

| Form | Meaning |
| --- | --- |
| `![Subject](neanderthal:image)` | Resolve an image with automatic provider preference |
| `![Subject](neanderthal:image?provider=wikipedia)` | Prefer Wikipedia; other providers may still be tried |
| `![Subject](neanderthal:image?provider=duckduckgo)` | Prefer DuckDuckGo; other providers may still be tried |
| `![Alt](https://example.com/image.jpg)` | Render a normal Markdown image |
| `![media:Subject\|wiki]` | Legacy syntax retained for migration |

Keep descriptions short and concrete. Write the subject in the sentence, then place its capsule after it so the prose remains readable if the image fails. Use `createNeanderthalMediaMarkdown` from `src/core/media-markdown.ts` to generate markers and encode fallback URLs.

Pass the accumulated answer as `content` and set `isStreaming` while receiving chunks. An unfinished marker becomes a loading placeholder. Code examples and escaped markers remain literal. Capsules share canonical image identities to avoid duplicate images within an answer.

The renderer currently displays images. The broader media type declarations do not provide video or Lottie playback.

## Architecture

```text
Your Markdown or AI stream
        |
StreamingMarkdownView -> InlineCapsule -> /api/resolve
        |                                    |
 ordinary Markdown                 Wikipedia / Commons / DuckDuckGo
                                             |
                                    /api/media-proxy -> image
```

| Location | Responsibility |
| --- | --- |
| `src/core/` | Types, marker helpers, and legacy tokenizer |
| `src/components/` | Markdown renderer, capsules, and lightbox |
| `src/lib/wikimedia.ts` | Browser resolver client and request deduplication |
| `app/api/resolve/` | Demo image search and metadata cache |
| `app/api/media-proxy/` | Demo image delivery and in-process buffer cache |
| `app/api/chat/`, `app/api/random-question/` | Optional Gemini playground features |
| `app/page.tsx`, `src/lib/presets.ts` | Playground controls and sample answers |

The proxy accepts approved HTTPS image hosts, pins public DNS addresses, rejects redirects and active content, and validates raster image signatures. Images are capped at 8 MiB with a five-second deadline; its cache is capped at 128 entries / 32 MiB. Browser metadata is capped at 256 entries / 1 MiB and expires after 15 minutes. Requests share work and propagate cancellation. These limits apply per process or browser session; they are not deployment-wide quotas. Provider searches and image availability remain best effort.

## Contributing

Use the npm lockfile, keep changes focused, and describe the visible before/after behavior. Run the test, type, and build checks above. For renderer or API changes, add regression coverage and check desktop/mobile layouts, partial streams, failed image requests, and keyboard interaction. Never commit keys, `.env.local`, or private test output.

The [production review](docs/PRODUCTION_REVIEW.md) is the current release checklist. A successful build alone is not release approval.

## License and media

Code is covered by the [MIT license](LICENSE). Retrieved images and reference text have their own source-specific terms; do not assume they are covered by this repository's license. Bundled assets still need a provenance/attribution inventory before redistribution is signed off. Source links in the UI are references, not a complete license record.
