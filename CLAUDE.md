# CLAUDE.md

## Project Overview

Palace Royale is a Vite + React SPA (Single Page Application) using Tailwind CSS and Radix UI components.

## Build & Dev

- `npm run dev` — Start Vite dev server
- `npm run build` — Build for production (outputs to `dist/`)

## Deployment (Vercel)

This project deploys to Vercel as a static site, **not** as a Next.js app.

- `vercel.json` sets `"framework": null` to override Vercel's auto-detection. Do not remove this — without it, Vercel defaults to the Next.js builder (configured in the dashboard) and fails because there is no `next` dependency.
- Build command: `npm run build` (Vite)
- Output directory: `dist`
- SPA routing is handled via a catch-all rewrite: `/(.*) -> /index.html`

If a Vercel build fails with "No Next.js version detected", the fix is to ensure `"framework": null` is set in `vercel.json` — do **not** add `next` as a dependency.
