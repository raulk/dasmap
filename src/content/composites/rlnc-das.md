---
id: "rlnc-das"
name: "RLNC-based DAS"
maturity: 2
atoms: ["A3","E9"]
---

## Description

Replaces RS with RLNC coding and Pedersen commitments (instead of KZG). Stronger probabilistic guarantees against withholding. Trades off per-dimension repair and cross-forwarding.

## Key properties

Stronger withholding resistance (P13): any K linearly independent pieces suffice. No targeted withholding possible because combinations are random. No supernode needed in theory.

## Limitations

Loses cross-forwarding (E5). Loses per-dimension local reconstruction (E3, E4). Unclear how P2P redistribution works without dimensional gossip structure.

## References

- Alternative DAS concept based on RLNC (Kolotov et al., Jun 2025)
