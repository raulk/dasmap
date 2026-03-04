---
id: C4
name: "Row/column ID-based peer discovery"
category: C
maturity: 2
---

## Description

Nodes advertise their custody rows and columns in their ENR. Peers can be discovered based on shared custody interests, eliminating connection delay when a node needs to find peers for a specific dimension.

## Relationships

| Target | Type | Note |
|--------|------|------|
| P4 | benefits | |
| P7 | benefits | |
| P8 | hurts | |
| E5 | benefits from | Cross-forwarding needs peers in orthogonal subnets quickly |

## Open questions

- ENR size is limited. How many custody IDs can be advertised before hitting practical limits?
- Does advertising custody assignments in ENR worsen query linkability?

## References

- EIP-7594
- FullDAS (cskiraly, May 2024)
