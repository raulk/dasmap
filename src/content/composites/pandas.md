---
id: "pandas"
name: "PANDAS"
maturity: 2
atoms: ["A1","A2","B2","E3","E4","E5"]
---

## Description

A network-layer protocol targeting 32 MiB blobs and beyond. Assumes PBS for initial seeding. Uses 2D encoding with cell-level messaging and focuses on per-row/per-column reconstruction with cross-forwarding. Network-coded DAS extension of PeerDAS with adaptive sampling.

## Key properties

2D extension enables per-dimension repair without supernode dependence. Cross-forwarding (E5) creates the pipelined repair loop. Designed for very high blob counts (32 MiB+).

## Limitations

RLNC verifiability unresolved in some variants. Adaptive sampling interaction with attestation deadlines. DHT-based peer management adds complexity.

## References

- PANDAS (Ascigil et al., Sep 2024)
