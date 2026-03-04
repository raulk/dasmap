---
id: F5
name: "Block header-first propagation"
category: F
maturity: 2
---

## Description

Gossip block headers (with KZG commitments) on a separate fast topic before the full block. Lets supernodes and other nodes start proof computation, blob fetching, and cell validation earlier.

## Relationships

| Target | Type | Note |
|--------|------|------|
| P4 | benefits | |
| P11 | benefits | |
| F4 | enables | Earlier header enables earlier supernode action |
| D3 | enables | Nodes prepare verification contexts from commitments |

## Open questions

- New gossip topic means new infrastructure. Worth the complexity?
- How do you prevent header-only spam (headers without corresponding data)?

## References

- Sigma Prime blog (Sep 2024) referencing Dankrad's proposal
