---
id: G2
name: "Sharded blob mempool"
category: G
maturity: 1
---

## Description

EL nodes subscribe to a subset of mempool shards rather than the full blob pool. Reduces per-node EL bandwidth at the cost of no single node having all blobs.

## Relationships

| Target | Type | Note |
|--------|------|------|
| P2 | benefits | |
| P1 | benefits | |
| P10 | hurts | |
| P14 | hurts | |
| E7 | requires | Cell injection is the only way to use partial mempool data |
| B2 | requires | Column-level messaging cannot use partial mempool data |
| G4 | alternative | Both reduce EL blobpool bandwidth; G4 simpler, no nonce gaps |

## Open questions

- Nonce gaps: EIP-8077 proposes adding sender address and nonce to tx announcements. Simulation results show up to ~36% of blob txs affected in worst-case.
- Block builders need access to blobs across all shards. Does this recreate the supernode problem at the EL layer?

## References

- A new design for DAS and sharded blob mempools (Jun 2025)
- EIP-8077 nonce gap simulation (Dec 2025)
