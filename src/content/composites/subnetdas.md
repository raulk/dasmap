---
id: "subnetdas"
name: "SubnetDAS"
maturity: 2
atoms: ["A1","B1","C1","C2","C3","E3","E5","H1","H5"]
---

## Description

1D RS extension. Column subnets for sampling. Row subnets for blob distribution (validators only). Stable + rotating subnet assignment. Local reconstruction in row subnets with cross-seeding. Confirmation rule layering proposed as optional enhancement. Explicit security analysis bounding foolable nodes at 5–10%.

## Key properties

Security analysis bounds the fraction of foolable nodes at 5–10% for 2000–10000 nodes. Stable + rotating subnets (C3) partially mitigate query linkability. Confirmation rule layering (H5) separates fork-choice safety from confirmation safety.

## Limitations

Linkable queries (accepted as tradeoff). Row subnets are only for validators. 1D extension limits per-row reconstruction utility.

## References

- SubnetDAS (fradamt + Ansgar, Oct 2023)
