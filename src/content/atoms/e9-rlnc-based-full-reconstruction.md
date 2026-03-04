---
id: E9
name: "RLNC-based full reconstruction"
category: E
maturity: 2
---

## Description

Collect K linearly independent coded pieces from anywhere in the matrix. Decode all at once. No per-row/per-column partial repair.

## Relationships

| Target | Type | Note |
|--------|------|------|
| P13 | benefits | |
| P3 | benefits | |
| P5 | hurts | |
| P6 | hurts | |
| A3 | requires | RLNC-based reconstruction requires RLNC coding |
| E5 | conflicts | No dimensional structure to cross-forward between |

## Open questions

- "Any K pieces" sounds good in theory, but how does a node accumulate K pieces without per-dimension gossip structure? May degenerate into a client-server model.

## References

- Alternative DAS concept based on RLNC (Kolotov et al., Jun 2025)
