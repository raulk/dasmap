---
id: E1
name: "Supernode full-matrix reconstruction"
category: E
maturity: 5
---

## Description

A node subscribes to all 128 column subnets, collects all columns, and can reconstruct any missing rows via RS decoding. Spec-defined behavior includes cross-seeding reconstructed columns back to the network.

## Relationships

| Target | Type | Note |
|--------|------|------|
| P5 | benefits | |
| P7 | benefits | |
| P3 | hurts | |
| F3 | enables | Only supernodes publish all columns |
| F4 | enables | Supernodes do the heavy lifting in distributed building |

## Open questions

- Supernode count on mainnet is uncertain. If too few supernodes exist, the network becomes dependent on a small set of well-resourced nodes.
- Sigma Prime's tests showed supernodes consume significantly higher CL bandwidth. Minimum viable supernode count?

## References

- Sigma Prime blog: PeerDAS and distributed blob building (Sep 2024)
- EIP-7594
