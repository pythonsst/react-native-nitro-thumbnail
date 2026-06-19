# Documentation site

The documentation website for **react-native-nitro-thumbnail**, built with
[Nextra](https://nextra.site/) (Next.js). It's a self-contained project — it is
**not** part of the library's Yarn workspaces, so it can't interfere with the
`bob`/`nitrogen` build.

## Local development

```sh
cd website
npm install
npm run dev      # http://localhost:3000
```

```sh
npm run build    # production build (static-prerendered pages)
npm run start    # serve the production build
```

## Project layout

```
website/
├── pages/
│   ├── index.mdx              # landing page (hero + feature cards + "how it works")
│   ├── _meta.js               # top-level sidebar nav order
│   ├── getting-started/       # Installation, Quick Start
│   ├── guides/                # Architecture, API Reference, Error Handling, Caching, Migration
│   ├── platforms/             # iOS, Android, Web deep dives
│   └── contributing.mdx
├── public/                    # demo-thumbnail.jpg, favicon.svg
├── theme.config.tsx           # logo, links, banner, footer, SEO head
└── next.config.mjs            # Nextra config (mermaid, copy-code)
```

Content mirrors the markdown in [`../docs`](../docs); the MDX pages add a landing
page, sidebar navigation, full-text search, dark mode, and client-rendered
[mermaid](https://mermaid.js.org/) diagrams.

## Deploy to Vercel

The site lives in a subdirectory, so set the **Root Directory** to `website`:

1. Go to [vercel.com/new](https://vercel.com/new) and import
   `pythonsst/react-native-nitro-thumbnail`.
2. In **Configure Project → Root Directory**, choose **`website`**.
3. Framework preset auto-detects **Next.js**. Leave build/install as default
   (`next build` / `npm install` — also pinned in [`vercel.json`](./vercel.json)).
4. Deploy. Every push to `main` then redeploys automatically.

No environment variables or secrets are required.

### Custom domain — `nitro-thumbnail.shivshankartiwari.com`

The site's SEO (`theme.config.tsx`) is pre-configured for
**`https://nitro-thumbnail.shivshankartiwari.com`**. To attach it:

1. In the Vercel project → **Settings → Domains**, add
   `nitro-thumbnail.shivshankartiwari.com`.
2. Because `shivshankartiwari.com` is already managed by Vercel (it serves the
   portfolio), Vercel adds the required DNS record automatically — just click
   **Add** and wait for the green check. No manual DNS, no change to the
   `www`/apex portfolio.

> Want a different subdomain (or a path)? Change `SITE_URL` in
> `theme.config.tsx` and the domain you add in Vercel — that's the only edit.

### Alternative: GitHub Pages (static export)

Nextra can export a fully static site. Add `output: 'export'` to
`next.config.mjs`, run `npm run build` (outputs to `out/`), and publish `out/`
with a GitHub Pages Action. Vercel is recommended because it handles routing and
search without extra config.
