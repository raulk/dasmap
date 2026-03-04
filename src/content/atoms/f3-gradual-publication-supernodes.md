---
id: F3
name: "Gradual publication (supernodes)"
category: F
maturity: 4
---

## Description

After reconstruction, supernodes shuffle their columns into N chunks and publish chunk by chunk with a delay between them (e.g. 200ms between 4 chunks). Later chunks are often already propagated by other supernodes, avoiding duplicate bandwidth.

## Relationships

| Target | Type | Note |
|--------|------|------|
| P2 | benefits | |
| P4 | benefits | |
| E1 | requires | Only supernodes publish all columns |

## Open questions

- Interaction with attestation deadlines?
- Optimal publication schedule?

## References

- Sigma Prime blog (Sep 2024)
