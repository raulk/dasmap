---
id: E1b
name: "Desynchronized reconstruction"
category: E
maturity: 3
---

## Description

Supernodes add a random delay before reconstruction to avoid synchronized bandwidth spikes. Once reconstruction yields a column, the node treats it as if it arrived from the network. This is normative spec guidance, not a separate mechanism, but it is a distinct design decision that affects timing and load distribution.

## Relationships

| Target | Type | Note |
|--------|------|------|
| P4 | benefits | |
| P7 | benefits | |
| E1 | requires | Desynchronized delay applies to supernode reconstruction |

## Open questions

- "When to reconstruct" remains an explicit timing and anti-DoS question in the spec notes. Sigma Prime flagged a race condition where reconstruction and proof computation compete for CPU simultaneously.

## References

- Fulu das-core "Reconstruction and cross-seeding" section
