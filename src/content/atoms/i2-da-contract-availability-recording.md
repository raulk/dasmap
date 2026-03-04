---
id: I2
name: "DA contract (availability recording)"
category: I
maturity: 1
---

## Description

A system contract that records which blobs are available, queryable both within the EVM and by nodes. At the start of each block, a system call records the versioned hashes into the contract. Implemented as a ring buffer over a recent window (~128 blocks). Beyond the window, users prove inclusion against a versioned_hashes_root in the block header. Once recorded, a blob tx referencing those versioned hashes becomes equivalent to a regular transaction for mempool and inclusion purposes.

## Relationships

| Target | Type | Note |
|--------|------|------|
| P7 | benefits | |
| P12 | benefits | |
| P9 | benefits | |
| P10 | hurts | |
| I4 | enables | PTC-mandated versioned hashes are recorded in DA contract |
| I3 | enables | AOT versioned hashes reference recorded availability |
| I1 | requires | DA contract records availability of blobs propagated via tickets |

## Open questions

- Storage growth: the system call writing 128 versioned hashes per block has a gas cost. Acceptable overhead?
- Reorg handling: if block N records availability but is reorged out, blob txs in block N+1 relying on that recording fail. Not addressed.
- The 128-block window covers typical rollup needs, but some L2 challenge periods are longer.
- Since the DA contract is queryable within the EVM, regular txs can condition logic on blob availability. New use cases and attack surfaces?

## References

- Scaling the DA layer with blob streaming (Feb 2026)
