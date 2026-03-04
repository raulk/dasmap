---
id: I1
name: "Blob tickets (CL propagation rights)"
category: I
maturity: 1
---

## Description

A ticket system grants the right to propagate a blob through the CL sampling infrastructure. Tickets are acquired by interacting with an on-chain ticket contract. Each ticket grants: (a) propagate one blob on the CL, and (b) propagate multiple blob txs (up to 16) on the EL mempool. The ticket purchase is where the scarce bandwidth resource is paid for. Tickets can be purchased for future slots (forward tickets), creating a futures market for blob space.

## Relationships

| Target | Type | Note |
|--------|------|------|
| P4 | benefits | |
| P2 | benefits | |
| P7 | benefits | |
| P12 | benefits | |
| P10 | hurts | |
| I2 | enables | Tickets create the propagation flow; DA contract records it |
| I3 | enables | Tickets enable the AOT lane in the dual-payload split |
| G4 | alternative | Both address EL blobpool bandwidth via different strategies |
| G1 | alternative | CL-side ticket propagation vs EL blobpool pre-seeding |

## Open questions

- Forward ticket purchasing (slot N+k) creates a futures market for blob space with potential for speculation and hoarding.
- How does the ticket market interact with MEV? Builders can front-run demand or buy tickets to control propagation priority.
- Tying blob tx propagation to tickets loosens mempool rules. New spam vectors?

## References

- Scaling the DA layer with blob streaming (QED, fradamt, Julian, Feb 2026)
- Blob mempool tickets
- On the future of the blob mempool
- Variants of mempool tickets
