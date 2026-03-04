---
id: E8
name: "getBlobsV3 (partial responses)"
category: E
maturity: 4
---

## Description

engine_getBlobsV3 keeps the same request format as V2 but returns an array of equal length where missing blobs are null at those positions. The CL learns which blobs are locally available and can exchange only missing parts with peers.

## Relationships

| Target | Type | Note |
|--------|------|------|
| P12 | benefits | |
| P7 | benefits | |
| P9 | benefits | |
| E2b | resolves | Partial responses fix the all-or-nothing constraint |
| E7 | enables | Partial responses surface which blobs are available |
| B3 | enables | Partial EL data feeds partial-message reconciliation |

## Open questions

- How do CL clients negotiate and opportunistically use V3 without breaking backwards compatibility with V2?
- How quickly do EL clients prune blobs, and does this affect the null patterns in ways that confuse the CL?

## References

- FullDASv2 (cskiraly, May 2025)
- GossipSub partial messages extension (Sep 2025)
- Engine API spec (execution-apis PR #719)
