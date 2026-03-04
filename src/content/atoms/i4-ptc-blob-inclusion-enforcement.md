---
id: I4
name: "PTC blob inclusion enforcement"
category: I
maturity: 1
---

## Description

PTC (Payload Timeliness Committee) members observe which blobs have been propagated by a deadline, sample them, and vote on availability. A majority vote determines which versioned hashes the proposer must include in the payload. Provides end-to-end censorship resistance for blob txs via PTC (availability recording) + FOCIL (blob tx inclusion). JIT blobs cannot benefit from PTC guarantees.

## Relationships

| Target | Type | Note |
|--------|------|------|
| P13 | benefits | |
| P7 | benefits | |
| P10 | hurts | |
| I2 | requires | PTC-mandated hashes recorded in DA contract |
| I1 | requires | Only ticketed blobs propagate before PTC deadline |

## Open questions

- PTC committee size and selection mechanism are unspecified. Minimum committee size for security?
- The safety override (attesters do not enforce PTC if they locally do not see availability) creates an attack surface.
- JIT blobs have strictly weaker CR than AOT. Acceptable for L1-as-rollup?

## References

- Scaling the DA layer with blob streaming (Feb 2026)
- EIP-7805: FOCIL
