---
id: E6
name: "getBlobs-assisted column assembly"
category: E
maturity: 5
---

## Description

CL fetches complete blobs (rows) from the EL mempool via the engine API (engine_getBlobsV1/V2). If all blobs are present, full columns can be assembled without waiting for CL gossip. Primary mechanism for PeerDAS dissemination.

## Relationships

| Target | Type | Note |
|--------|------|------|
| P4 | benefits | |
| P11 | benefits | |
| E1 | benefits from | Faster reconstruction when all blobs available via getBlobs |
| F4 | enables | Supernodes fetch blobs from EL to start publishing early |
| G1 | requires | Pre-seeded blobs are what getBlobs retrieves |

## Open questions

- Only useful when EL has all blobs. Degrades with private orderflow and sharded/partial mempools.
- Cliff effect: with column-level messaging, missing even one blob makes getBlobs useless for that column.

## References

- Sigma Prime blog (Sep 2024)
- Is data available in the EL mempool? (cskiraly)
