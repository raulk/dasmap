---
id: E2b
name: "getBlobsV2 all-or-nothing semantics"
category: E
maturity: 5
---

## Description

The Osaka Engine API defines engine_getBlobsV2 as returning null if any requested blob is missing or unavailable. Partial availability is not surfaced. This is a named constraint rather than a feature — it directly limits the utility of other reconstruction approaches and is the primary motivation for getBlobsV3.

## Relationships

| Target | Type | Note |
|--------|------|------|
| P10 | benefits | |
| P12 | hurts | |
| P7 | hurts | |

## Open questions

- This is directly identified as an inefficiency: "if the EL misses just one blob, the column can't be created, and getBlobs is rendered useless." The primary motivation for getBlobsV3 (E8).

## References

- FullDASv2 (cskiraly, May 2025)
- Engine API spec
