---
id: H2
name: "Peer-based sampling (req/resp)"
category: H
maturity: 3
---

## Description

Request specific cells from random peers via req/resp protocol, not via subnet membership. Partially mitigates query linkability because queries go to individual peers rather than being broadcast via subnet joins.

## Relationships

| Target | Type | Note |
|--------|------|------|
| P8 | benefits | |
| P13 | benefits | |
| P10 | hurts | |
| H5 | enables | Peer-based sampling used for confirmation rule |

## Open questions

- If used as the primary sampling mechanism, it creates liveness concerns. SubnetDAS analysis suggests using peer sampling only for the confirmation rule, not fork choice.

## References

- EIP-7594
- PeerDAS original post (Sep 2023)
