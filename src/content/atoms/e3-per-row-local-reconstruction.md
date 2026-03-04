---
id: E3
name: "Per-row local reconstruction"
category: E
maturity: 2
---

## Description

A node with >50% of cells in a single row decodes the missing cells using RS. Does not require global data. Any custodying node can do it.

## Relationships

| Target | Type | Note |
|--------|------|------|
| P3 | benefits | |
| P7 | benefits | |
| P5 | benefits | |
| E5 | enables | Recovered row cells feed column subnets |

## Open questions

- With 1D extension only, per-row local reconstruction is effectively supernode-level. Practically requires 2D extension.
- With cell-level messaging and many nodes contributing cells, can enough accumulate in row subnets for reconstruction even with 1D?

## References

- FullDAS (cskiraly, May 2024)
- SubnetDAS discussion (fradamt, Oct 2023)
