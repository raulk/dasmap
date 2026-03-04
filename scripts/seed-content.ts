#!/usr/bin/env tsx
/**
 * One-time content seeder: generates all markdown files from src/data/*.ts.
 * Run with: pnpm seed
 */

import fs from 'node:fs';
import path from 'node:path';

// We import directly — tsx handles the TS resolution
const { ATOMS } = await import('../src/data/atoms.js');
const { EDGES } = await import('../src/data/edges.js');
const { PROPERTIES } = await import('../src/data/properties.js');
const { COMPOSITES } = await import('../src/data/composites.js');

const CONTENT_DIR = path.join(process.cwd(), 'src', 'content');

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function atomSlug(id: string, name: string): string {
  return `${slugify(id)}-${slugify(name)}`;
}

// ── Atoms ──────────────────────────────────────────────────────────────

const atomDir = path.join(CONTENT_DIR, 'atoms');
fs.mkdirSync(atomDir, { recursive: true });

for (const atom of ATOMS) {
  const filename = `${atomSlug(atom.id, atom.name)}.md`;

  // Outgoing property impacts
  const benefitRows = atom.benefits.map(pid =>
    `| ${pid} | benefits | |`
  );
  const hurtRows = atom.hurts.map(pid =>
    `| ${pid} | hurts | |`
  );

  // Outgoing atom-to-atom edges
  const outgoing = EDGES.filter(e => e.from === atom.id);
  const edgeRows = outgoing.map(e =>
    `| ${e.to} | ${e.type} | ${e.note ?? ''} |`
  );

  const allRows = [...benefitRows, ...hurtRows, ...edgeRows];
  const relTable = allRows.length > 0
    ? `| Target | Type | Note |\n|--------|------|------|\n${allRows.join('\n')}`
    : '_No relationships defined._';

  const openQsText = atom.openQs.length > 0
    ? atom.openQs.map(q => `- ${q}`).join('\n')
    : '_None documented._';

  const refsText = atom.refs.length > 0
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

${openQsText}

## References

${refsText}
`;

  fs.writeFileSync(path.join(atomDir, filename), content);
  console.log(`  atoms/${filename}`);
}

// ── Properties ─────────────────────────────────────────────────────────

const propDir = path.join(CONTENT_DIR, 'properties');
fs.mkdirSync(propDir, { recursive: true });

for (const prop of PROPERTIES) {
  const filename = `${slugify(prop.id)}-${slugify(prop.name)}.md`;

  const content = `---
id: ${prop.id}
name: "${prop.name.replace(/"/g, '\\"')}"
---

## Description

${prop.description}

## Evaluation

_Evaluation criteria to be filled in._
`;

  fs.writeFileSync(path.join(propDir, filename), content);
  console.log(`  properties/${filename}`);
}

// ── Composites ─────────────────────────────────────────────────────────

const compDir = path.join(CONTENT_DIR, 'composites');
fs.mkdirSync(compDir, { recursive: true });

for (const comp of COMPOSITES) {
  const filename = `${comp.id}.md`;

  const atomsYaml = JSON.stringify(comp.atoms);
  const alsoLine = comp.also_requires
    ? `\nalso_requires: ${JSON.stringify(comp.also_requires)}`
    : '';

  const refsText = comp.refs.map(r => `- ${r}`).join('\n');

  const content = `---
id: "${comp.id}"
name: "${comp.name.replace(/"/g, '\\"')}"
maturity: ${comp.maturity}
atoms: ${atomsYaml}${alsoLine}
---

## Description

${comp.desc}

## Key properties

${comp.keyProps}

## Limitations

${comp.limitations}

## References

${refsText}
`;

  fs.writeFileSync(path.join(compDir, filename), content);
  console.log(`  composites/${filename}`);
}

console.log(`\nSeeding complete: ${ATOMS.length} atoms, ${PROPERTIES.length} properties, ${COMPOSITES.length} composites.`);
