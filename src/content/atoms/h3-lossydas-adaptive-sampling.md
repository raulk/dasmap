---
id: H3
name: "LossyDAS (adaptive sampling)"
category: H
maturity: 2
---

## Description

Tolerate some missed samples and adaptively increase sampling effort. Instead of requiring all k samples to succeed, allow a few failures and adjust the security model accordingly.

## Relationships

| Target | Type | Note |
|--------|------|------|
| P4 | benefits | |
| P13 | benefits | |

## Open questions

- fradamt's analysis shows that tolerating multiple misses requires significantly more total samples. With t tolerated misses, the failure probability blows up. Is the bandwidth tradeoff worth it?

## References

- LossyDAS (cskiraly et al., Mar 2024)
