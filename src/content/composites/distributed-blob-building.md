---
id: "distributed-blob-building"
name: "Distributed blob building"
maturity: 4
atoms: ["E1","E6","F3","F4","F5"]
---

## Description

An optimization within PeerDAS where supernodes fetch blobs from the EL, compute proofs, and publish columns, relieving the block proposer. Includes gradual publication to reduce duplicate bandwidth. Block header-first propagation lets supernodes start earlier.

## Key properties

Implemented in Lighthouse; tested on devnets. Proposer does not need to compute proofs or publish all columns. Gradual publication (F3) reduces supernode outbound bandwidth significantly.

## Limitations

Race condition between reconstruction and proof computation (competing for CPU). Supernode count needed for reliability is uncertain. Still depends on supernodes.

## References

- Sigma Prime blog: PeerDAS and distributed blob building (Sep 2024)
