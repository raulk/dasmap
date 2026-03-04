---
id: B3
name: "GossipSub partial messages"
category: B
maturity: 3
---

## Description

A backwards-compatible GossipSub upgrade that allows nodes to disseminate partial messages (cells) within existing column topics, without requiring a hard fork or new topic structure. Uses a group ID (block root) and bitmap (indexing cells) so peers can advertise and request just the missing pieces. A devnet PoC reportedly reduced data sent for data columns by ~10x in a two-peer experiment.

## Relationships

| Target | Type | Note |
|--------|------|------|
| P14 | benefits | |
| P3 | benefits | |
| P12 | benefits | |
| P9 | benefits | |
| B2 | enables | Backwards-compatible path to cell-level messaging |
| E8 | benefits from | Partial EL data feeds into partial-message reconciliation |

## Open questions

- How do non-upgraded nodes handle partial messages they receive?
- Scaling to real meshes with realistic RTTs, tuning eager-push probabilities, and integrating with IDONTWANT/mesh behaviour are still open engineering problems.
- Does the extension compose cleanly with PPPT (F2) and batch publishing (F1)?

## References

- GossipSub partial messages extension (MarcoPolo, Sep 2025)
