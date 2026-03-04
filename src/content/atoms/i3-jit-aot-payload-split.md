---
id: I3
name: "JIT/AOT payload split"
category: I
maturity: 1
---

## Description

The block payload contains two lists of versioned hashes: jit_versioned_hashes (blobs the builder commits to just-in-time, spot-priced via blob basefee) and aot_versioned_hashes (blobs pre-propagated via tickets, already paid for at ticket purchase). Capacity governed by B_1 (JIT max), B_2 (total max), and R (reserved JIT). AOT pricing uses an EIP-1559-style controller.

## Relationships

| Target | Type | Note |
|--------|------|------|
| P1 | benefits | |
| P4 | benefits | |
| P11 | benefits | |
| P10 | hurts | |

## Open questions

- The R parameter (reserved JIT capacity) is the most sensitive design choice. Too low risks underserving L1 JIT needs; too high forces AOT users through builders.
- JIT blobs correspond to today's private blobs. Does this entrench builder centralization?
- Capacity rollover under sustained overdemand creates complex dynamics with the EIP-1559 controller.

## References

- Scaling the DA layer with blob streaming (Feb 2026)
