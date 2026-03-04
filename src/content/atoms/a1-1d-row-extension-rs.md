---
id: A1
name: "1D row extension (RS)"
category: A
maturity: 5
---

## Description

Each blob is extended horizontally to 2x width using RS coding. The extended blob becomes a row in the data matrix. Columns (vertical slices across all rows) become the sampling unit. The extension can be performed by the blob transaction sender, off the critical path.

## Relationships

| Target | Type | Note |
|--------|------|------|
| P2 | benefits | |
| P4 | benefits | |
| P10 | benefits | |
| P11 | benefits | |
| A4 | enables | Row extension can be moved to the mempool |
| C1 | requires | Columns are the distribution and sampling unit |
| E1 | requires | Supernodes decode rows from collected columns |
| E2 | requires | Semi-supernodes also decode rows from columns |

## Open questions

- With 1D extension only, reconstruction requires collecting >=50% of all columns, which means only supernodes or semi-supernodes can reconstruct. Acceptable long-term?
- At very high blob counts, does the column size (growing linearly) create practical gossip message size issues?

## References

- EIP-4844
- EIP-7594: PeerDAS
