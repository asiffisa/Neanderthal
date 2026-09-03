# Neanderthal 🦴🌿

> **Interactive multimedia documentary engine** that streams real-time AI knowledge and seamlessly embeds inline visual capsules directly on the typographic baseline.

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-3.8_Flash-4285F4?style=flat-square&logo=google)](https://ai.google.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)

---

## ✨ Overview

**Neanderthal** transforms AI-authored Markdown into visual prose. As an answer streams, standard Markdown image nodes using the `neanderthal:` destination are upgraded into interactive, cap-height matched visual capsules directly inside the text flow.

Hovering over any capsule reveals a detailed floating preview card with origin provenance, while clicking opens an immersive, high-resolution inspection lightbox.

---

## 🚀 Key Features

### 1. 🧩 Baseline-Aligned Inline Media Capsules
- Inline visual pills render directly on the font baseline, optically nudged to match cap height.
- Smooth shimmering loading skeletons during active stream resolution.
- Real-time craft controls to adjust height, border radius, asset gap, and vertical offset.

### 2. 🌐 Resolver-Independent Visual Intelligence
- The Markdown asks for a visual without coupling the prose to a search provider.
- The demo resolver currently searches Wikipedia, Wikimedia Commons, and a DuckDuckGo fallback.
- Interactive hover cards and lightboxes indicate the selected source with a direct link.

### 3. 🛡️ Document-Wide Image Deduplication
- **Root-Cause Prevention**: Prevents duplicate images when an answer mentions synonymous concepts (e.g. *Venus* and *Morning star*).
- **Collision Detection & Gallery Rotation**: If two entities resolve to the same image URL, the resolver automatically skips the duplicate and selects an alternative specimen photo from Wikipedia's content gallery or DuckDuckGo.

### 4. 🎲 AI-Powered Non-Repeating Shuffle
- Dedicated `/api/random-question` endpoint powered by Google Gemini (temperature 1.0, JSON mode).
- Dynamically invents never-before-seen nature, astrophysics, microbiology, and quantum mechanics prompts.
- Tracks recently generated topics to guarantee non-repeating discovery.

### 5. ⚡ Performance & High-Efficiency Architecture
- **Direct Streaming Proxy** (`/api/media-proxy`): Streams image bytes directly to the browser without buffering full images into server RAM.
- **In-Memory LRU Cache** (`/api/resolve`): Server-side resolution cache provides ~6ms response times for repeated queries.
- **Client In-Flight Request Deduplication**: Multiple simultaneous tokens for the same entity share a single network fetch.
- **Deterministic Token IDs**: Prevents unnecessary DOM destruction and remounting during character-by-character streaming.

---

## 🏗️ Architecture & Token Syntax

The public contract uses standard Markdown image structure. The image description is the search query, while the `neanderthal:image` destination tells an enabled renderer to resolve it dynamically:

```markdown
An anglerfish ![Deep sea anglerfish](neanderthal:image) attracts prey with a glowing lure.
```

Ordinary Markdown—including headings, lists, links, tables, code, and regular images—continues through the standard renderer unchanged. The earlier `![media:Query|vendor]` form remains supported temporarily for migration.

During streaming, an unfinished image marker becomes a non-resolving placeholder. Once the complete marker arrives, the resolver fills the capsule while the rest of the answer continues.

---

## 🛠️ Getting Started

### Prerequisites
- **Node.js**: v18.17+ (or v20+)
- **pnpm**: v8+ (recommended)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/asiffisa/Neanderthal.git
   cd Neanderthal
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Configure Environment (Optional)**:
   You can provide your Gemini API key in a `.env.local` file:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
   *Note: You can also enter or change your API key directly in the web UI via the **Add Key** button in the header.*

4. **Run Development Server**:
   ```bash
   pnpm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

5. **Production Build & Package**:
   ```bash
   pnpm run package
   pnpm start
   ```

---

## 📁 Project Structure

```
Neanderthal/
├── app/
│   ├── api/
│   │   ├── chat/             # Gemini streaming SSE endpoint
│   │   ├── media-proxy/      # Streaming image proxy (anti-CORS, direct pipe)
│   │   ├── random-question/  # AI unscripted question generator
│   │   └── resolve/          # Multi-source image resolver with LRU cache
│   ├── layout.tsx            # Root layout & font definitions
│   └── page.tsx              # Main interactive UI & playground
├── src/
│   ├── components/
│   │   ├── InlineCapsule.tsx          # Baseline-aligned interactive capsule
│   │   ├── MediaLightbox.tsx          # Full-screen inspection modal
│   │   └── StreamingMarkdownView.tsx  # Tokenized streaming markdown renderer
│   ├── core/
│   │   ├── tokenizer.ts      # Streaming regex tokenizer with pipe vendor parsing
│   │   └── types.ts          # Core TypeScript interfaces & tokens
│   └── lib/
│       ├── presets.ts        # Built-in scientific exploration prompts
│       └── wikimedia.ts      # Client resolver & in-flight deduplicator
├── tailwind.config.ts        # Styling & design system tokens
└── package.json              # Scripts & dependencies
```

---

## 🤝 Contributing & Customization

- **Models Supported**: Gemini 3.8 Flash, Gemini 3.5 Flash Lite, and Gemini 2.5 Flash.
- **Craft Defaults**: Customize default capsule height, border radius, and optical offsets in `src/core/types.ts`.

---

## 📄 License

MIT License © 2026 Neanderthal Project.
