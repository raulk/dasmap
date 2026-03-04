---
id: E5
name: "Cross-forwarding / cross-seeding"
category: E
maturity: 2
---

## Description

After recovering a cell at position (row_i, col_j) via row repair, the node pushes that cell to col_j's subnet (and vice versa). Creates an availability amplification feedback loop between dimensions.

## Relationships

| Target | Type | Note |
|--------|------|------|
| P6 | benefits | |
| P3 | benefits | |
| P1 | benefits | |
| P10 | hurts | |
| E3 | requires | Must recover cells before forwarding |
| E4 | requires | Must recover cells before forwarding |

## Open questions

- How fast does the cross-forwarding feedback loop converge? Is there a risk of oscillation or flooding?
- RLNC (A3) breaks cross-forwarding because coded pieces from one dimension do not help the other. Dealbreaker for RLNC adoption?

## References

- FullDAS (cskiraly, May 2024)
- SubnetDAS discussion (fradamt, Oct 2023)
