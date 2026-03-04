---
id: C1
name: "Column subnets"
category: C
maturity: 5
---

## Description

One gossip subnet per column (or per custody group of columns). Nodes subscribe to a deterministic set based on their node ID. Used for data distribution and sampling in all DAS proposals. Custody is expressed in "custody groups" and advertised via ENR (cgc).

## Relationships

| Target | Type | Note |
|--------|------|------|
| P9 | benefits | |
| P10 | benefits | |
| P8 | hurts | |
| H1 | enables | Column subnets are the basis for subnet-based sampling |

## Open questions

- The number of custody groups and their mapping to subnets affects subnet density. Too many subnets + too few nodes per subnet = unreliable gossip.
- Deterministic custody improves coordination but aggravates query-linkability risks.

## References

- EIP-7594
- PeerDAS original post (Sep 2023)
