---
id: B4
name: "Mixed column+cell messaging"
category: B
maturity: 1
---

## Description

Use column-level messages as the primary transport but allow cell-level messages as a secondary path for repair and cross-forwarding. A compromise that manages per-message overhead while retaining cell-level repair benefits.

## Relationships

| Target | Type | Note |
|--------|------|------|
| P10 | benefits | |
| P5 | benefits | |
| B1 | requires | Column-level primary path |
| B2 | requires | Cell-level secondary repair path |

## Open questions

- What triggers the switch from column to cell messaging? Automatic (e.g. after timeout) or always parallel?
- How do you avoid double-counting when the same data arrives via both paths?

## References

- FullDASv2 (cskiraly, May 2025)
