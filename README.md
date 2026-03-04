# dasmap

A structured map of Ethereum's data availability sampling (DAS) design space: atomic building blocks, their properties, relationships, and how they compose into full protocol proposals.

Live at [raulk.github.io/dasmap](https://raulk.github.io/dasmap).

## Local development

Requires Node.js 22+ and pnpm 10+.

```sh
pnpm install
pnpm dev
```

Opens at `http://localhost:4321`.

## Build

```sh
pnpm build
pnpm preview
```

## Stack

- [Astro 5](https://astro.build) (static site generation)
- [React 19](https://react.dev) (interactive islands)
- [Tailwind CSS v4](https://tailwindcss.com)
- [D3](https://d3js.org) (graph visualization)

## Deployment

Deployed to GitHub Pages via the workflow in `.github/workflows/deploy.yml`. Pushes to `main` trigger a build and deploy automatically.
