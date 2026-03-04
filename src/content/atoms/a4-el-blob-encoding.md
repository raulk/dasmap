---
id: A4
name: "EL blob encoding"
category: A
maturity: 3
---

## Description

Row-wise RS erasure coding is performed when the blob transaction is submitted to the mempool, rather than at block construction time. Blobs arrive at nodes already extended. Reduces computation for the builder and for nodes using getBlobs.

## Relationships

| Target | Type | Note |
|--------|------|------|
| P4 | benefits | |
| P11 | benefits | |
| P15 | benefits | |
| G3 | enables | EC-aware mempool requires pre-encoded blobs |
| E7 | enables | Pre-encoded blobs allow cell-level injection |

## Open questions

- Who bears the cost of KZG proof computation for the extended cells? The blob tx sender? This adds cost to L2 sequencers.
- Does pre-encoding in the mempool change the DOS surface for the EL gossip layer?

## References

- FullDASv2 (cskiraly, May 2025)
- EIP-7594
