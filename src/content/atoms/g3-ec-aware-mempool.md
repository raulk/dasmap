---
id: G3
name: "EC-aware mempool"
category: G
maturity: 1
---

## Description

The mempool natively understands erasure coding, enabling EC-based sampling and reconstruction at the EL layer itself. Blurs the EL/CL boundary for data availability. Briefly mentioned in FullDASv2 as a future possibility.

## Relationships

| Target | Type | Note |
|--------|------|------|
| P12 | benefits | |
| P1 | benefits | |
| P10 | hurts | |
| A4 | requires | EC-aware mempool requires pre-encoded blobs |
| G2 | enables | Sharded mempool benefits from EC awareness |

## Open questions

- Radical change to the EL. What are the implications for EL/CL separation?
- Does this require consensus changes or can it be purely at the networking layer?

## References

- FullDASv2 (cskiraly, May 2025)
