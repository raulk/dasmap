---
id: F2
name: "Push-pull phase transition (PPPT)"
category: F
maturity: 2
---

## Description

Start with push-based gossip for initial speed, then transition to pull-based (IHAVE/IWANT) once enough data is in the network. Reduces duplicate bandwidth by 2x or more without significantly increasing latency.

## Relationships

| Target | Type | Note |
|--------|------|------|
| P2 | benefits | |
| P1 | benefits | |

## Open questions

- When to trigger the phase transition? Too early = slow propagation; too late = wasted duplicates.
- How does this interact with heterogeneous node bandwidth?

## References

- PPPT (cskiraly, Apr 2025)
- Doubling the blob count with GossipSub v2.0
