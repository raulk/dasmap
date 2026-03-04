---
id: "fulldas"
name: "FullDAS"
maturity: 2
atoms: ["A1","A2","A5","B2","C1","C2","C4","D1","D2","D3","E3","E4","E5","F1","F2","H1","H3","H4"]
---

## Description

2D RS extension. Cell-level messaging. Row and column subnets. Pipelined dispersal-to-custody and sampling-from-custody phases. Per-row and per-column local reconstruction with cross-forwarding. Batch publishing. PPPT. Bitmap-based signaling. LossyDAS. Local randomness for sampling. Row/column ID-based peer discovery.

## Key properties

Targets supernode-free operation via pipelined repair. Cross-forwarding (E5) creates availability amplification between dimensions. Bitmap signaling (D1, D2) makes cell-level IHAVE/IWANT practical.

## Limitations

Many interdependent components. Cell-level messaging overhead is the primary bottleneck concern. 2D extension adds builder computation.

## References

- FullDAS (cskiraly, May 2024)
