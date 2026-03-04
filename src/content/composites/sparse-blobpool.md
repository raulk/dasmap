---
id: "sparse-blobpool"
name: "Sparse blobpool (EIP-8070)"
maturity: 2
atoms: ["G4","E10","A5","G1"]
also_requires: ["EIP-7594","EIP-7870"]
---

## Description

Replaces full replication in the EL blobpool with probabilistic custody-aligned sampling. Nodes fetch full blob payloads with p=0.15 and sample custody-aligned cells otherwise. Introduces devp2p eth/71 with cell_mask signaling, GetCells/Cells messages, and Engine API extensions (blobCustodyUpdatedV1, getBlobsV4). Designed to be deployable without consensus changes.

## Key properties

~4x EL bandwidth reduction. Preserves getBlobs utility via custody alignment. No nonce-gap problem (unlike G2). Backwards-compatible devp2p rollout. No consensus changes required.

## Limitations

Provider backbone is probabilistic (0.03% total unavailability). Builder inclusion policies for sampled-only blobs not battle-tested. 4x reduction may be insufficient at very high blob counts. Supernode behavior at the EL layer underspecified.

## References

- EIP-8070: Sparse Blobpool (Oct 2025)
- EthMagicians discussion
