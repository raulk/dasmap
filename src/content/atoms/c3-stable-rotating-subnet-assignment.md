---
id: C3
name: "Stable + rotating subnet assignment"
category: C
maturity: 4
---

## Description

Nodes join k stable column subnets (for density and data retrievability) plus k rotating ones (for sampling freshness). Proposed in SubnetDAS to partially mitigate query linkability.

## Relationships

| Target | Type | Note |
|--------|------|------|
| P8 | benefits | |
| P9 | benefits | |
| P10 | hurts | |
| C1 | requires | Rotates over column subnets |
| H1 | enables | Rotation adds freshness to sampling |

## Open questions

- Rotation period tradeoff: too fast = churn overhead, too slow = predictable targets.
- Even with rotation, the act of joining/leaving subnets (peer grafting) is visible to an adversary.

## References

- EIP-7594
- SubnetDAS (fradamt + Ansgar, Oct 2023)
