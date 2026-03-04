# dasmap implementation plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a complete static Astro site that maps the Ethereum DAS design space, with 46 atom pages, 15 property pages, 10+ composite pages, and 5 interactive React islands.

**Architecture:** Astro 5 with content collections in `src/content/`, React islands for interactive views (graph, matrix, compare, decision, timeline), Tailwind CSS for styling. A seeder script bootstraps all 70+ markdown files from the JSX data; a build-time indexer writes `_generated/` indexes. All data is read-only from markdown — no CMS, no API, no localStorage.

**Tech stack:** Astro 5, React 18, Tailwind CSS 3, TypeScript, d3-force, pnpm, JetBrains Mono + IBM Plex Sans (Google Fonts).

---

## Assumptions

**Obvious:**
- Node.js 18+ is available.
- pnpm is the package manager (not npm).
- The site is entirely static (`astro build`).

**Hidden:**
- Content files go in `src/content/` (Astro's default), not a root-level `content/` dir. The spec says `content/` at the root but Astro requires `src/content/`. We adapt.
- `_generated/` goes at the project root (human-readable, committed, never edited by hand).
- The seeder script reads atom/edge data from a TypeScript constants file (extracted from the JSX) rather than parsing the JSX file directly.
- All prose content for atom descriptions is taken verbatim from `das-building-blocks-v3.md`.
- React islands use client:load for graph/matrix/compare since they are primary views.
- d3-force runs as a pure JS module imported inside React islands.

## Decisions

- **Content seeder first**: Write a one-time Node.js seeder that generates all 70+ markdown files from structured data. This avoids hand-writing each file and ensures relationship tables are complete and consistent.
- **Single data source**: Extract all structured data into `src/data/atoms.ts`, `src/data/edges.ts`, `src/data/composites.ts`, `src/data/properties.ts`. Both the seeder and the Astro build import from these. This is the single source of truth for relationships.
- **No `astro:content` for graph data**: The graph/matrix/compare islands import from `src/data/*.ts` directly (not from content collections) to avoid async collection loading inside client components.
- **_generated indexes**: Written by a build-time Astro integration (registered in `astro.config.mjs`) that runs after content is loaded. The integration writes four markdown tables to `_generated/`.
- **Tailwind for layout, inline styles for category colors**: Category colors are dynamic (from data), so they go as CSS custom properties on elements. Tailwind handles spacing, typography, and structural layout.
- **No search in v1**: Per spec.
- **Decision tree**: Static SVG with positioned foreignObject nodes — no force layout.

---

## Invariants

- `pnpm build` produces no TypeScript errors and no broken links.
- Every atom ID referenced in any composite's `atoms` frontmatter field has a corresponding atom file.
- Every property ID referenced in any atom's `## Relationships` table has a corresponding property file.
- The dependency graph only shows atom-to-atom edges (no property edges, no external deps).

---

## Task 1: Scaffold Astro project

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tailwind.config.mjs`, `tsconfig.json`

**Step 1: Initialize project**

```bash
cd /Users/raul/W/ethereum/dasmap
pnpm create astro@latest . --template minimal --no-install --typescript strict --no-git
```

**Step 2: Install dependencies**

```bash
pnpm install
pnpm add @astrojs/react @astrojs/tailwind react react-dom d3 gray-matter js-yaml
pnpm add -D tailwindcss @types/react @types/react-dom @types/d3 @types/js-yaml tsx
```

**Step 3: Update astro.config.mjs**

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  integrations: [react(), tailwind()],
  output: 'static',
});
```

**Step 4: Update tsconfig.json** (add path aliases)

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@data/*": ["src/data/*"],
      "@components/*": ["src/components/*"]
    }
  }
}
```

**Step 5: Create tailwind config**

```js
// tailwind.config.mjs
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: { extend: {} },
  plugins: [],
};
```

**Step 6: Verify**

Run: `pnpm build`
Expected: Build succeeds (empty site).

---

## Task 2: Create structured data files

Extract atom, edge, property, and composite data into TypeScript files. These are the single source of truth.

**Files:**
- Create: `src/data/categories.ts`
- Create: `src/data/properties.ts`
- Create: `src/data/atoms.ts`
- Create: `src/data/edges.ts`
- Create: `src/data/composites.ts`
- Create: `src/data/maturity.ts`

**Step 1: Create `src/data/categories.ts`**

```ts
export type CategoryId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I';

export interface Category {
  name: string;
  color: string;
  layer: number;
}

export const CATEGORIES: Record<CategoryId, Category> = {
  A: { name: 'Erasure coding',                color: '#2563eb', layer: 0 },
  B: { name: 'Messaging',                     color: '#7c3aed', layer: 1 },
  C: { name: 'Subnet topology',               color: '#0891b2', layer: 1 },
  D: { name: 'Overhead reduction',            color: '#059669', layer: 2 },
  E: { name: 'Reconstruction / Engine API',   color: '#d97706', layer: 3 },
  F: { name: 'Publisher optimization',        color: '#dc2626', layer: 4 },
  G: { name: 'Mempool techniques',            color: '#be185d', layer: 5 },
  H: { name: 'Security / sampling',           color: '#4338ca', layer: 6 },
  I: { name: 'Propagation scheduling',        color: '#0d9488', layer: 7 },
};
```

**Step 2: Create `src/data/maturity.ts`**

```ts
export const MATURITY_LABELS = ['', 'Idea', "Spec'd", 'Draft impl', 'Tested', 'Shipped'] as const;
export const MATURITY_COLORS = ['', '#f87171', '#fb923c', '#facc15', '#a3e635', '#34d399'] as const;
```

**Step 3: Create `src/data/properties.ts`**

```ts
export interface Property {
  id: string;
  name: string;
}

export const PROPERTIES: Property[] = [
  { id: 'P1',  name: 'Throughput scalability' },
  { id: 'P2',  name: 'Per-node bandwidth efficiency' },
  { id: 'P3',  name: 'Supernode independence' },
  { id: 'P4',  name: 'Critical-path viability' },
  { id: 'P5',  name: 'Reconstruction granularity' },
  { id: 'P6',  name: 'Cross-dimensional repair' },
  { id: 'P7',  name: 'Liveness resilience' },
  { id: 'P8',  name: 'Query unlinkability' },
  { id: 'P9',  name: 'Future compatibility' },
  { id: 'P10', name: 'Implementation complexity' },
  { id: 'P11', name: 'Builder bandwidth relief' },
  { id: 'P12', name: 'Mempool fragmentation tolerance' },
  { id: 'P13', name: 'Withholding attack resistance' },
  { id: 'P14', name: 'Backwards compatibility' },
  { id: 'P15', name: 'Cryptographic/verification overhead' },
];
```

**Step 4: Create `src/data/atoms.ts`**

Full atom list extracted from `das-explorer-v3.jsx` ATOMS array (all 47 atoms including E2b). Each atom has: `id`, `name`, `cat`, `maturity`, `desc`, `benefits`, `hurts`, `openQs`, `deps`, `refs`.

(See seeder in Task 3 for how this data populates the content files.)

```ts
import type { CategoryId } from './categories';

export interface AtomDeps {
  requires?: string[];
  enables?: string[];
  requiredBy?: string[];
  conflicts?: string[];
  alternative?: string[];
  alternativeTo?: string[];
  resolves?: string[];
  resolvedBy?: string[];
  evolves?: string[];
  evolvedBy?: string[];
  transforms?: string[];
  transformedBy?: string[];
  partiallyReplaces?: string[];
  requires2?: string[];  // external deps
}

export interface Atom {
  id: string;
  name: string;
  cat: CategoryId;
  maturity: number;
  desc: string;
  benefits: string[];
  hurts: string[];
  openQs: string[];
  deps: AtomDeps;
  refs: string[];
}

export const ATOMS: Atom[] = [
  // (full list — copy all 47 entries from das-explorer-v3.jsx ATOMS array)
  // Make sure to include: A1-A5, B1-B4, C1-C4, D1-D3, E1-E2b-E3-...-E10,
  // F1-F5, G1-G4, H1-H5, I1-I4
];
```

**Step 5: Create `src/data/edges.ts`**

```ts
export type EdgeType =
  | 'requires' | 'enables' | 'benefits from' | 'conflicts'
  | 'alternative' | 'complements' | 'resolves' | 'evolves'
  | 'transforms';

export interface Edge {
  from: string;
  to: string;
  type: EdgeType;
  note?: string;
}

export const EDGES: Edge[] = [
  // (copy all edge entries from das-explorer-v3.jsx EDGES array)
  // Note: convert property-impact edges (benefits/hurts) to separate
  // PROPERTY_IMPACTS array below
];
```

**Step 6: Create `src/data/composites.ts`**

```ts
export interface Composite {
  id: string;
  name: string;
  maturity: number;
  atoms: string[];
  also_requires?: string[];
  desc: string;
  keyProps?: string;
  limitations: string;
}

export const COMPOSITES: Composite[] = [
  // (copy from das-explorer-v3.jsx COMPOSITES array, augment with keyProps)
];
```

**Step 7: Run TypeScript check**

Run: `pnpm exec tsc --noEmit`
Expected: No errors.

---

## Task 3: Write content seeder script

The seeder reads `src/data/*.ts` and generates all markdown content files.

**Files:**
- Create: `scripts/seed-content.ts`
- Create: `scripts/seed-content.sh`

**Step 1: Create `scripts/seed-content.ts`**

```ts
#!/usr/bin/env tsx
// One-time seeder: generates all content markdown files from src/data/*.ts
// Run with: pnpm seed

import fs from 'node:fs';
import path from 'node:path';
import { ATOMS } from '../src/data/atoms.ts';
import { PROPERTIES } from '../src/data/properties.ts';
import { COMPOSITES } from '../src/data/composites.ts';
import { EDGES } from '../src/data/edges.ts';

const CONTENT_DIR = path.join(process.cwd(), 'src', 'content');

// Helper: edge type to relationship type in the template
function edgeTypeToRelType(type: string): string {
  return type; // already matches the spec
}

// Build reverse edge map: for each atom, what points TO it?
const reverseEdges = new Map<string, Array<{ from: string; type: string }>>();
for (const edge of EDGES) {
  if (!reverseEdges.has(edge.to)) reverseEdges.set(edge.to, []);
  reverseEdges.get(edge.to)!.push({ from: edge.from, type: edge.type });
}

// === Atoms ===
fs.mkdirSync(path.join(CONTENT_DIR, 'atoms'), { recursive: true });

for (const atom of ATOMS) {
  const slug = `${atom.id.toLowerCase()}-${atom.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
  const filename = `${slug}.md`;

  // Build relationships table rows
  const relRows: string[] = [];

  // Property impacts (benefits/hurts)
  for (const pid of atom.benefits) {
    relRows.push(`| ${pid} | benefits | |`);
  }
  for (const pid of atom.hurts) {
    relRows.push(`| ${pid} | hurts | |`);
  }

  // Atom-to-atom edges (outgoing)
  const outgoing = EDGES.filter(e => e.from === atom.id);
  for (const e of outgoing) {
    relRows.push(`| ${e.to} | ${e.type} | |`);
  }

  // External requirements (deps.requires2)
  for (const ext of atom.deps.requires2 ?? []) {
    relRows.push(`| ${ext} | requires (external) | |`);
  }

  const relTable = relRows.length > 0
    ? `| Target | Type | Note |\n|--------|------|------|\n${relRows.join('\n')}`
    : '_No relationships defined._';

  const openQsSection = atom.openQs.length > 0
    ? atom.openQs.map(q => `- ${q}`).join('\n')
    : '_None documented._';

  const refsSection = atom.refs.length > 0
    ? atom.refs.map(r => `- ${r}`).join('\n')
    : '_None._';

  const content = `---
id: ${atom.id}
name: "${atom.name.replace(/"/g, '\\"')}"
category: ${atom.cat}
maturity: ${atom.maturity}
---

## Description

${atom.desc}

## Relationships

${relTable}

## Open questions

${openQsSection}

## References

${refsSection}
`;

  fs.writeFileSync(path.join(CONTENT_DIR, 'atoms', filename), content);
  console.log(`wrote atoms/${filename}`);
}

// === Properties ===
fs.mkdirSync(path.join(CONTENT_DIR, 'properties'), { recursive: true });

for (const prop of PROPERTIES) {
  const slug = `${prop.id.toLowerCase()}-${prop.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
  const filename = `${slug}.md`;

  const content = `---
id: ${prop.id}
name: "${prop.name.replace(/"/g, '\\"')}"
---

## Description

_TODO: Fill in from das-building-blocks-v3.md section 1._

## Evaluation

_TODO: Fill in evaluation criteria._
`;

  fs.writeFileSync(path.join(CONTENT_DIR, 'properties', filename), content);
  console.log(`wrote properties/${filename}`);
}

// === Composites ===
fs.mkdirSync(path.join(CONTENT_DIR, 'composites'), { recursive: true });

for (const comp of COMPOSITES) {
  const slug = comp.id.replace(/([A-Z])/g, c => `-${c.toLowerCase()}`).replace(/^-/, '');
  const filename = `${slug}.md`;

  const atomsList = JSON.stringify(comp.atoms);
  const alsoRequires = comp.also_requires ? `\nalso_requires: ${JSON.stringify(comp.also_requires)}` : '';

  const content = `---
id: "${comp.id}"
name: "${comp.name.replace(/"/g, '\\"')}"
maturity: ${comp.maturity}
atoms: ${atomsList}${alsoRequires}
---

## Description

${comp.desc}

## Key properties

_TODO: Fill in key properties._

## Limitations

${comp.limitations}

## References

_TODO: Fill in references._
`;

  fs.writeFileSync(path.join(CONTENT_DIR, 'composites', filename), content);
  console.log(`wrote composites/${filename}`);
}

console.log('\nSeeding complete. Review and enrich generated files.');
```

**Step 2: Add pnpm scripts to package.json**

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "seed": "tsx scripts/seed-content.ts"
  }
}
```

**Step 3: Run seeder**

Run: `pnpm seed`
Expected: 47+ files created in `src/content/atoms/`, 15 in `src/content/properties/`, 10+ in `src/content/composites/`.

---

## Task 4: Define Astro content collection schemas

**Files:**
- Create: `src/content/config.ts`

**Step 1: Write schema**

```ts
// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const atoms = defineCollection({
  type: 'content',
  schema: z.object({
    id: z.string(),
    name: z.string(),
    subtitle: z.string().optional(),
    category: z.enum(['A','B','C','D','E','F','G','H','I']),
    maturity: z.number().int().min(1).max(5),
  }),
});

const properties = defineCollection({
  type: 'content',
  schema: z.object({
    id: z.string(),
    name: z.string(),
  }),
});

const composites = defineCollection({
  type: 'content',
  schema: z.object({
    id: z.string(),
    name: z.string(),
    maturity: z.number().int().min(1).max(5),
    atoms: z.array(z.string()),
    also_requires: z.array(z.string()).optional(),
  }),
});

export const collections = { atoms, properties, composites };
```

**Step 2: Verify build**

Run: `pnpm build`
Expected: Content collections load without schema errors.

---

## Task 5: Write _generated index builder (Astro integration)

**Files:**
- Create: `src/integrations/generate-indexes.ts`
- Modify: `astro.config.mjs`

**Step 1: Create integration**

```ts
// src/integrations/generate-indexes.ts
import type { AstroIntegration } from 'astro';
import fs from 'node:fs';
import path from 'node:path';
import { ATOMS } from '../data/atoms.ts';
import { EDGES } from '../data/edges.ts';
import { COMPOSITES } from '../data/composites.ts';

export function generateIndexes(): AstroIntegration {
  return {
    name: 'generate-indexes',
    hooks: {
      'astro:build:start': () => {
        const dir = path.join(process.cwd(), '_generated');
        fs.mkdirSync(dir, { recursive: true });

        // all-atoms.md
        const atomRows = ATOMS.map(a => {
          const benefits = EDGES
            .filter(e => e.from === a.id && (e.type === 'benefits' as unknown as string))
            .map(e => e.to).join(', ');
          return `| ${a.id} | ${a.name} | ${a.cat} | ${a.maturity} | ${a.benefits.join(', ')} | ${a.hurts.join(', ')} |`;
        });
        fs.writeFileSync(path.join(dir, 'all-atoms.md'),
          `| ID | Name | Category | Maturity | Benefits | Hurts |\n|----|------|----------|----------|----------|-------|\n${atomRows.join('\n')}\n`);

        // all-edges.md
        const edgeRows = EDGES.map(e => `| ${e.from} | ${e.to} | ${e.type} | ${e.note ?? ''} |`);
        fs.writeFileSync(path.join(dir, 'all-edges.md'),
          `| From | To | Type | Note |\n|------|----|------|------|\n${edgeRows.join('\n')}\n`);

        // all-property-impacts.md
        const impactRows: string[] = [];
        for (const a of ATOMS) {
          for (const p of a.benefits) impactRows.push(`| ${a.id} | ${p} | benefits | |`);
          for (const p of a.hurts) impactRows.push(`| ${a.id} | ${p} | hurts | |`);
        }
        fs.writeFileSync(path.join(dir, 'all-property-impacts.md'),
          `| Atom | Property | Direction | Note |\n|------|----------|-----------|------|\n${impactRows.join('\n')}\n`);

        // composite-membership.md
        const compRows = COMPOSITES.map(c => `| ${c.name} | ${c.atoms.join(', ')} |`);
        fs.writeFileSync(path.join(dir, 'composite-membership.md'),
          `| Composite | Atoms |\n|-----------|-------|\n${compRows.join('\n')}\n`);

        console.log('[generate-indexes] wrote _generated/ indexes');
      },
    },
  };
}
```

**Step 2: Register in astro.config.mjs**

```js
import { generateIndexes } from './src/integrations/generate-indexes.ts';

export default defineConfig({
  integrations: [react(), tailwind(), generateIndexes()],
  // ...
});
```

---

## Task 6: Build base layout and shared components

**Files:**
- Create: `src/layouts/Base.astro`
- Create: `src/components/Nav.astro`
- Create: `src/components/AtomPill.astro`
- Create: `src/components/MaturityBadge.astro`
- Create: `src/components/CategoryBadge.astro`

**Step 1: Base layout** — wraps every page with nav, fonts, and base styles.

```astro
---
// src/layouts/Base.astro
interface Props {
  title?: string;
  description?: string;
}
const { title = 'dasmap', description = 'Ethereum DAS design space map' } = Astro.props;
---
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{title === 'dasmap' ? title : `${title} — dasmap`}</title>
  <meta name="description" content={description} />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
</head>
<body class="bg-white text-zinc-900 font-sans antialiased">
  <slot name="nav"><Nav /></slot>
  <main>
    <slot />
  </main>
</body>
</html>

<style is:global>
  :root { --font-mono: 'IBM Plex Mono', monospace; --font-sans: 'IBM Plex Sans', system-ui, sans-serif; }
  body { font-family: var(--font-sans); }
  code, .mono { font-family: var(--font-mono); }
</style>
```

**Step 2: Nav component** — top bar with site title and view tabs.

Tabs: Atoms, Properties, Graph, Matrix, Compare, Timeline
Links to: `/atoms`, `/properties`, `/graph`, `/matrix`, `/compare`, `/timeline`

**Step 3: AtomPill, MaturityBadge, CategoryBadge** — small reusable display components.

AtomPill: colored by category, shows ID + name + maturity dot.
MaturityBadge: colored chip with maturity label.
CategoryBadge: category name in category color.

---

## Task 7: Landing page (`/`)

**Files:**
- Create: `src/pages/index.astro`

Stats bar (4 numbers: atoms, properties, composites, edges).
Architecture layers view: atoms in horizontal bands by layer, each atom is a pill linking to its detail page.
Category legend at bottom.

```astro
---
import { getCollection } from 'astro:content';
import Base from '../layouts/Base.astro';
import { ATOMS } from '../data/atoms.ts';
import { CATEGORIES } from '../data/categories.ts';
import { EDGES } from '../data/edges.ts';
import { COMPOSITES } from '../data/composites.ts';
import { PROPERTIES } from '../data/properties.ts';

const layers = new Map<number, typeof ATOMS>();
for (const atom of ATOMS) {
  const layer = CATEGORIES[atom.cat].layer;
  if (!layers.has(layer)) layers.set(layer, []);
  layers.get(layer)!.push(atom);
}
const sortedLayers = [...layers.entries()].sort(([a], [b]) => a - b);
---
```

---

## Task 8: Atoms index page (`/atoms`)

**Files:**
- Create: `src/pages/atoms/index.astro`

Table: ID, name, category (colored badge), maturity badge, relationship count.
Sortable columns. Filter by category + maturity via URL params.

---

## Task 9: Atom detail page (`/atoms/[id]`)

**Files:**
- Create: `src/pages/atoms/[id].astro`

Dynamic route. Shows:
1. Header with ID (monospace), name, subtitle, category badge, maturity badge.
2. Description (rendered markdown body).
3. Relationships table (rendered with links).
4. Computed reverse edges ("Referenced by").
5. Open questions.
6. References.
7. Used in composites (computed).
8. Same category atoms.

```astro
---
import { getCollection } from 'astro:content';
import Base from '../../layouts/Base.astro';
import { EDGES } from '../../data/edges.ts';
import { COMPOSITES } from '../../data/composites.ts';
import { ATOMS } from '../../data/atoms.ts';

export async function getStaticPaths() {
  const atoms = await getCollection('atoms');
  return atoms.map(entry => ({
    params: { id: entry.data.id.toLowerCase() },
    props: { entry },
  }));
}

const { entry } = Astro.props;
const { Content } = await entry.render();
const atomId = entry.data.id;
// compute reverse edges, composites using this atom, same-category atoms
---
```

---

## Task 10: Properties index and detail pages

**Files:**
- Create: `src/pages/properties/index.astro`
- Create: `src/pages/properties/[id].astro`

Index: cards with ID, name, description excerpt, benefit/hurt counts.
Detail: ID, name, description, evaluation, list of atoms that benefit (green pills), list that hurt (red pills).

---

## Task 11: Composites detail pages

**Files:**
- Create: `src/pages/composites/[id].astro`

Shows: name, maturity, atoms (colored pills), also_requires (gray pills), description, key properties, limitations, references. Merged property profile (which properties are benefited/hurt by which atoms in this composite).

No composites index page is required by spec (composite detail is accessed from compare view).

---

## Task 12: Graph view React island

**Files:**
- Create: `src/pages/graph.astro`
- Create: `src/islands/GraphView.tsx`

The graph page hosts the GraphView React island with `client:load`.

GraphView uses d3-force to layout nodes. Renders SVG.

```tsx
// src/islands/GraphView.tsx
'use client';
import { useState, useMemo, useRef, useEffect } from 'react';
import { ATOMS } from '../data/atoms.ts';
import { EDGES } from '../data/edges.ts';
import { CATEGORIES } from '../data/categories.ts';
import { MATURITY_COLORS } from '../data/maturity.ts';
// d3 force simulation...
```

Features:
- Edge type filter toggles (checkboxes per type)
- Category toggles
- Composite highlight dropdown
- Click node: navigate to `/atoms/{id}`
- Hover: tooltip

Edge colors per spec:
```
requires → #2563eb solid arrow
enables → #059669 solid arrow
benefits from → #059669 dashed arrow
conflicts → #dc2626 dashed arrow
alternative → #d97706 dashed no-arrow
complements → #0d9488 solid no-arrow
resolves → #7c3aed solid arrow
evolves → #0891b2 solid arrow
transforms → #be185d solid arrow
```

---

## Task 13: Matrix view React island

**Files:**
- Create: `src/pages/matrix.astro`
- Create: `src/islands/MatrixView.tsx`

Table: atoms as rows (grouped by category with color bar), properties P1-P15 as columns.
- Column headers rotated 90°, showing property ID + name on hover.
- Green dot = benefits, red dot = hurts.
- Click row → navigate to atom. Click column → navigate to property.
- Sortable by category, maturity, benefit count, hurt count.
- Filterable by category, maturity.

---

## Task 14: Compare view React island

**Files:**
- Create: `src/pages/compare.astro`
- Create: `src/islands/CompareView.tsx`

Table: atoms as rows, composites as columns.
Category-colored dot if atom is in composite.
Click atom → atom detail. Click composite header → composite detail.

---

## Task 15: Decision tree view

**Files:**
- Create: `src/pages/decision.astro`
- Create: `src/islands/DecisionView.tsx`

Static SVG flowchart. Four branches from "What's the binding constraint?":
1. EL blobpool bandwidth → near-term: G4 | medium-term: I1-I4
2. CL overhead at 256+ blobs → A1, D3, E8, E10, B3
3. Supernode dependence → FullDAS core: A2, B2, E3, E4, E5
4. Open frontiers → query unlinkability, RS vs RLNC

Nodes are clickable, linking to atoms or composites.

---

## Task 16: Timeline view

**Files:**
- Create: `src/pages/timeline.astro`

Five columns: Idea (M1), Spec'd (M2), Draft impl (M3), Tested (M4), Shipped (M5).
Atoms as cards with ID, name, category color.
All static Astro (no React island needed).

---

## Task 17: Enrich content files with prose from das-building-blocks-v3.md

The seeder generates stub descriptions from the JSX `desc` field. This task replaces them with full prose from the markdown source document.

**For each atom:** Copy the `**Description.**` section from `das-building-blocks-v3.md` into the corresponding atom file's `## Description` section.

**For each property:** Extract the property description from section 1 of `das-building-blocks-v3.md` and write it into the property file.

**For each composite:** Extract the description from section 3 of `das-building-blocks-v3.md`.

This is content work, not code work. Do one atom/property/composite at a time.

**Atom enrichment order** (by maturity, highest first, to prioritize shipped content):
- M5: A1, A5, B1, C1, E1, E2, E2b, E6, G1, H1, H2 (11 atoms)
- M4: C3, D3, E2, E8, F3, F4, F5 (7 atoms)
- M3: A4, B3, D1, E1b, E8, F1, F3 (7 atoms — some overlap with M4)
- M2: all remaining atoms
- M1: idea-stage atoms last

---

## Task 18: Verify build and fix issues

**Step 1:** `pnpm build`

Check for:
- TypeScript errors (fix immediately)
- Missing content files (add stubs)
- Broken static paths (fix getStaticPaths)
- Missing atom IDs in composites (fix frontmatter)

**Step 2:** `pnpm preview` and manually browse all pages.

Check:
- Landing page shows all 8 layers with atoms
- Atom detail page shows full content including relationships
- Property detail shows benefit/hurt atoms
- Graph view renders and is interactive
- Matrix view renders all 47 rows × 15 columns
- Compare view renders all atoms × composites
- Decision tree renders correctly

**Step 3:** Fix any rendering issues found.

---

## Execution notes

- Tasks 1-6 are pure engineering: scaffold, schema, data extraction, integration.
- Task 3 (seeder) is the highest-leverage task: it generates 70+ files automatically.
- Tasks 7-16 are Astro pages and React islands: build one page at a time.
- Task 17 (prose enrichment) can be parallelized or deferred — the site works without it.
- Task 18 is quality gate: site must build cleanly and render correctly.

The critical path is: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 12 → 13 → 14 → 18.
Tasks 10, 11, 15, 16, 17 are valuable but can be done in any order after the critical path.
