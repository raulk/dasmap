---
id: A3
name: "RLNC (Random Linear Network Coding)"
category: A
maturity: 1
---

## Description

Replace fixed RS cells with random linear combinations of the data. Any K linearly independent combinations suffice to decode the full data. Sub-variants: A3a I-RLC (interactive), A3b NI-RLC (non-interactive), A3c R-RLC (restricted), A3d column-restricted RLC.

## Relationships

| Target | Type | Note |
|--------|------|------|
| P3 | benefits | |
| P13 | benefits | |
| P7 | benefits | |
| P5 | hurts | |
| P6 | hurts | |
| P10 | hurts | |
| E3 | conflicts | RLNC loses per-row repair structure |
| E4 | conflicts | RLNC loses per-column repair structure |
| E5 | conflicts | Coded pieces from one dimension do not help the other |
| E9 | enables | RLNC-based full reconstruction |

## Open questions

- How to make RLNC verifiable without per-combination KZG proofs?
- Gameable by adversary controlling coefficient selection?
- Compatible with pipelined dissemination?
- Design no. 3 (individualized samples without P2P redistribution) effectively creates a client-server model. Is there a viable design that preserves P2P redistribution while getting RLNC's probabilistic benefits?

## References

- Alternative DAS concept based on RLNC (Kolotov et al., Jun 2025)
- FullDASv2 (cskiraly, May 2025)
