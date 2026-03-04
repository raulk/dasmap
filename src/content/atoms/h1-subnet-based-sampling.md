---
id: H1
name: "Subnet-based sampling"
category: H
maturity: 5
---

## Description

Nodes get their samples by subscribing to column subnets. Sample = column. Queries are linkable (subnet membership is visible). Primary sampling mechanism in PeerDAS.

## Relationships

| Target | Type | Note |
|--------|------|------|
| P10 | benefits | |
| P2 | benefits | |
| P8 | hurts | |
| C1 | requires | Column subnets are the basis for subnet-based sampling |

## Open questions

- Linkability: an adversary can observe which subnets a node joins and selectively withhold data for only those subnets, convincing that node of availability while withholding the rest.
- SubnetDAS security analysis bounds the fraction of foolable nodes at 5-10% for 2000-10000 nodes.

## References

- EIP-7594
- SubnetDAS (Oct 2023)
