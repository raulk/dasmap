export interface Composite {
  id: string;
  name: string;
  maturity: number;
  atoms: string[];
  also_requires?: string[];
  desc: string;
  keyProps: string;
  limitations: string;
  refs: string[];
}

export const COMPOSITES: Composite[] = [
  {
    id: 'peerdas-fusaka',
    name: 'PeerDAS (Fusaka)',
    maturity: 5,
    atoms: ['A1', 'A4', 'A5', 'B1', 'C1', 'C3', 'C4', 'D3', 'E1', 'E1b', 'E2', 'E2b', 'E6', 'F3', 'F4', 'G1', 'H1', 'H2'],
    desc: '1D RS extension, column-level messaging on column subnets, sender-side cell proofs. Supernodes and semi-supernodes reconstruct with desynchronized timing. getBlobs from EL (V2, all-or-nothing). Distributed blob building via supernodes. Gradual publication. Subnet-based sampling with peer-based req/resp for catch-up.',
    keyProps: 'Ships in Fusaka mainnet. EL bandwidth 4–5x CL at devnet blob counts. Distributed blob building (F3, F4) offloads the proposer. Batch KZG verification (D3) amortizes proof cost.',
    limitations: 'Supernode dependent for reconstruction. Column-level messaging creates cliff effect with getBlobs. getBlobsV2 all-or-nothing hides partial mempool availability. EL blobpool fully replicates all blobs, consuming 4–5x the CL bandwidth.',
    refs: ['EIP-7594', 'Sigma Prime blog: PeerDAS and distributed blob building (Sep 2024)'],
  },
  {
    id: 'subnetdas',
    name: 'SubnetDAS',
    maturity: 2,
    atoms: ['A1', 'B1', 'C1', 'C2', 'C3', 'E3', 'E5', 'H1', 'H5'],
    desc: '1D RS extension. Column subnets for sampling. Row subnets for blob distribution (validators only). Stable + rotating subnet assignment. Local reconstruction in row subnets with cross-seeding. Confirmation rule layering proposed as optional enhancement. Explicit security analysis bounding foolable nodes at 5–10%.',
    keyProps: 'Security analysis bounds the fraction of foolable nodes at 5–10% for 2000–10000 nodes. Stable + rotating subnets (C3) partially mitigate query linkability. Confirmation rule layering (H5) separates fork-choice safety from confirmation safety.',
    limitations: 'Linkable queries (accepted as tradeoff). Row subnets are only for validators. 1D extension limits per-row reconstruction utility.',
    refs: ['SubnetDAS (fradamt + Ansgar, Oct 2023)'],
  },
  {
    id: 'fulldas',
    name: 'FullDAS',
    maturity: 2,
    atoms: ['A1', 'A2', 'A5', 'B2', 'C1', 'C2', 'C4', 'D1', 'D2', 'D3', 'E3', 'E4', 'E5', 'F1', 'F2', 'H1', 'H3', 'H4'],
    desc: '2D RS extension. Cell-level messaging. Row and column subnets. Pipelined dispersal-to-custody and sampling-from-custody phases. Per-row and per-column local reconstruction with cross-forwarding. Batch publishing. PPPT. Bitmap-based signaling. LossyDAS. Local randomness for sampling. Row/column ID-based peer discovery.',
    keyProps: 'Targets supernode-free operation via pipelined repair. Cross-forwarding (E5) creates availability amplification between dimensions. Bitmap signaling (D1, D2) makes cell-level IHAVE/IWANT practical.',
    limitations: 'Many interdependent components. Cell-level messaging overhead is the primary bottleneck concern. 2D extension adds builder computation.',
    refs: ['FullDAS (cskiraly, May 2024)'],
  },
  {
    id: 'fulldas-v2',
    name: 'FullDASv2',
    maturity: 2,
    atoms: ['A1', 'A2', 'A4', 'A5', 'B2', 'B4', 'C1', 'C2', 'D1', 'D2', 'D3', 'E3', 'E4', 'E5', 'E7', 'E8', 'F1', 'F2', 'G2', 'G3'],
    desc: 'Extends FullDAS with getBlobs integration (including cell injection from partial mempools), EL blob encoding, proposed getBlobsV3 streaming interface. Analyzes RLNC as an alternative/complement to RS. Discusses EC-aware mempools as a future direction.',
    keyProps: 'getBlobs cell injection (E7) solves the cliff effect. EL blob encoding (A4) offloads builder computation. getBlobsV3 (E8) surfaces partial mempool availability. RLNC analysis maps the full design space of coding alternatives.',
    limitations: 'Most complex composite: many atoms at maturity 1–2. RLNC verifiability unresolved. Sharded mempool (G2) nonce-gap problem requires EIP-8077.',
    refs: ['FullDASv2 (cskiraly, May 2025)'],
  },
  {
    id: 'gossipsub-partial-messages',
    name: 'GossipSub partial messages',
    maturity: 3,
    atoms: ['B3', 'D1', 'D2'],
    desc: 'A GossipSub-level extension allowing cell-level dissemination within existing column topics without a hard fork. Draft libp2p spec, draft consensus-spec PR, and devnet PoC. A devnet PoC reportedly reduced data sent for data columns by ~10x in a two-peer experiment.',
    keyProps: 'Backwards-compatible incremental upgrade (B3). Bitmap addressing (D1, D2) enables efficient partial reconciliation. Works within existing column topic structure.',
    limitations: "Incremental: does not address EL bottleneck or 2D extension. Backwards compatibility with non-upgraded peers is an open question. Real-mesh performance (vs two-peer PoC) is unvalidated.",
    refs: ["GossipSub partial messages extension (MarcoPolo, Sep 2025)"],
  },
  {
    id: 'sparse-blobpool',
    name: 'Sparse blobpool (EIP-8070)',
    maturity: 2,
    atoms: ['G4', 'E10', 'A5', 'G1'],
    also_requires: ['EIP-7594', 'EIP-7870'],
    desc: 'Replaces full replication in the EL blobpool with probabilistic custody-aligned sampling. Nodes fetch full blob payloads with p=0.15 and sample custody-aligned cells otherwise. Introduces devp2p eth/71 with cell_mask signaling, GetCells/Cells messages, and Engine API extensions (blobCustodyUpdatedV1, getBlobsV4). Designed to be deployable without consensus changes.',
    keyProps: '~4x EL bandwidth reduction. Preserves getBlobs utility via custody alignment. No nonce-gap problem (unlike G2). Backwards-compatible devp2p rollout. No consensus changes required.',
    limitations: 'Provider backbone is probabilistic (0.03% total unavailability). Builder inclusion policies for sampled-only blobs not battle-tested. 4x reduction may be insufficient at very high blob counts. Supernode behavior at the EL layer underspecified.',
    refs: ['EIP-8070: Sparse Blobpool (Oct 2025)', 'EthMagicians discussion'],
  },
  {
    id: 'blob-streaming',
    name: 'Blob streaming',
    maturity: 1,
    atoms: ['I1', 'I2', 'I3', 'I4'],
    also_requires: ['EIP-7805 (FOCIL)'],
    desc: 'Enshrines AOT (ahead-of-time) blob propagation as a first-class CL mechanism alongside a spot-priced JIT (just-in-time) lane. Users buy tickets to propagate blobs before the critical path. A DA contract records availability on-chain. PTC enforces inclusion of propagated blobs. Capacity governed by B_1 (JIT max), B_2 (total max), R (reserved JIT). EIP-1559-style pricing for AOT tickets.',
    keyProps: 'Throughput scales because AOT uses bandwidth outside the critical path. End-to-end CR for blob txs via PTC + FOCIL + DA contract. Smaller critical path mitigates free option problem. Ticket-based rate-limiting provides DoS resistance.',
    limitations: 'Maturity 1: no spec, no implementation, depends on unshipped FOCIL. JIT blobs have weaker CR than AOT. R parameter (capacity split) is a fundamental design choice with no proposed adaptive mechanism. Full system is complex: new system contract, auction, committee role, dual payload lists, EIP-1559 controller.',
    refs: ['Scaling the DA layer with blob streaming (QED, fradamt, Julian, Feb 2026)', 'EIP-7805: FOCIL'],
  },
  {
    id: 'pandas',
    name: 'PANDAS',
    maturity: 2,
    atoms: ['A1', 'A2', 'B2', 'E3', 'E4', 'E5'],
    desc: 'A network-layer protocol targeting 32 MiB blobs and beyond. Assumes PBS for initial seeding. Uses 2D encoding with cell-level messaging and focuses on per-row/per-column reconstruction with cross-forwarding. Network-coded DAS extension of PeerDAS with adaptive sampling.',
    keyProps: '2D extension enables per-dimension repair without supernode dependence. Cross-forwarding (E5) creates the pipelined repair loop. Designed for very high blob counts (32 MiB+).',
    limitations: 'RLNC verifiability unresolved in some variants. Adaptive sampling interaction with attestation deadlines. DHT-based peer management adds complexity.',
    refs: ['PANDAS (Ascigil et al., Sep 2024)'],
  },
  {
    id: 'distributed-blob-building',
    name: 'Distributed blob building',
    maturity: 4,
    atoms: ['E1', 'E6', 'F3', 'F4', 'F5'],
    desc: 'An optimization within PeerDAS where supernodes fetch blobs from the EL, compute proofs, and publish columns, relieving the block proposer. Includes gradual publication to reduce duplicate bandwidth. Block header-first propagation lets supernodes start earlier.',
    keyProps: 'Implemented in Lighthouse; tested on devnets. Proposer does not need to compute proofs or publish all columns. Gradual publication (F3) reduces supernode outbound bandwidth significantly.',
    limitations: 'Race condition between reconstruction and proof computation (competing for CPU). Supernode count needed for reliability is uncertain. Still depends on supernodes.',
    refs: ['Sigma Prime blog: PeerDAS and distributed blob building (Sep 2024)'],
  },
  {
    id: 'rlnc-das',
    name: 'RLNC-based DAS',
    maturity: 2,
    atoms: ['A3', 'E9'],
    desc: 'Replaces RS with RLNC coding and Pedersen commitments (instead of KZG). Stronger probabilistic guarantees against withholding. Trades off per-dimension repair and cross-forwarding.',
    keyProps: 'Stronger withholding resistance (P13): any K linearly independent pieces suffice. No targeted withholding possible because combinations are random. No supernode needed in theory.',
    limitations: 'Loses cross-forwarding (E5). Loses per-dimension local reconstruction (E3, E4). Unclear how P2P redistribution works without dimensional gossip structure.',
    refs: ['Alternative DAS concept based on RLNC (Kolotov et al., Jun 2025)'],
  },
];
