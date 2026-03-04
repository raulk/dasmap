---
id: G4
name: "Sparse blobpool (EIP-8070)"
category: G
maturity: 2
---

## Description

Introduces custody-aligned probabilistic sampling at the EL blobpool layer, replacing full replication of blob data. For each new type 3 (blob-carrying) transaction, a node fetches the full blob payload with probability p=0.15 ("provider role") and otherwise samples only its CL-aligned custody columns ("sampler role"). Samplers fetch as few as 8/128 cells per blob, yielding an average bandwidth reduction of ~4x. Introduces devp2p eth/71 with cell_mask signaling, GetCells/Cells messages, and Engine API extensions (blobCustodyUpdatedV1, getBlobsV4).

## Relationships

| Target | Type | Note |
|--------|------|------|
| P2 | benefits | |
| P4 | benefits | |
| P9 | benefits | |
| P10 | benefits | |
| P14 | benefits | |
| A5 | requires | Sender-side proofs enable per-cell EL validation |
| E10 | enables | Cell-level Engine API for sparse blobpool |
| G1 | transforms | Pre-seeding becomes cell-level rather than full-blob |

## Open questions

- cell_mask in NewPooledTransactionHashes applies uniformly to all type 3 txs in the message. Practical at high tx rates?
- Provider/sampler decision predictability: attack surface if adversary can predict decisions?
- Supernode fingerprinting via larger peerset and request patterns?
- Builder inclusion policies for sampled-only blobs: failure rate under adversarial conditions?
- RBF impact: does replacement inherit the provider/sampler decision?

## References

- EIP-8070: Sparse Blobpool (Oct 2025)
- EthMagicians discussion (eip-8070)
