---
id: "peerdas-fusaka"
name: "PeerDAS (Fusaka)"
maturity: 5
atoms: ["A1","A4","A5","B1","C1","C3","C4","D3","E1","E1b","E2","E2b","E6","F3","F4","G1","H1","H2"]
---

## Description

1D RS extension, column-level messaging on column subnets, sender-side cell proofs. Supernodes and semi-supernodes reconstruct with desynchronized timing. getBlobs from EL (V2, all-or-nothing). Distributed blob building via supernodes. Gradual publication. Subnet-based sampling with peer-based req/resp for catch-up.

## Key properties

Ships in Fusaka mainnet. EL bandwidth 4–5x CL at devnet blob counts. Distributed blob building (F3, F4) offloads the proposer. Batch KZG verification (D3) amortizes proof cost.

## Limitations

Supernode dependent for reconstruction. Column-level messaging creates cliff effect with getBlobs. getBlobsV2 all-or-nothing hides partial mempool availability. EL blobpool fully replicates all blobs, consuming 4–5x the CL bandwidth.

## References

- EIP-7594
- Sigma Prime blog: PeerDAS and distributed blob building (Sep 2024)
