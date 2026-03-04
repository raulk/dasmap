---
id: E7
name: "getBlobs cell injection"
category: E
maturity: 2
---

## Description

Even if the EL has only one blob, the CL can extract individual cells from that blob and push them into column subnets. Does not require all blobs to be present. Works with partial/sharded mempools.

## Relationships

| Target | Type | Note |
|--------|------|------|
| P12 | benefits | |
| P3 | benefits | |
| P10 | hurts | |
| B2 | requires | Cell injection requires cell granularity messaging |
| E8 | requires | Partial responses enable cell-level injection |

## Open questions

- If a node is not subscribed to a column subnet, should it push the cell or just gossip its availability?
- Does injecting EL-sourced cells into CL gossip create validation issues?

## References

- FullDASv2 (cskiraly, May 2025)
