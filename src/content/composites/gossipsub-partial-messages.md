---
id: "gossipsub-partial-messages"
name: "GossipSub partial messages"
maturity: 3
atoms: ["B3","D1","D2"]
---

## Description

A GossipSub-level extension allowing cell-level dissemination within existing column topics without a hard fork. Draft libp2p spec, draft consensus-spec PR, and devnet PoC. A devnet PoC reportedly reduced data sent for data columns by ~10x in a two-peer experiment.

## Key properties

Backwards-compatible incremental upgrade (B3). Bitmap addressing (D1, D2) enables efficient partial reconciliation. Works within existing column topic structure.

## Limitations

Incremental: does not address EL bottleneck or 2D extension. Backwards compatibility with non-upgraded peers is an open question. Real-mesh performance (vs two-peer PoC) is unvalidated.

## References

- GossipSub partial messages extension (MarcoPolo, Sep 2025)
