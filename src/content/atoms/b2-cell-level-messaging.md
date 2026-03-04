---
id: B2
name: "Cell-level messaging"
category: B
maturity: 2
---

## Description

The unit of P2P gossip is a single cell (the intersection of one row and one column in the data matrix). Any custodying node can send or receive individual cells. Prerequisite for local reconstruction without supernodes.

## Relationships

| Target | Type | Note |
|--------|------|------|
| P5 | benefits | |
| P6 | benefits | |
| P12 | benefits | |
| P3 | benefits | |
| P10 | hurts | |
| A2 | requires | 2D extension needed for full cell-level benefit |
| E3 | enables | Cell granularity needed to collect partial rows |
| E4 | enables | Cell granularity needed for partial column repair |
| E5 | enables | Forwarded cells are individual cells |
| E7 | enables | Cell injection requires cell granularity |

## Open questions

- Per-message overhead is the key concern. At 256 blobs with 128 columns, the matrix has 32,768 cells per slot. Is the per-message processing cost tractable?
- How does cell-level gossip interact with GossipSub's IHAVE/IWANT protocol? Signaling overhead could dominate bandwidth.
- Anti-DOS: how do you validate a single cell before forwarding? You need block header/KZG commitments first.

## References

- FullDAS (cskiraly, May 2024)
- FullDASv2 (cskiraly, May 2025)
- SubnetDAS discussion (fradamt, Oct 2023)
