# Neanderthal

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)

Inline image capsules for streaming Markdown. Write ordinary prose, drop a marker after a subject, and the renderer resolves an image without interrupting the text.

```markdown
An anglerfish ![Deep sea anglerfish](neanderthal:image) attracts prey with a glowing lure.
```

## About

For most of writing's history, images lived *inside* the text. Egyptian hieroglyphs, Maya glyphs, and cuneiform all carried sound and picture in the same line. Modern writing traded that for speed: 26 reusable letters can spell anything, but a word can name a thing without ever showing it to you. The pictures moved out of the sentence and became citations, thumbnails, and links you have to leave the page for.

Research on multimedia learning calls the fix the **spatial contiguity principle** — people understand words and pictures better when the two sit close together. The same research warns the other way: *seductive details*, interesting but irrelevant images, reliably make comprehension worse. So the goal is not a picture on every line. It is zero distance between an unfamiliar idea and the one image that resolves it, and nothing else.

What is new is that AI can do the joining at the moment of explanation: spot the visual concept, find a trustworthy image, place it beside the right phrase, and keep the source attached. That is what this repo tries out. The long version is in [Essay](https://neanderthal-script.vercel.app/).

This is a Next.js playground demonstrating the renderer. Copy the source into your own app — there is no npm package.

## Run it

Node 22 or 24, verified on 24.11.1.

```bash
pnpm install
pnpm dev -- --hostname 127.0.0.1
```

Open [localhost:3000](http://localhost:3000). An answer streams in on load. Hover a capsule for a preview, click it to inspect, use the Craft controls to change capsule size and alignment, or paste your own Markdown into the input. None of that needs an API key; image search needs an internet connection.

### Optional: live AI answers

Set a Gemini key on the server to enable Shuffle and live answers:

```bash
cp .env.example .env.local   # then fill in GEMINI_API_KEY
```

`GEMINI_MODEL` overrides the default model. The API routes have no auth or rate limiting, so do not put a shared key on a public deployment.

### Checks

```bash
pnpm test
pnpm exec tsc --noEmit
pnpm build
```

`pnpm lint` still prompts for ESLint setup; it is not a validation gate yet.

## Markdown syntax

| Form | Meaning |
| --- | --- |
| `![Subject](neanderthal:image)` | Resolve an image, provider chosen automatically |
| `![Subject](neanderthal:image?provider=wikipedia)` | Prefer Wikipedia |
| `![Subject](neanderthal:image?provider=duckduckgo)` | Prefer DuckDuckGo |
| `![Alt](https://example.com/image.jpg)` | Normal Markdown image |
| `![media:Subject\|wiki]` | Legacy syntax, still parsed |

Name the subject in the sentence, then put its capsule after it, so the prose still reads if the image fails. `createNeanderthalMediaMarkdown` in `src/core/media-markdown.ts` generates markers and encodes fallback URLs.

Only images render today.

## Use it in your app

Pass the accumulated text as `content` and set `isStreaming` while chunks arrive. An unfinished marker renders as a loading placeholder; code blocks and escaped markers stay literal. Capsules share canonical image identities, so an answer will not repeat the same picture.

```tsx
import { StreamingMarkdownView } from './src/components/StreamingMarkdownView';
import { DEFAULT_CAPSULE_SETTINGS } from './src/core/types';

<StreamingMarkdownView
  content="An anglerfish ![Deep sea anglerfish](neanderthal:image) uses a glowing lure."
  settings={DEFAULT_CAPSULE_SETTINGS}
/>
```

Requires Tailwind CSS and `/api/resolve` on the same origin. Add `onInspect` and `MediaLightbox` for click-to-inspect. Details in the [integration guide](docs/INTEGRATION.md).

## Layout

```text
Markdown or AI stream -> StreamingMarkdownView -> InlineCapsule -> /api/resolve      -> Wikipedia / Commons / DuckDuckGo
                                                                -> /api/media-proxy  -> image
```

| Path | What it does |
| --- | --- |
| `src/core/` | Types and marker helpers |
| `src/components/` | Renderer, capsules, lightbox |
| `src/lib/` | Resolver client, request dedup, caches, proxy fetch, Gemini config |
| `app/api/resolve/` | Image search and metadata cache |
| `app/api/media-proxy/` | Image delivery and buffer cache |
| `app/api/chat/`, `app/api/random-question/` | Optional Gemini features |
| `app/Playground.tsx`, `src/lib/presets.ts` | Demo UI and sample answer |

The proxy fetches only approved HTTPS hosts, pins public DNS addresses, rejects redirects and active content, and validates raster image signatures. Images cap at 8 MiB with a five-second deadline. Caches are bounded per process and per browser session, not deployment-wide.

## Contributing

Run the checks above and keep changes focused. For renderer or API changes, add regression coverage and check partial streams, failed image requests, mobile layout, and keyboard interaction. Never commit keys or `.env.local`.

A green build is not release approval: the API routes still have no auth or rate limiting.

## License

Code is [MIT](LICENSE). Retrieved images and reference text carry their own source terms and are not covered by this license.
