---
id: C2
name: "Row subnets"
category: C
maturity: 1
---

## Description

One gossip subnet per row (i.e. per blob position in the block). Used for blob distribution and for cross-seeding recovered cells. In SubnetDAS, only validators join row subnets.

## Relationships

| Target | Type | Note |
|--------|------|------|
| P6 | benefits | |
| P5 | benefits | |
| P10 | hurts | |
| P2 | hurts | |
| E3 | enables | Row subnets are where partial row data accumulates |
| E5 | enables | Cross-seeded cells forwarded via row subnets |

## Open questions

- Row indices correspond to blob positions in a block. Not known until the block is proposed. How do nodes pre-join row subnets?
- At 256 blobs, you need 256 row subnets. Combined with 128 column subnets, that's 384 total subnets. Too many for practical peer management?

## References

- SubnetDAS (fradamt + Ansgar, Oct 2023)
- FullDAS (cskiraly, May 2024)
