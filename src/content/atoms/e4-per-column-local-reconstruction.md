---
id: E4
name: "Per-column local reconstruction"
category: E
maturity: 2
---

## Description

Same as E3 but along the column dimension. A node with >50% of cells in a single column decodes the rest.

## Relationships

| Target | Type | Note |
|--------|------|------|
| P3 | benefits | |
| P5 | benefits | |
| P7 | benefits | |
| E5 | enables | Recovered column cells feed row subnets |

## Open questions

- Column reconstruction is useful for repair but does not help nodes that need data from other columns.

## References

- FullDAS (cskiraly, May 2024)
