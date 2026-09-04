# Production and open-source review

Updated 4 September 2026 on `codex/production-readiness`. Initial baseline: commit `4a78319`. Existing essay and provider-ranking edits were preserved. No styling or layout changes were made.

**The requested SSRF, efficiency, and correctness fixes are implemented and locally verified.** Public release still needs the access-control, dependency, accessibility, and asset checks below. A working local playground is not evidence of unrestricted public-hosting readiness.

## Implemented fixes

| Area | Before | After |
| --- | --- | --- |
| Image proxy destinations | Arbitrary URLs, private hosts and redirects accepted | Exact HTTPS host allowlist; every resolved IP must be public; connection pinned to the validated address; redirects rejected |
| Proxy content | Upstream HTML could be served under the app origin | PNG/JPEG/GIF/WebP/AVIF MIME and signature checks; HTML/SVG rejected; `nosniff`, sandbox CSP and no-referrer headers |
| Image memory | Whole images buffered without a byte limit | 8 MiB per image, 128 entries / 32 MiB retained, eight active downloads per process |
| Deadlines | Some requests unbounded; proxy timeout ended at headers | Proxy five seconds, resolver 15 seconds, chat 45 seconds, shuffle 15 seconds; body consumption stays within deadlines and cancellation propagates |
| Metadata and browser memory | Browser cache grew indefinitely | Server metadata 512 entries / 4 MiB / 24 hours; browser metadata 256 entries / 1 MiB / 15 minutes; both use LRU eviction |
| Duplicate work | Page prefetch overlapped capsule resolution | Removed duplicate prefetch; browser consumers share pending requests and release cancelled work |
| Duplicate images | Encoded proxy exclusions did not match upstream URLs | Canonical identities across client/server, including Wikimedia thumbnail sizes; alternate claims checked against every existing image |
| Fallback correctness | One caller's fallback leaked to other callers; failed images stayed inspectable | Shared cache contains only resolved metadata; fallbacks remain per caller; failed images use a distinct available fallback or clear their image/inspection URL |
| Markdown correctness | Code and escaped markers could become capsules | Markdown syntax context protects code, HTML literals, definitions and escapes; only prose image markers are transformed |
| AI requests | Unbounded inputs, credentials in URLs, retries after invalid keys | 32 KiB JSON limit, field validation, credentials in headers, bounded response bytes, 512-token shuffle cap, no repeated authentication/quota retries |

Proxy validation follows [OWASP SSRF guidance](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html). DNS validation alone is insufficient: the checked address is also used for the actual HTTPS connection while preserving hostname/TLS verification. Per-process cache and concurrency limits are resource guards, not deployment-wide rate limits.

## Verification

- **90 tests passed across nine files**, including SSRF/private-address rejection, redirect rejection, non-image content, oversized bodies, cache eviction, body cancellation, canonical exclusions, simultaneous claims, isolated fallback caching, literal Markdown, fragmented UTF-8 streaming and failed-key retry behavior.
- **TypeScript and production build passed** with Next.js 15.5.25, React 19.2.8 and Node 24.11.1. First-load JavaScript is 206 kB (baseline 204 kB); the Markdown syntax fix adds approximately 2 kB.
- Production playground at 390 × 844: document width 390 px, no page-wide horizontal overflow, six fixture images loaded with six metadata requests. The image-loading check used local fixtures; it does not establish remote provider availability. Lightbox opening and Escape closing passed. Desktop width was 1440 px with no page-wide overflow.
- Earlier baseline: clean `npm ci`, 16 original tests, type check and build passed in an isolated checkout. Desktop warm local trace measured LCP 217 ms and CLS 0.00. These timing figures predate the fixes and are not current production performance claims.
- The original proxy vulnerability was reproduced using owned local HTML/redirect fixtures. The regression suite now rejects those destination/content classes before unsafe delivery.
- Original credential-pattern scan found no matches in 138 reachable Git blobs across 15 commits; this is a pattern-based check, not a guarantee that every possible credential is absent.

No paid live Gemini generation, production load test, public deployment, or clean external-app integration has been verified. No unrelated framework upgrade was made.

## Remaining release work

1. **Shared server-key access controls.** Both AI routes still support `GEMINI_API_KEY` as a fallback. Do not expose that mode publicly without authentication and deployment-level quotas/rate limits. Browser-key UI flows and private server-key behavior also need consistent privacy copy. Input and request limits are implemented; access controls are not.
2. **Dependency advisory.** The installed dependency audit reports two affected packages (one high, one moderate), involving Next.js's nested PostCSS 8.4.31. Root PostCSS is 8.5.26. No exploitable user-CSS path was demonstrated. Validate a supported patched dependency path separately; do not use `npm audit fix --force` blindly. See the [upstream advisory](https://github.com/postcss/postcss/security/advisories/GHSA-6g55-p6wh-862q).
3. **Provider delivery.** Five Wikimedia images returned 403 in the original environment, with a robot-policy refusal. This upstream restriction is not bypassed. Failed images now fall back safely or become text-only. Verify permitted image delivery from the intended hosting environment before release. The demo still uses its thumbnail as `fullImageUrl`; do not advertise additional resolution.
4. **Accessibility.** Modal focus containment/return, accessible dialog names, slider labels, semantic sidebar buttons and contrast remain. The baseline Lighthouse accessibility result was 89. These need a separate UI pass without changing established geometry.
5. **Repeatable gates.** `npm run lint` is still interactive/unconfigured and CI is not supplied. Configure clean install, tests, types, build and dependency auditing before release.
6. **Source distribution and media rights.** The repository remains a private Next.js application package without library exports/declarations. The [integration guide](INTEGRATION.md) documents source copying and includes a typed example. A published npm package needs a library build and consumer smoke test. Bundled assets need source/author/license records; the MIT code license does not grant image rights.
7. **Deployment cache cleanup.** When deploying over a previously public vulnerable proxy, purge old proxy responses from the hosting/CDN cache. New responses have safe headers, but old cached responses may predate the fix.

The next public release should address these remaining gates and verify the intended host. See the [Next.js production checklist](https://nextjs.org/docs/app/guides/production-checklist). Local use instructions are in the [README](../README.md).
