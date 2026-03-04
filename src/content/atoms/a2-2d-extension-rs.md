---
id: A2
name: "2D extension (RS)"
category: A
maturity: 2
---

## Description

Data is extended both horizontally (row-wise) and vertically (column-wise) using a bivariate polynomial. Creates a full matrix where any individual row or column can be independently repaired from >=50% of its cells. The second dimension must be computed at block construction time (on the critical path), unless combined with EL blob encoding.

## Relationships

| Target | Type | Note |
|--------|------|------|
| P5 | benefits | |
| P6 | benefits | |
| P3 | benefits | |
| P1 | benefits | |
| A1 | requires | First dimension prerequisite |
| B2 | requires | Cell-level messaging needed to fully exploit 2D |
| E3 | enables | Independent row repair from partial cell data |
| E4 | enables | Independent column repair from partial cell data |
| E5 | enables | Cross-forwarding requires two dimensions |

## Open questions

- Vertical extension computation is on the critical path for the builder. How much does A4 (EL blob encoding) offset this?
- What is the concrete latency overhead of computing the second dimension at block time for 128+ blobs?
- Benedikt+Francesco analysis: is 2D worth complexity if 1D with thinner columns achieves similar security?

## References

- FullDAS (cskiraly, May 2024)
- FullDASv2 (cskiraly, May 2025)
- Revisiting secure DAS (Benedikt+Francesco, Jul 2025)
