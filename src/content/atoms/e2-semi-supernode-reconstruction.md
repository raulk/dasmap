---
id: E2
name: "Semi-supernode reconstruction"
category: E
maturity: 4
---

## Description

Subscribe to exactly enough columns (64 out of 128) to hit the 50% reconstruction threshold. Minimum viable setup for serving the beacon blob API.

## Relationships

| Target | Type | Note |
|--------|------|------|
| P2 | benefits | |
| P5 | benefits | |

## Open questions

- At exactly 50%, any single missing column makes reconstruction fail. How sensitive is this to network conditions?

## References

- Prysm docs (--semi-supernode flag)
- EIP-7594
