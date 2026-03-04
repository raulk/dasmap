---
id: F4
name: "Distributed blob building"
category: F
maturity: 4
---

## Description

Multiple supernodes retrieve blobs from the EL, compute KZG cell proofs, and publish data columns, distributing the proposer's computation and bandwidth burden.

## Relationships

| Target | Type | Note |
|--------|------|------|
| P11 | benefits | |
| P3 | benefits | |
| P7 | benefits | |
| P10 | hurts | |
| E1 | requires | Supernodes do the heavy lifting |
| E6 | requires | Supernodes fetch blobs from EL |
| F5 | benefits from | Earlier header arrival means earlier supernode action |

## Open questions

- Race condition: reconstruction and proof computation can happen simultaneously, competing for CPU.
- How many supernodes are needed for this to work reliably?

## References

- Sigma Prime blog: PeerDAS and distributed blob building (Sep 2024)
