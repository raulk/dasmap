---
id: B1
name: "Column-level messaging"
category: B
maturity: 5
---

## Description

The unit of P2P gossip is an entire column (a vertical slice across all blobs in a block). Each column message contains one cell per blob. Used in current PeerDAS.

## Relationships

| Target | Type | Note |
|--------|------|------|
| P10 | benefits | |
| P14 | benefits | |
| P5 | hurts | |
| P12 | hurts | |
| C1 | requires | Columns are gossiped on column subnets |

## Open questions

- Column size grows linearly with blob count. At 128 blobs, a single column message is ~64 KiB. At 256 blobs, ~128 KiB. Practical GossipSub message size limits?
- With column-level messages, if a node's EL is missing even one blob, it cannot assemble a full column from getBlobs. Cliff effect at scale.

## References

- EIP-7594
- PeerDAS documentation (fradamt + b-wagn, Aug 2024)
