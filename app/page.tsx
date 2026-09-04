import { readFile } from 'node:fs/promises';
import path from 'node:path';
import Image from 'next/image';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Playground from './Playground';
import styles from './essay.module.css';

const playgroundHeading = 'Put the picture where the meaning happens';
const pictographicHeading = 'The evolution of pictographic script';
const pictographicTransition = "They weren't alone.";

const pictographicPanels = [
  {
    marker: '**Egyptian hieroglyphs**',
    image: '/egypt%20hieroglyphs.jpg',
    alt: 'Egyptian hieroglyphs carved on a stone tablet',
    width: 640,
    height: 480,
  },
  {
    marker: '**Maya glyphs**',
    image: '/Maya%20scripts.jpg',
    alt: 'Maya script glyphs',
    width: 1536,
    height: 1198,
    reverse: true,
  },
];

function PictographicScriptSection({ markdown }: { markdown: string }) {
  const blocks = markdown.trim().split(/\n\s*\n/);

  return (
    <div className={styles.prose}>
      {blocks.map((block, index) => {
        const panel = pictographicPanels.find(({ marker }) => block.startsWith(marker));

        if (!panel) {
          if (block === pictographicTransition) {
            return (
              <div key={pictographicTransition} className={styles.scriptTransition}>
                <Markdown remarkPlugins={[remarkGfm]}>{block}</Markdown>
              </div>
            );
          }

          return <Markdown key={`${index}-${block.slice(0, 24)}`} remarkPlugins={[remarkGfm]}>{block}</Markdown>;
        }

        return (
          <div
            key={panel.marker}
            className={`${styles.scriptPair} ${panel.reverse ? styles.scriptPairReverse : ''}`}
          >
            <div className={styles.scriptCopy}>
              <Markdown remarkPlugins={[remarkGfm]}>{block}</Markdown>
            </div>
            <figure className={styles.scriptFigure}>
              <Image src={panel.image} alt={panel.alt} width={panel.width} height={panel.height} sizes="(max-width: 760px) 100vw, 320px" />
            </figure>
          </div>
        );
      })}
    </div>
  );
}

export default async function EssayPage() {
  const essay = await readFile(path.join(process.cwd(), 'ESSAY.md'), 'utf8');
  const [titleMarkdown, ...sections] = essay.trim().split(/(?=^## )/m);
  const [title, subtitle] = titleMarkdown.replace(/^#\s+/, '').trim().split(' - ', 2);

  return (
    <div className="min-h-screen bg-[#090a0c] px-5 text-zinc-100 md:px-8">
      <div className={styles.page}>
        <main>
          <article>
            <figure className={styles.coverImage}>
              <Image
                src="/Lascaux-Grotto-cave-paintings-Dordogne-France.webp"
                alt="Lascaux cave paintings in Dordogne, France"
                width={1600}
                height={440}
                sizes="(max-width: 1024px) calc(100vw - 40px), 960px"
                priority
              />
            </figure>
            <header className={styles.header}>
              <h1>{title}</h1>
              {subtitle && <p>{subtitle}</p>}
            </header>

            {sections.map((section) => {
              const heading = section.match(/^## (.+)/)?.[1] || '';
              return (
                <section key={heading} className={styles.section} aria-label={heading}>
                  {heading === pictographicHeading ? (
                    <PictographicScriptSection markdown={section} />
                  ) : (
                    <div className={styles.prose}>
                      <Markdown remarkPlugins={[remarkGfm]}>{section}</Markdown>
                    </div>
                  )}
                  {heading === playgroundHeading && (
                    <section id="playground" aria-label="Neanderthal playground" className={styles.playground}>
                      <Playground />
                    </section>
                  )}
                </section>
              );
            })}
          </article>
        </main>

        <footer className={styles.footer}>
          <a className={styles.signature} href="https://cradlstudio.in" aria-label="Visit Asif's portfolio at cradlstudio.in">
            <Image src="/asif%20sign.png" alt="Asif's signature" width={241} height={203} sizes="56px" />
            <span>cradlstudio.in</span>
          </a>
          <nav aria-label="Social links" className={styles.socials}>
            <a href="https://github.com/asiffisa/Neanderthal" target="_blank" rel="noopener noreferrer" aria-label="Neanderthal on GitHub">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 .297a12 12 0 0 0-3.793 23.385c.6.111.82-.261.82-.577v-2.234c-3.338.726-4.043-1.416-4.043-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.776.418-1.305.762-1.605-2.665-.303-5.467-1.334-5.467-5.931 0-1.31.469-2.381 1.236-3.221-.124-.303-.536-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.52 11.52 0 0 1 12 6.097c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.655 1.652.243 2.873.119 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.625-5.479 5.922.431.372.815 1.102.815 2.222v3.293c0 .319.216.694.825.576A12.001 12.001 0 0 0 12 .297Z" />
              </svg>
            </a>
            <a href="https://x.com/asifb_" target="_blank" rel="noopener noreferrer" aria-label="Asif on X">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.64 7.584H.47l8.6-9.835L0 1.154h7.594l5.243 6.932 6.064-6.933Zm-1.29 19.49h2.039L6.487 3.24H4.3l13.31 17.403Z" />
              </svg>
            </a>
          </nav>
        </footer>
      </div>
    </div>
  );
}
