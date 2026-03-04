---
id: "blob-streaming"
name: "Blob streaming"
maturity: 1
atoms: ["I1","I2","I3","I4"]
also_requires: ["EIP-7805 (FOCIL)"]
---

## Description

Enshrines AOT (ahead-of-time) blob propagation as a first-class CL mechanism alongside a spot-priced JIT (just-in-time) lane. Users buy tickets to propagate blobs before the critical path. A DA contract records availability on-chain. PTC enforces inclusion of propagated blobs. Capacity governed by B_1 (JIT max), B_2 (total max), R (reserved JIT). EIP-1559-style pricing for AOT tickets.

## Key properties

Throughput scales because AOT uses bandwidth outside the critical path. End-to-end CR for blob txs via PTC + FOCIL + DA contract. Smaller critical path mitigates free option problem. Ticket-based rate-limiting provides DoS resistance.

## Limitations

Maturity 1: no spec, no implementation, depends on unshipped FOCIL. JIT blobs have weaker CR than AOT. R parameter (capacity split) is a fundamental design choice with no proposed adaptive mechanism. Full system is complex: new system contract, auction, committee role, dual payload lists, EIP-1559 controller.

## References

- Scaling the DA layer with blob streaming (QED, fradamt, Julian, Feb 2026)
- EIP-7805: FOCIL
