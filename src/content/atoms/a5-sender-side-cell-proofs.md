---
id: A5
name: "Sender-side cell proofs"
category: A
maturity: 5
---

## Description

Blob transaction senders compute cell-level KZG proofs and include them in the EIP-4844 transaction wrapper. Nodes validate that commitments match versioned hashes and verify that cell proofs match the blob's cells (including extension cells). Batch verification (via verify_cell_kzg_proof_batch) is explicitly specified.

## Relationships

| Target | Type | Note |
|--------|------|------|
| P15 | benefits | |
| P4 | benefits | |
| G4 | enables | Sender-side proofs enable per-cell EL validation |
| B2 | benefits from | Cell-level messaging benefits from pre-proven cells |

## Open questions

- Pushing DAS cryptography into EL and mempool rules tightens coupling between the two layers. Alternative paths may be needed if the proof format evolves.
- What is the practical batch size before diminishing returns? How does batch verification interact with streaming cell arrival?

## References

- EIP-7594
- A universal verification equation for DAS (Kadianakis, Dietrichs, Feist, Aug 2022)
