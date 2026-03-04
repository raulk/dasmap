---
id: D1
name: "Structured message IDs"
category: D
maturity: 1
---

## Description

Derive GossipSub message IDs from (row, column) coordinates rather than hashing the full payload. Reduces message ID size and computation in IHAVE/IWANT exchanges.

## Relationships

| Target | Type | Note |
|--------|------|------|
| P2 | benefits | |
| P4 | benefits | |
| D2 | enables | Structured IDs enable bitmap compression |

## Open questions

- Requires GossipSub-level changes. Adoption path?

## References

- FullDAS (cskiraly, May 2024)
