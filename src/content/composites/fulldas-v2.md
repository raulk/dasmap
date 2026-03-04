---
id: "fulldas-v2"
name: "FullDASv2"
maturity: 2
atoms: ["A1","A2","A4","A5","B2","B4","C1","C2","D1","D2","D3","E3","E4","E5","E7","E8","F1","F2","G2","G3"]
---

## Description

Extends FullDAS with getBlobs integration (including cell injection from partial mempools), EL blob encoding, proposed getBlobsV3 streaming interface. Analyzes RLNC as an alternative/complement to RS. Discusses EC-aware mempools as a future direction.

## Key properties

getBlobs cell injection (E7) solves the cliff effect. EL blob encoding (A4) offloads builder computation. getBlobsV3 (E8) surfaces partial mempool availability. RLNC analysis maps the full design space of coding alternatives.

## Limitations

Most complex composite: many atoms at maturity 1–2. RLNC verifiability unresolved. Sharded mempool (G2) nonce-gap problem requires EIP-8077.

## References

- FullDASv2 (cskiraly, May 2025)
