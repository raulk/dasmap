---
id: D2
name: "Bitmap IHAVE/IWANT"
category: D
maturity: 1
---

## Description

Instead of listing individual cell message IDs, use bitmaps to represent which cells a node has or wants in a given row/column. Compresses signaling overhead dramatically at high cell counts.

## Relationships

| Target | Type | Note |
|--------|------|------|
| P2 | benefits | |
| P1 | benefits | |
| D1 | requires | Bitmaps index over structured coordinates |

## Open questions

- Bitmap size at 256 blobs x 128 columns = 4 KiB. Acceptable overhead?
- Interaction with GossipSub heartbeat interval?

## References

- FullDAS (cskiraly, May 2024)
