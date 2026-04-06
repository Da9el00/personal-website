# CLAUDE.md

## What this project is

Daniel Smidstrup's personal website — a single-page, scroll-driven "brain map" showcasing who he is, what he builds, and what he cares about. The site is intentionally minimal: one page, no blog, no CMS.

Deployed on Vercel at `https://daniel-smidstrup.vercel.app` (set the `SITE` env var to override the canonical URL).

## Tech stack

| Layer | Tool |
|---|---|
| Framework | [Astro](https://astro.build) v5 |
| UI components | React 19 (via `@astrojs/react`) |
| Styling | Tailwind CSS v3 (via `@astrojs/tailwind`) |
| SEO | `@astrojs/sitemap`, canonical tags, JSON-LD `Person` schema |
| Language | TypeScript |

## Project structure

```
src/
  pages/
    index.astro        # Only page — sets title/description, renders BrainMap
  layouts/
    Base.astro         # HTML shell: SEO meta, OG tags, favicons, JSON-LD
  components/
    BrainMap.astro     # Main visual — pseudo-3D orbiting node graph + scroll steps
    ScrollAccent.astro # Thin progress bar at top of page (no dependencies)
  styles/
    global.css         # Tailwind base, dark theme, dot-grid bg, film grain, animations
public/
  headshot.png         # Daniel's photo
  brain.png            # Brain graphic used in the node map
  favicon*, robots.txt, site.webmanifest
astro.config.mjs       # Registers tailwind, react, sitemap integrations; sets site URL
tailwind.config.mjs    # Tailwind config
```

## Key design decisions

- **Single page only.** All content lives in `BrainMap.astro` as static data (`steps[]` and `nodes[]`). To add/change content, edit those arrays directly.
- **Dark-only theme.** The color scheme is fixed dark (`color-scheme: dark`). Do not add a light mode toggle.
- **Astro-first, React where needed.** Most components are `.astro` files. React is available for interactive islands if needed, but the current components are all static/vanilla JS.
- **No client-side router.** This is a static site; Astro handles all rendering at build time.
- **Accessibility-aware animations.** All motion respects `prefers-reduced-motion`.

## Common commands

```bash
npm run dev       # Start dev server (localhost:4321 by default)
npm run build     # Production build → dist/
npm run preview   # Preview the production build locally
```
