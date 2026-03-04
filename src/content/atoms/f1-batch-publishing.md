---
id: F1
name: "Batch publishing"
category: F
maturity: 2
---

## Description

Supernode publishes cells to multiple column subnets in parallel batches rather than one-at-a-time. Reduces source-side overhead. cskiraly's measurements show lower latency than standard GossipSub for DAS.

## Relationships

| Target | Type | Note |
|--------|------|------|
| P4 | benefits | |
| P11 | benefits | |

## Open questions

- Optimal batch size and scheduling strategy as a function of network size and blob count?
- Interaction with GossipSub's eager/lazy push mechanisms?

## References

- Improving DAS performance with GossipSub batch publishing (cskiraly, Feb 2025)
