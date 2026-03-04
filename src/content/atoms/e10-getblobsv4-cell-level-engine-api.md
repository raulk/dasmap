---
id: E10
name: "getBlobsV4 (cell-level Engine API)"
category: E
maturity: 2
---

## Description

engine_getBlobsV4 extends the Engine API to cell-level granularity. Accepts an indices_bitarray parameter (uint128) specifying exactly which cell indices to retrieve. Returns per-blob cell arrays with null entries for missing cells, plus corresponding KZG proofs. Introduced alongside engine_blobCustodyUpdatedV1, which lets the CL inform the EL of its current custody column set.

## Relationships

| Target | Type | Note |
|--------|------|------|
| P2 | benefits | |
| P9 | benefits | |
| P12 | benefits | |
| E8 | evolves | Cell-level successor to V3 partial-response semantics |
| E2b | resolves | More completely resolves all-or-nothing at cell granularity |
| G4 | requires | V4 only makes sense when EL holds cells not full blobs |

## Open questions

- How does V4 interact with V3? Are they alternatives or do they coexist?
- The response includes KZG proofs per cell. With 128 cells per blob and 128+ blobs, is proof batching across the Engine API boundary practical?
- 500ms timeout: at high blob counts, is this sufficient?

## References

- EIP-8070: Sparse Blobpool (Oct 2025)
