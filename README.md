# Neanderthal 🦴🌿

> **Interactive multimedia documentary engine** that streams real-time AI knowledge and seamlessly embeds inline visual capsules directly on the typographic baseline.

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-3.8_Flash-4285F4?style=flat-square&logo=google)](https://ai.google.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)

---

## ✨ Overview

**Neanderthal** transforms reading into an interactive multimedia documentary. As Google Gemini streams answers to deep science and nature questions, the engine tokenizes key entities on the fly and integrates interactive, cap-height matched visual capsules directly into the text flow without layout shifts or jarring line jumps.

Hovering over any capsule reveals a detailed floating preview card with origin provenance, while clicking opens an immersive, high-resolution inspection lightbox.

---

## 🚀 Key Features

### 1. 🧩 Baseline-Aligned Inline Media Capsules
- Inline visual pills render directly on the font baseline, optically nudged to match cap height.
- Smooth shimmering loading skeletons during active stream resolution.
- Real-time craft controls to adjust height, border radius, asset gap, and vertical offset.

### 2. 🌐 Multi-Source Visual Intelligence (DuckDuckGo + Wikipedia)
- **AI Vendor Selection**: Gemini dynamically decides the best image provider based on subject matter:
  - 🔵 **DuckDuckGo (`|duckduckgo`)**: Candid real-world wildlife photography, celestial telescope captures, and dynamic natural landscapes.
  - 🟡 **Wikipedia (`|wiki`)**: Anatomical cross-sections, cellular diagrams, molecular structures, and taxonomic specimens.
- **Dynamic Visual Badging**: Interactive hover cards and lightboxes clearly indicate the content origin with direct source links.

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

The engine uses custom Markdown tokens parsed in real time by [`tokenizer.ts`](src/core/tokenizer.ts):

```markdown
![media:Query Title|vendor]
```

| Token Syntax | Vendor Behavior | Typical Use Case |
| :--- | :--- | :--- |
| `![media:Anglerfish\|duckduckgo]` | Queries DuckDuckGo web search first | Real-world photography, candid wildlife |
| `![media:Chloroplast\|wiki]` | Queries Wikipedia / Commons first | Scientific schematics, cellular anatomy |
| `![media:Supernova]` | Smart auto-routing | General balance |

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
