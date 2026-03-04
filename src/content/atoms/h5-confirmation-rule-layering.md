---
id: H5
name: "Confirmation rule layering"
category: H
maturity: 2
---

## Description

Use subnet-based DAS for fork choice (weaker but liveness-safe) and peer-based DAS only for transaction confirmation (stronger but liveness-sensitive). A liveness failure of the peer sampling layer does not affect consensus.

## Relationships

| Target | Type | Note |
|--------|------|------|
| P7 | benefits | |
| P8 | benefits | |
| P10 | hurts | |
| H1 | requires | Subnet-based sampling for fork choice |
| H2 | requires | Peer-based sampling for confirmation |

## Open questions

- What is the latency overhead of the confirmation rule?
- Can the confirmation rule be optional per-node? fradamt suggests yes.

## References

- SubnetDAS (Oct 2023)
- DAS fork-choice (fradamt et al., May 2024)
