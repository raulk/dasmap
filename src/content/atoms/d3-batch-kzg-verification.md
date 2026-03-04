---
id: D3
name: "Batch KZG verification"
category: D
maturity: 4
---

## Description

Verify multiple KZG cell proofs at once using amortized verification equations, rather than checking each cell proof independently. See also A5 (sender-side proofs), which ensures the proofs are available to verify.

## Relationships

| Target | Type | Note |
|--------|------|------|
| P4 | benefits | |
| P1 | benefits | |
| P15 | benefits | |
| A5 | benefits from | Pre-proven cells are available to batch-verify |

## Open questions

- What is the practical batch size before diminishing returns? How does this interact with streaming cell arrival?

## References

- A universal verification equation for DAS (Kadianakis, Dietrichs, Feist, Aug 2022)
- EIP-7594
