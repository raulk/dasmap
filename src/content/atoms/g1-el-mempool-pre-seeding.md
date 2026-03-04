---
id: G1
name: "EL mempool pre-seeding"
category: G
maturity: 5
---

## Description

Blobs arrive at the EL via devp2p announce/fetch gossip before the block is proposed. This is "free" bandwidth from the builder's perspective. The CL can then use getBlobs to leverage this pre-existing data. This is how blob transactions work on mainnet today.

## Relationships

| Target | Type | Note |
|--------|------|------|
| P11 | benefits | |
| P4 | benefits | |
| E6 | enables | Pre-seeded blobs are what getBlobs retrieves |
| E7 | enables | Partial pre-seeding helps with cell injection |

## Open questions

- ~11 KiB/s per blob per node. At 128 blobs, that's ~1.4 MiB/s. Sustainable for home stakers?
- Private blobs bypass the public mempool entirely. As private blob share increases, pre-seeding effectiveness decreases.

## References

- Is data available in the EL mempool? (cskiraly)
- EIP-4844
- Sigma Prime blog
