import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ── Data ──────────────────────────────────────────────────────────────

const CATEGORIES = {
  A: { name: "Erasure coding", color: "#2563eb", layer: 0 },
  B: { name: "Messaging", color: "#7c3aed", layer: 1 },
  C: { name: "Subnet topology", color: "#0891b2", layer: 1 },
  D: { name: "Overhead reduction", color: "#059669", layer: 2 },
  E: { name: "Reconstruction / Engine API", color: "#d97706", layer: 3 },
  F: { name: "Publisher optimization", color: "#dc2626", layer: 4 },
  G: { name: "Mempool techniques", color: "#be185d", layer: 5 },
  H: { name: "Security / sampling", color: "#4338ca", layer: 6 },
  I: { name: "Propagation scheduling", color: "#0d9488", layer: 7 },
};

const PROPERTIES = [
  { id: "P1", name: "Throughput scalability" },
  { id: "P2", name: "Bandwidth efficiency" },
  { id: "P3", name: "Supernode independence" },
  { id: "P4", name: "Critical-path viability" },
  { id: "P5", name: "Reconstruction granularity" },
  { id: "P6", name: "Cross-dimensional repair" },
  { id: "P7", name: "Liveness resilience" },
  { id: "P8", name: "Query unlinkability" },
  { id: "P9", name: "Future compatibility" },
  { id: "P10", name: "Implementation complexity" },
  { id: "P11", name: "Builder bandwidth relief" },
  { id: "P12", name: "Mempool fragmentation tolerance" },
  { id: "P13", name: "Withholding resistance" },
  { id: "P14", name: "Backwards compatibility" },
  { id: "P15", name: "Crypto/verification overhead" },
];

const ATOMS = [
  { id:"A1", name:"1D row extension (RS)", cat:"A", maturity:5,
    desc:"Each blob extended horizontally to 2x width using RS coding. Columns become the sampling unit. Extension performed by blob tx sender, off the critical path.",
    benefits:["P2","P4","P10","P11"], hurts:[],
    openQs:["Reconstruction requires >=50% columns, so only supernodes can reconstruct. Acceptable long-term?","At very high blob counts, column size grows linearly. Practical gossip message size issues?"],
    deps:{requires:[],enables:["A4"],requiredBy:["C1","E1","E2"]},
    refs:["EIP-4844","EIP-7594: PeerDAS"]},
  { id:"A2", name:"2D extension (RS)", cat:"A", maturity:2,
    desc:"Data extended both horizontally and vertically using bivariate polynomial. Full matrix where any row or column can be independently repaired from >=50% of cells. Second dimension computed at block construction time (critical path) unless combined with EL blob encoding.",
    benefits:["P5","P6","P3","P1"], hurts:[],
    openQs:["Vertical extension on critical path for builder. How much does A4 offset this?","Concrete latency of second dimension at 128+ blobs?","Benedikt+Francesco analysis: is 2D worth complexity if 1D with thinner columns achieves similar security?"],
    deps:{requires:["A1"],enables:["E3","E4","E5"],requiredBy:["B2"]},
    refs:["FullDAS (cskiraly, May 2024)","FullDASv2 (cskiraly, May 2025)","Revisiting secure DAS (Benedikt+Francesco, Jul 2025)"]},
  { id:"A3", name:"RLNC (Random Linear Network Coding)", cat:"A", maturity:1,
    desc:"Replace fixed RS cells with random linear combinations. Any K linearly independent combinations decode full data. Sub-variants: I-RLC (interactive), NI-RLC (non-interactive), R-RLC (restricted), column-restricted RLC.",
    benefits:["P3","P13","P7"], hurts:["P5","P6","P10"],
    openQs:["How to make RLNC verifiable without per-combination KZG proofs?","Gameable by adversary controlling coefficient selection?","Compatible with pipelined dissemination?"],
    deps:{requires:[],enables:["E9"],conflicts:["E3","E4","E5"]},
    refs:["FullDASv2 (cskiraly, May 2025)"]},
  { id:"A4", name:"EL blob encoding", cat:"A", maturity:3,
    desc:"First-dimension RS extension performed in the EL mempool at tx submission time, not by the builder at block construction. Cells and proofs computed and cached before the block is built.",
    benefits:["P4","P11","P15"], hurts:[],
    openQs:["Requires EL clients to implement RS encoding and KZG proof generation. How much code?","What if the tx sender's encoding is wrong? Validation overhead?"],
    deps:{requires:["A1"],enables:["G3"],requiredBy:[]},
    refs:["FullDASv2 (cskiraly, May 2025)"]},
  { id:"A5", name:"Sender-side cell proofs", cat:"A", maturity:2,
    desc:"Cell proofs computed by the tx sender and included in the tx wrapper, so EL nodes can validate individual cells without the full blob. Enables per-cell validation at the mempool layer.",
    benefits:["P15","P4"], hurts:[],
    openQs:["Tx wrapper size increase from 128 cell proofs?","Sender incentive to compute correct proofs?"],
    deps:{requires:["A1"],enables:["G4"],requiredBy:[]},
    refs:["EIP-7594 spec"]},

  { id:"B1", name:"Column-level messaging", cat:"B", maturity:5,
    desc:"Each GossipSub message carries one complete column (all cells for one column index across all blobs). The column is the atomic dissemination and validation unit.",
    benefits:["P10","P14"], hurts:["P5","P12"],
    openQs:["Column size grows linearly with blob count. At 256 blobs, each column is ~512 KiB. GossipSub practical limit?","No partial-column messages: a node with 127/128 cells still retransmits the full column."],
    deps:{requires:["C1"],enables:[],requiredBy:["E6"]},
    refs:["EIP-7594: PeerDAS"]},
  { id:"B2", name:"Cell-level messaging", cat:"B", maturity:2,
    desc:"Each GossipSub message carries a single cell (one cell of one blob at one column index). Enables fine-grained dissemination, local reconstruction from partial data, and cross-forwarding.",
    benefits:["P5","P6","P12","P3"], hurts:["P10"],
    openQs:["At 256 blobs x 128 columns = 32,768 cells/slot. Per-message overhead dominates?","GossipSub message ID gossip overhead for 32K messages?"],
    deps:{requires:["A2"],enables:["E3","E4","E5","G2"],requiredBy:[]},
    refs:["FullDAS (cskiraly, May 2024)","FullDASv2 (cskiraly, May 2025)"]},
  { id:"B3", name:"GossipSub partial messages", cat:"B", maturity:3,
    desc:"GossipSub extension allowing cell-level dissemination within existing column topics without hard fork. Nodes reconcile columns from local data, fetching only missing cells via bitmap-addressed requests.",
    benefits:["P2","P12","P14","P9"], hurts:[],
    openQs:["Backwards compatibility with non-upgraded peers?","Bitmap overhead per message?"],
    deps:{requires:[],enables:["B2"],requiredBy:[]},
    refs:["GossipSub partial messages (MarcoPolo, Sep 2025)"]},
  { id:"B4", name:"Mixed column+cell messaging", cat:"B", maturity:1,
    desc:"Use column-level for initial dissemination (fewer messages), then switch to cell-level for repair and reconstruction. Adaptive based on phase of slot.",
    benefits:["P10","P5"], hurts:[],
    openQs:["Transition logic complexity?","How does a node know when to switch?"],
    deps:{requires:["B1","B2"],enables:[],requiredBy:[]},
    refs:["FullDASv2 (cskiraly, May 2025)"]},

  { id:"C1", name:"Column subnets", cat:"C", maturity:5,
    desc:"Each column index maps to a GossipSub topic. Nodes subscribe to subnets matching their custody columns. Deterministic assignment based on node ID.",
    benefits:["P2","P10"], hurts:["P8"],
    openQs:["Deterministic assignment creates predictable targets for targeted attacks.","Column count (128) is fixed. Enough for future scale?"],
    deps:{requires:["A1"],enables:["B1","H1"],requiredBy:[]},
    refs:["EIP-7594: PeerDAS"]},
  { id:"C2", name:"Row subnets", cat:"C", maturity:1,
    desc:"Row indices also get GossipSub topics. Enables cross-dimensional repair: a node subscribing to both row and column subnets can reconstruct cells and forward them.",
    benefits:["P6","P5"], hurts:["P10","P2"],
    openQs:["Doubles subnet count. Scalable?","Only useful with 2D extension."],
    deps:{requires:["A2"],enables:["E5"],requiredBy:[]},
    refs:["FullDAS (cskiraly, May 2024)"]},
  { id:"C3", name:"Stable + rotating assignment", cat:"C", maturity:4,
    desc:"Nodes have a stable custody set plus a rotating component that changes periodically. Rotation improves sampling coverage and reduces predictability.",
    benefits:["P8","P13"], hurts:["P10"],
    openQs:["Rotation period tradeoff: too fast = churn, too slow = predictable."],
    deps:{requires:["C1"],enables:["H1"],requiredBy:[]},
    refs:["EIP-7594: PeerDAS"]},
  { id:"C4", name:"Row/column ID-based discovery", cat:"C", maturity:2,
    desc:"discv5 ENR entries advertise custody columns, enabling targeted peer discovery for specific column indices.",
    benefits:["P10","P7"], hurts:["P8"],
    openQs:["ENR size limits with 128-bit custody bitmaps?","Discovery latency at scale?"],
    deps:{requires:["C1"],enables:[],requiredBy:[]},
    refs:["EIP-7594: PeerDAS"]},

  { id:"D1", name:"Structured message IDs", cat:"D", maturity:3,
    desc:"GossipSub message IDs encode slot, column index, and cell index directly, enabling O(1) deduplication without hashing the full message body.",
    benefits:["P4","P15"], hurts:[],
    openQs:["Requires GossipSub-level changes. Adoption path?"],
    deps:{requires:[],enables:["D2"],requiredBy:[]},
    refs:["FullDASv2 (cskiraly, May 2025)"]},
  { id:"D2", name:"Bitmap IHAVE/IWANT", cat:"D", maturity:2,
    desc:"Replace per-message-ID IHAVE/IWANT with bitmap-compressed summaries. A single bitmap covers all cells a node has/wants for a given slot.",
    benefits:["P2","P4"], hurts:["P10"],
    openQs:["Bitmap size at 256 blobs x 128 columns = 4 KiB. Acceptable?","Interaction with GossipSub heartbeat interval?"],
    deps:{requires:["D1"],enables:[],requiredBy:[]},
    refs:["FullDASv2 (cskiraly, May 2025)"]},
  { id:"D3", name:"Batch KZG verification", cat:"D", maturity:4,
    desc:"Amortize KZG proof verification across multiple cells using random linear combination. Verify N proofs in ~time of 1.",
    benefits:["P15","P4"], hurts:[],
    openQs:["Batching across columns vs within a column?","Interaction with streaming verification (verify as cells arrive)?"],
    deps:{requires:[],enables:[],requiredBy:[]},
    refs:["Kadianakis batch KZG post","EIP-7594 helpers"]},

  { id:"E1", name:"Supernode reconstruction", cat:"E", maturity:5,
    desc:"A supernode downloads all columns and reconstructs the full data matrix. The PeerDAS spec explicitly requires at least one supernode for reconstruction.",
    benefits:["P5"], hurts:["P3"],
    openQs:["Supernode bandwidth at 256 blobs?","How many supernodes needed for reliable reconstruction?"],
    deps:{requires:["A1"],enables:["F3","F4"],requiredBy:[]},
    refs:["EIP-7594: PeerDAS"]},
  { id:"E1b", name:"Desynchronized reconstruction", cat:"E", maturity:2,
    desc:"Supernodes add a random delay before reconstruction to avoid synchronized bandwidth spikes. Reduces correlated download storms.",
    benefits:["P2","P7"], hurts:[],
    openQs:["Optimal delay distribution?","Interaction with attestation deadlines?"],
    deps:{requires:["E1"],enables:[],requiredBy:[]},
    refs:["FullDASv2 (cskiraly, May 2025)"]},
  { id:"E2", name:"Semi-supernode reconstruction", cat:"E", maturity:3,
    desc:"A node subscribes to more columns than its minimum custody but fewer than all 128. Can reconstruct with >=64 columns (50% threshold).",
    benefits:["P3","P7"], hurts:["P2"],
    openQs:["Optimal number of extra columns?","Semi-supernodes detectable by subscription pattern?"],
    deps:{requires:["A1"],enables:[],requiredBy:[]},
    refs:["EIP-7594: PeerDAS"]},
  { id:"E2b", name:"getBlobsV2 all-or-nothing", cat:"E", maturity:5,
    desc:"A constraint, not a feature. getBlobsV2 returns either complete blob data or nothing. Cannot surface partial availability. Makes getBlobs useless when even one blob is missing.",
    benefits:[], hurts:["P12","P7"],
    openQs:["Resolved by E8 (getBlobsV3) and E10 (getBlobsV4)."],
    deps:{requires:[],enables:[],resolvedBy:["E8","E10"]},
    refs:["Engine API spec"]},
  { id:"E3", name:"Per-row local reconstruction", cat:"E", maturity:2,
    desc:"A node with >=50% cells of a single row can reconstruct that row locally. Requires 2D extension and cell-level messaging.",
    benefits:["P3","P5","P6"], hurts:[],
    openQs:["How often do nodes accumulate enough row cells from column subscriptions alone?"],
    deps:{requires:["A2","B2"],enables:["E5"],conflicts:["A3"]},
    refs:["FullDAS (cskiraly, May 2024)"]},
  { id:"E4", name:"Per-column local reconstruction", cat:"E", maturity:2,
    desc:"A node with >=50% cells of a single column can reconstruct that column locally. Natural complement to per-row reconstruction.",
    benefits:["P3","P5","P7"], hurts:[],
    openQs:["Column reconstruction is useful for repair but doesn't help nodes that need data from other columns."],
    deps:{requires:["A2","B2"],enables:["E5"],conflicts:["A3"]},
    refs:["FullDAS (cskiraly, May 2024)"]},
  { id:"E5", name:"Cross-forwarding / cross-seeding", cat:"E", maturity:2,
    desc:"Cells recovered from row reconstruction are forwarded to column subnets, and vice versa. Creates a pipelined repair loop between dimensions.",
    benefits:["P6","P3","P1"], hurts:["P10"],
    openQs:["Forwarding storm risk if many nodes reconstruct simultaneously?","Convergence time under adversarial conditions?"],
    deps:{requires:["A2","E3","E4"],enables:[],conflicts:["A3"]},
    refs:["FullDAS (cskiraly, May 2024)"]},
  { id:"E6", name:"getBlobs column assembly", cat:"E", maturity:5,
    desc:"CL uses Engine API getBlobs to fetch pre-propagated blob data from the EL blobpool, then assembles columns for gossip. Primary mechanism for PeerDAS dissemination.",
    benefits:["P4","P12","P11"], hurts:[],
    openQs:["Only useful when EL has the blobs. Degrades with private orderflow."],
    deps:{requires:["B1","G1"],enables:["F4"],requiredBy:[]},
    refs:["Sigma Prime blob propagation blog","Engine API spec"]},
  { id:"E7", name:"getBlobs cell injection", cat:"E", maturity:2,
    desc:"CL extracts individual cells from EL blobpool data and injects them into column/cell gossip topics. Works with partial EL availability.",
    benefits:["P12","P3"], hurts:["P10"],
    openQs:["Cell extraction from full blobs requires RS encoding at the CL. Acceptable?"],
    deps:{requires:["G2","B2"],enables:[],requiredBy:[]},
    refs:["FullDASv2 (cskiraly, May 2025)"]},
  { id:"E8", name:"getBlobsV3 (partial responses)", cat:"E", maturity:3,
    desc:"getBlobsV3 returns blob data with null entries for missing blobs. Surfaces partial EL availability to the CL. Resolves the all-or-nothing constraint of V2.",
    benefits:["P12","P7"], hurts:[],
    openQs:["Multiple EL clients implementing. Timeline?"],
    deps:{requires:[],enables:["E7","B3"],resolves:["E2b"],evolvedBy:["E10"]},
    refs:["Engine API spec (merged)"]},
  { id:"E9", name:"RLNC-based reconstruction", cat:"E", maturity:1,
    desc:"Full data recovery from K random linear combinations. No dimensional structure needed. But loses per-dimension repair and cross-forwarding.",
    benefits:["P3","P13"], hurts:["P5","P6"],
    openQs:["Verifiability of random combinations?","Latency vs RS?"],
    deps:{requires:["A3"],enables:[],conflicts:["E3","E4","E5"]},
    refs:["FullDASv2 (cskiraly, May 2025)"]},
  { id:"E10", name:"getBlobsV4 (cell-level Engine API)", cat:"E", maturity:2,
    desc:"engine_getBlobsV4 accepts indices_bitarray (uint128) specifying exactly which cell indices to retrieve. Returns per-blob cell arrays with null entries plus KZG proofs. Natural Engine API for sparse blobpool where EL holds cells, not full blobs. Paired with engine_blobCustodyUpdatedV1.",
    benefits:["P2","P9","P12"], hurts:[],
    openQs:["Coexistence with V3? Deprecation path?","Proof payload size at high blob counts?","500ms timeout sufficient?"],
    deps:{requires:["G4"],enables:[],evolves:["E8"],resolves:["E2b"]},
    refs:["EIP-8070: Sparse Blobpool (Oct 2025)"]},

  { id:"F1", name:"Batch publishing", cat:"F", maturity:3,
    desc:"Supernode publishes cells to multiple column subnets in parallel batches rather than one-at-a-time. Reduces source-side overhead.",
    benefits:["P4","P11"], hurts:[],
    openQs:["Optimal batch size?","Interaction with GossipSub mesh maintenance?"],
    deps:{requires:["E1"],enables:[],requiredBy:[]},
    refs:["FullDASv2 (cskiraly, May 2025)"]},
  { id:"F2", name:"Push-pull phase transition (PPPT)", cat:"F", maturity:2,
    desc:"Switch from eager push (gossip) to lazy pull (req/resp) partway through dissemination. Reduces duplicate messages in late-slot phase when most nodes already have data.",
    benefits:["P2","P4"], hurts:["P10"],
    openQs:["Transition timing heuristic?","Interaction with attestation deadlines?"],
    deps:{requires:[],enables:[],requiredBy:[]},
    refs:["FullDASv2 (cskiraly, May 2025)"]},
  { id:"F3", name:"Gradual publication", cat:"F", maturity:3,
    desc:"Supernodes spread column publication across the slot rather than publishing all at once. Reduces bandwidth spikes.",
    benefits:["P2","P7"], hurts:["P4"],
    openQs:["Interaction with attestation deadlines?","Optimal publication schedule?"],
    deps:{requires:["E1"],enables:[],requiredBy:[]},
    refs:["PeerDAS optimization discussions"]},
  { id:"F4", name:"Distributed blob building", cat:"F", maturity:2,
    desc:"Multiple supernodes collaborate to build the full column set rather than relying on a single supernode. Each fetches blobs from EL and publishes a subset of columns.",
    benefits:["P3","P11","P7"], hurts:["P10"],
    openQs:["Coordination overhead?","Free-rider problem?"],
    deps:{requires:["E1","E6"],enables:[],requiredBy:[]},
    refs:["Block and blob propagation with PeerDAS (2025)"]},
  { id:"F5", name:"Block header-first propagation", cat:"F", maturity:4,
    desc:"Propagate block header before full block body. Lets nodes start preparing for column dissemination before the full block arrives.",
    benefits:["P4","P11"], hurts:[],
    openQs:["Header validation without body?","Interaction with builder timing games?"],
    deps:{requires:[],enables:["F4","D3"],requiredBy:[]},
    refs:["Engine API spec"]},

  { id:"G1", name:"EL mempool pre-seeding", cat:"G", maturity:5,
    desc:"Blob txs propagate through the EL mempool before block construction. CL uses getBlobs to fetch pre-propagated data. Primary mechanism for PeerDAS column assembly.",
    benefits:["P4","P12"], hurts:[],
    openQs:["Degraded by private blob txs.","Pre-seeding is cell-level with sparse blobpool (G4)."],
    deps:{requires:[],enables:["E6","E7"],transformedBy:["G4"]},
    refs:["EIP-4844","Sigma Prime blog"]},
  { id:"G2", name:"Sharded blob mempool", cat:"G", maturity:1,
    desc:"EL mempool sharded by column index. Each node stores only columns matching its custody set. More aggressive bandwidth reduction than sparse blobpool but introduces nonce gaps.",
    benefits:["P2","P1"], hurts:["P10","P14"],
    openQs:["Nonce-gap problem requires EIP-8077.","How to handle blob tx validity when local node doesn't have all blobs?"],
    deps:{requires:["E7","B2"],enables:[],alternativeTo:["G4"]},
    refs:["Dankrad: horizontally sharded mempool"]},
  { id:"G3", name:"EC-aware mempool", cat:"G", maturity:2,
    desc:"EL mempool stores blobs in RS-encoded form (cells + proofs) rather than raw blobs. Enables cell-level operations at the mempool layer.",
    benefits:["P9","P15"], hurts:["P10"],
    openQs:["Storage overhead of encoded form?","Interaction with tx validation?"],
    deps:{requires:["A4"],enables:["G2"],requiredBy:[]},
    refs:["FullDASv2 (cskiraly, May 2025)"]},
  { id:"G4", name:"Sparse blobpool (EIP-8070)", cat:"G", maturity:2,
    desc:"Custody-aligned probabilistic sampling at EL blobpool. Full fetch with p=0.15 (provider), custody cells otherwise (sampler). ~4x bandwidth reduction. devp2p eth/71: cell_mask signaling, GetCells/Cells messages. Sampling noise (C_extra=1 random column) defends against targeted withholding.",
    benefits:["P2","P4","P9","P10","P14"], hurts:[],
    openQs:["cell_mask uniform across all type 3 txs in one announcement.","Provider/sampler decision predictability.","Supernode fingerprinting via larger peerset.","Builder inclusion policy for sampled-only blobs.","RBF impact."],
    deps:{requires:["A5"],enables:["E10"],alternativeTo:["G2","I1"],requires2:["EIP-7594","EIP-7870"]},
    refs:["EIP-8070: Sparse Blobpool (Oct 2025)"]},

  { id:"H1", name:"Subnet-based sampling", cat:"H", maturity:5,
    desc:"Nodes sample by subscribing to column subnets matching their custody set. Passive sampling: data arrives via gossip. Primary sampling mechanism in PeerDAS.",
    benefits:["P10","P2"], hurts:["P8"],
    openQs:["Deterministic subscriptions are observable.","Minimum custody size for security?"],
    deps:{requires:["C1","C3"],enables:[],requiredBy:[]},
    refs:["EIP-7594: PeerDAS"]},
  { id:"H2", name:"Peer-based sampling (req/resp)", cat:"H", maturity:5,
    desc:"Active sampling via DataColumnSidecarsByRoot requests to peers. Used to sample columns outside the node's subnet subscriptions.",
    benefits:["P13","P8"], hurts:["P10"],
    openQs:["Request patterns observable by peers.","Latency vs passive sampling?"],
    deps:{requires:[],enables:[],requiredBy:[]},
    refs:["EIP-7594: PeerDAS"]},
  { id:"H3", name:"LossyDAS (adaptive sampling)", cat:"H", maturity:1,
    desc:"Sample adaptively: start with few samples, increase if some fail. Reduces average-case overhead while maintaining worst-case guarantees.",
    benefits:["P2","P7"], hurts:["P10"],
    openQs:["Interaction with attestation deadlines?","Adversary can force worst-case?"],
    deps:{requires:[],enables:[],requiredBy:[]},
    refs:["LossyDAS paper"]},
  { id:"H4", name:"Local randomness for sampling", cat:"H", maturity:3,
    desc:"Use local randomness (RANDAO, VRF) to select sampling targets. Improves unlinkability by making targets unpredictable.",
    benefits:["P8","P13"], hurts:[],
    openQs:["RANDAO manipulable by proposer?","VRF setup cost?"],
    deps:{requires:[],enables:[],requiredBy:[]},
    refs:["Validator privacy research"]},
  { id:"H5", name:"Confirmation rule layering", cat:"H", maturity:2,
    desc:"Separate liveness-safe fork choice (accepts data with sampling) from safety-critical confirmation (requires stronger guarantees). Two layers with different DAS requirements.",
    benefits:["P7","P9"], hurts:["P10"],
    openQs:["Confirmation latency?","How to communicate confirmation status to L2s?"],
    deps:{requires:["H1","H2"],enables:[],requiredBy:[]},
    refs:["SubnetDAS (fradamt+Ansgar, Oct 2023)"]},

  { id:"I1", name:"Blob tickets (CL propagation rights)", cat:"I", maturity:1,
    desc:"Ticket system grants right to propagate a blob through CL sampling infrastructure. Acquired via on-chain ticket contract. Each ticket: one CL blob propagation + multiple EL blob tx submissions. Moves pre-propagation to CL, reusing DAS infrastructure. Ticket purchase is where bandwidth is paid for (no blob basefee at AOT inclusion).",
    benefits:["P4","P2","P7","P12"], hurts:["P10"],
    openQs:["Forward ticket purchasing (slot N+k) creates futures market for blob space.","MEV interaction with ticket auctions.","Loosened mempool rules: new spam vectors?"],
    deps:{requires:[],enables:["I2","I3"],alternativeTo:["G4","G2"],partiallyReplaces:["G1"]},
    refs:["Blob streaming (QED, fradamt, Julian, Feb 2026)","Blob mempool tickets","On the future of the blob mempool","Variants of mempool tickets"]},
  { id:"I2", name:"DA contract (availability recording)", cat:"I", maturity:1,
    desc:"System contract recording which blobs are available, queryable within EVM and by nodes. Ring buffer over ~128 blocks for O(1) proof-free lookups. Once recorded, blob txs become equivalent to regular txs for mempool/FOCIL. Current-block reads are warm (written at block start).",
    benefits:["P7","P12","P9"], hurts:["P10"],
    openQs:["Gas cost of system call writing 128 hashes/block.","Reorg handling unspecified.","128-block window sufficient for all L2s?","New EVM primitive: contracts can condition logic on blob availability."],
    deps:{requires:["I1"],enables:["I4","I3"],requiredBy:[]},
    refs:["Blob streaming (QED, fradamt, Julian, Feb 2026)"]},
  { id:"I3", name:"JIT/AOT payload split", cat:"I", maturity:1,
    desc:"Payload contains jit_versioned_hashes (builder propagates during critical path, spot-priced) and aot_versioned_hashes (pre-propagated via tickets, already paid). Capacity: B_1 (JIT max), B_2 (total max), R (reserved JIT). EIP-1559-style AOT pricing. JIT blobs = today's private blobs.",
    benefits:["P1","P4","P11"], hurts:["P10"],
    openQs:["R parameter is most sensitive design choice. Too low: underserve L1 JIT needs. Too high: force AOT users through builders.","JIT = private blobs. Entrenches builder centralization?","Capacity rollover under sustained overdemand.","L1-as-rollup JIT fraction?"],
    deps:{requires:["I1","I2"],enables:[],requiredBy:[]},
    refs:["Blob streaming (QED, fradamt, Julian, Feb 2026)"]},
  { id:"I4", name:"PTC blob inclusion enforcement", cat:"I", maturity:1,
    desc:"PTC members observe propagated blobs by deadline, sample, vote on availability. Majority vote determines which versioned hashes proposer must include. Attesters enforce unless locally unavailable (safety override). End-to-end CR: PTC for blob availability, FOCIL for blob tx inclusion. JIT blobs have weaker CR.",
    benefits:["P13","P7"], hurts:["P10"],
    openQs:["Committee size/selection unspecified.","Safety override attack surface.","JIT blobs: weaker CR acceptable for L1-as-rollup?"],
    deps:{requires:["I2","I1"],enables:[],requires2:["EIP-7805 FOCIL"]},
    refs:["Blob streaming (QED, fradamt, Julian, Feb 2026)","EIP-7805: FOCIL"]},
];

const COMPOSITES = [
  { id:"peerDAS", name:"PeerDAS (Fusaka)", maturity:5,
    atoms:["A1","A4","B1","C1","C3","C4","D3","E1","E2","E2b","E6","F3","F5","G1","H1","H2"],
    desc:"1D RS extension, column subnets, deterministic custody, supernode reconstruction. Shipping in Fusaka. EL bandwidth 4-5x CL at devnet blob counts.",
    limitations:"Supernode dependent. Column-level messaging cliff effect. getBlobsV2 all-or-nothing. EL blobpool fully replicates." },
  { id:"subnetDAS", name:"SubnetDAS", maturity:3,
    atoms:["A1","B1","C1","C3","H1","H2","H5"],
    desc:"Adds stable+rotating subnets and confirmation rule layering to PeerDAS. Security analysis: 5-10% of nodes foolable in intermediate step.",
    limitations:"Still 1D. Still column-level. No mempool integration." },
  { id:"fullDAS", name:"FullDAS", maturity:2,
    atoms:["A2","B2","C1","C2","E1","E3","E4","E5","F1"],
    desc:"2D extension with cell-level messaging, per-row/per-column repair, cross-forwarding. Pipelined repair loop. Targets supernode-free operation.",
    limitations:"Requires 2D extension on critical path. Cell-level messaging overhead at scale." },
  { id:"fullDASv2", name:"FullDASv2", maturity:2,
    atoms:["A2","A4","B2","B4","C1","C2","D1","D2","D3","E3","E4","E5","E7","E8","F1","F2","G2","G3"],
    desc:"Adds EL blob encoding, overhead reduction (structured IDs, bitmap IHAVE/IWANT), getBlobsV3, cell injection, EC-aware mempool. Targets 256+ blobs.",
    limitations:"Most complex composite. Many atoms at maturity 1-2." },
  { id:"gossipPartial", name:"GossipSub partial messages", maturity:3,
    atoms:["B3","D1","D2"],
    desc:"Cell-level dissemination within existing column topics without hard fork. Draft libp2p spec, consensus-spec PR, devnet PoC.",
    limitations:"Incremental. Doesn't address EL bottleneck or 2D." },
  { id:"sparseBlobpool", name:"Sparse blobpool (EIP-8070)", maturity:2,
    atoms:["G4","E10","A5","G1"],
    desc:"Probabilistic custody-aligned EL sampling. p=0.15 provider/sampler. ~4x bandwidth reduction. devp2p eth/71. No consensus changes needed.",
    limitations:"Provider backbone probabilistic (0.03% unavailability). 4x may be insufficient at very high counts. Supernode EL behavior underspecified." },
  { id:"blobStreaming", name:"Blob streaming", maturity:1,
    atoms:["I1","I2","I3","I4"],
    desc:"Enshrined AOT blob pre-propagation via CL tickets alongside spot-priced JIT lane. DA contract records availability. PTC enforces inclusion. End-to-end CR for blob txs.",
    limitations:"Maturity 1. Depends on unshipped FOCIL. Complex: new contract, auction, committee, dual payload, EIP-1559 controller. JIT blobs have weaker CR." },
  { id:"pandas", name:"PANDAS", maturity:2,
    atoms:["A1","B1","C1","D3","H1","H3"],
    desc:"Network-coded extension of PeerDAS with adaptive sampling (LossyDAS). Focuses on probabilistic guarantees.",
    limitations:"RLNC verifiability unresolved. Adaptive sampling interaction with attestation deadlines." },
];

const EDGES = [
  {from:"A1",to:"A4",type:"enables"},{from:"A1",to:"C1",type:"requires"},{from:"A1",to:"E1",type:"requires"},
  {from:"A1",to:"E2",type:"requires"},{from:"A2",to:"A1",type:"requires"},{from:"A2",to:"E3",type:"enables"},
  {from:"A2",to:"E4",type:"enables"},{from:"A2",to:"E5",type:"enables"},{from:"A2",to:"B2",type:"requires"},
  {from:"A3",to:"E3",type:"conflicts"},{from:"A3",to:"E4",type:"conflicts"},{from:"A3",to:"E5",type:"conflicts"},
  {from:"A3",to:"E9",type:"enables"},{from:"A4",to:"G3",type:"enables"},
  {from:"B3",to:"B2",type:"enables"},{from:"B1",to:"C1",type:"requires"},{from:"B4",to:"B1",type:"requires"},
  {from:"B4",to:"B2",type:"requires"},{from:"C1",to:"H1",type:"enables"},{from:"C3",to:"H1",type:"enables"},
  {from:"D1",to:"D2",type:"enables"},{from:"E1",to:"F3",type:"enables"},{from:"E1",to:"F4",type:"enables"},
  {from:"E3",to:"E5",type:"enables"},{from:"E4",to:"E5",type:"enables"},{from:"E6",to:"F4",type:"enables"},
  {from:"E8",to:"E7",type:"enables"},{from:"E8",to:"B3",type:"enables"},
  {from:"E8",to:"E2b",type:"resolves"},{from:"E10",to:"E8",type:"evolves"},{from:"E10",to:"E2b",type:"resolves"},
  {from:"F5",to:"F4",type:"enables"},{from:"F5",to:"D3",type:"enables"},
  {from:"G1",to:"E6",type:"enables"},{from:"G1",to:"E7",type:"enables"},
  {from:"G3",to:"G2",type:"enables"},{from:"G4",to:"E10",type:"enables"},
  {from:"G4",to:"G2",type:"alternative"},{from:"G4",to:"G1",type:"transforms"},
  {from:"A5",to:"G4",type:"enables"},
  {from:"I1",to:"I2",type:"enables"},{from:"I1",to:"I3",type:"enables"},
  {from:"I2",to:"I4",type:"enables"},{from:"I2",to:"I3",type:"enables"},
  {from:"I1",to:"G4",type:"alternative"},{from:"I1",to:"G1",type:"alternative"},
  {from:"E1b",to:"E1",type:"requires"},
  {from:"H5",to:"H1",type:"requires"},{from:"H5",to:"H2",type:"requires"},
];

// ── Helpers ───────────────────────────────────────────────────────────

const MATURITY_LABELS = ["","Idea","Spec'd","Draft impl","Tested","Shipped"];
const MATURITY_COLORS = ["","#f87171","#fb923c","#facc15","#a3e635","#34d399"];

const catOf = id => id.replace(/[0-9b]*/g,"");

// ── Layout engine for architecture view ───────────────────────────────

function layerLayout(atoms, width, height) {
  const layers = {};
  atoms.forEach(a => {
    const layer = CATEGORIES[a.cat].layer;
    if (!layers[layer]) layers[layer] = [];
    layers[layer].push(a);
  });
  const layerKeys = Object.keys(layers).sort((a,b) => Number(b)-Number(a));
  const n = layerKeys.length;
  const pos = {};
  layerKeys.forEach((lk,li) => {
    const items = layers[lk];
    const y = 60 + (li / Math.max(n-1,1)) * (height - 120);
    items.forEach((a,ai) => {
      const x = 60 + ((ai+0.5) / items.length) * (width - 120);
      pos[a.id] = { x, y };
    });
  });
  return pos;
}

// ── Force-directed layout ─────────────────────────────────────────────

function forceLayout(atoms, edges, width, height, iterations=200) {
  const pos = {};
  atoms.forEach((a,i) => {
    const angle = (i / atoms.length) * Math.PI * 2;
    const r = Math.min(width,height) * 0.35;
    pos[a.id] = { x: width/2 + r*Math.cos(angle), y: height/2 + r*Math.sin(angle) };
  });
  const k = Math.sqrt((width*height) / atoms.length) * 0.6;
  for (let iter=0; iter<iterations; iter++) {
    const disp = {};
    atoms.forEach(a => { disp[a.id] = {x:0,y:0}; });
    // repulsion
    for (let i=0;i<atoms.length;i++) {
      for (let j=i+1;j<atoms.length;j++) {
        const a = atoms[i], b = atoms[j];
        let dx = pos[a.id].x - pos[b.id].x;
        let dy = pos[a.id].y - pos[b.id].y;
        const d = Math.max(Math.sqrt(dx*dx+dy*dy), 1);
        const f = (k*k) / d;
        disp[a.id].x += (dx/d)*f;
        disp[a.id].y += (dy/d)*f;
        disp[b.id].x -= (dx/d)*f;
        disp[b.id].y -= (dy/d)*f;
      }
    }
    // attraction
    edges.forEach(e => {
      if (!pos[e.from] || !pos[e.to]) return;
      let dx = pos[e.to].x - pos[e.from].x;
      let dy = pos[e.to].y - pos[e.from].y;
      const d = Math.max(Math.sqrt(dx*dx+dy*dy), 1);
      const f = d / k;
      const strength = e.type === "conflicts" || e.type === "alternative" ? 0.3 : 0.8;
      disp[e.from].x += (dx/d)*f*strength;
      disp[e.from].y += (dy/d)*f*strength;
      disp[e.to].x -= (dx/d)*f*strength;
      disp[e.to].y -= (dy/d)*f*strength;
    });
    // category clustering
    atoms.forEach(a => {
      const samecat = atoms.filter(b => b.cat === a.cat && b.id !== a.id);
      samecat.forEach(b => {
        let dx = pos[b.id].x - pos[a.id].x;
        let dy = pos[b.id].y - pos[a.id].y;
        const d = Math.max(Math.sqrt(dx*dx+dy*dy), 1);
        disp[a.id].x += (dx/d)*2;
        disp[a.id].y += (dy/d)*2;
      });
    });
    const temp = 0.3 * (1 - iter/iterations);
    atoms.forEach(a => {
      const d = Math.sqrt(disp[a.id].x**2 + disp[a.id].y**2);
      if (d > 0) {
        const capped = Math.min(d, k*temp);
        pos[a.id].x += (disp[a.id].x/d)*capped;
        pos[a.id].y += (disp[a.id].y/d)*capped;
      }
      pos[a.id].x = Math.max(40, Math.min(width-40, pos[a.id].x));
      pos[a.id].y = Math.max(40, Math.min(height-40, pos[a.id].y));
    });
  }
  return pos;
}

// ── Components ────────────────────────────────────────────────────────

function DetailPanel({ atom, onClose }) {
  if (!atom) return null;
  const cat = CATEGORIES[atom.cat];
  return (
    <div style={{position:"fixed",top:0,right:0,width:480,height:"100vh",background:"#fff",
      borderLeft:"1px solid #d4d4d8",boxShadow:"-8px 0 30px rgba(0,0,0,0.08)",zIndex:100,
      overflow:"auto",fontFamily:"'IBM Plex Sans',system-ui,sans-serif"}}>
      <div style={{padding:"28px 28px 0"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <span style={{fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.08em",
              color:cat.color,opacity:0.8}}>{cat.name}</span>
            <h2 style={{margin:"4px 0 0",fontSize:20,fontWeight:700,color:"#18181b",lineHeight:1.3}}>{atom.id}. {atom.name}</h2>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",
            color:"#71717a",padding:"4px 8px",borderRadius:4}}>x</button>
        </div>
        <div style={{display:"flex",gap:8,marginTop:12,flexWrap:"wrap"}}>
          <span style={{fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:99,
            background:MATURITY_COLORS[atom.maturity]+"22",color:MATURITY_COLORS[atom.maturity],
            border:`1px solid ${MATURITY_COLORS[atom.maturity]}44`}}>
            Maturity {atom.maturity}: {MATURITY_LABELS[atom.maturity]}
          </span>
          {atom.benefits.map(p => (
            <span key={p} style={{fontSize:11,padding:"3px 8px",borderRadius:99,
              background:"#dcfce7",color:"#166534",border:"1px solid #bbf7d0"}}>{p}</span>
          ))}
          {(atom.hurts||[]).map(p => (
            <span key={p} style={{fontSize:11,padding:"3px 8px",borderRadius:99,
              background:"#fee2e2",color:"#991b1b",border:"1px solid #fecaca"}}>{p}</span>
          ))}
        </div>
      </div>
      <div style={{padding:"20px 28px"}}>
        <p style={{fontSize:14,lineHeight:1.7,color:"#3f3f46",margin:0}}>{atom.desc}</p>

        {atom.openQs && atom.openQs.length > 0 && (
          <div style={{marginTop:20}}>
            <h4 style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",
              color:"#a1a1aa",margin:"0 0 8px"}}>Open questions</h4>
            {atom.openQs.map((q,i) => (
              <p key={i} style={{fontSize:13,color:"#52525b",lineHeight:1.6,margin:"0 0 6px",
                paddingLeft:12,borderLeft:"2px solid #e4e4e7"}}>{q}</p>
            ))}
          </div>
        )}

        <div style={{marginTop:20}}>
          <h4 style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",
            color:"#a1a1aa",margin:"0 0 8px"}}>Dependencies</h4>
          {EDGES.filter(e => e.from === atom.id || e.to === atom.id).map((e,i) => {
            const other = e.from === atom.id ? e.to : e.from;
            const dir = e.from === atom.id ? "outgoing" : "incoming";
            const otherAtom = ATOMS.find(a => a.id === other);
            const typeColors = {requires:"#2563eb",enables:"#059669",conflicts:"#dc2626",
              alternative:"#d97706",resolves:"#7c3aed",evolves:"#0891b2",transforms:"#be185d"};
            return (
              <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,fontSize:13}}>
                <span style={{color:typeColors[e.type]||"#71717a",fontWeight:600,fontSize:11,
                  textTransform:"uppercase",minWidth:70}}>{e.type}</span>
                <span style={{color:dir==="outgoing"?"#18181b":"#52525b"}}>
                  {dir==="outgoing"?"->":"<-"} {other}{otherAtom ? `: ${otherAtom.name}` : ""}
                </span>
              </div>
            );
          })}
          {EDGES.filter(e => e.from === atom.id || e.to === atom.id).length === 0 &&
            <p style={{fontSize:13,color:"#a1a1aa",fontStyle:"italic"}}>No direct dependencies in graph</p>}
        </div>

        <div style={{marginTop:20}}>
          <h4 style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",
            color:"#a1a1aa",margin:"0 0 8px"}}>Used in composites</h4>
          {COMPOSITES.filter(c => c.atoms.includes(atom.id)).map(c => (
            <span key={c.id} style={{display:"inline-block",fontSize:12,padding:"3px 10px",borderRadius:99,
              background:"#f4f4f5",color:"#3f3f46",border:"1px solid #e4e4e7",marginRight:6,marginBottom:4}}>
              {c.name}
            </span>
          ))}
          {COMPOSITES.filter(c => c.atoms.includes(atom.id)).length === 0 &&
            <p style={{fontSize:13,color:"#a1a1aa",fontStyle:"italic"}}>Not part of any composite</p>}
        </div>

        {atom.refs && atom.refs.length > 0 && (
          <div style={{marginTop:20}}>
            <h4 style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",
              color:"#a1a1aa",margin:"0 0 8px"}}>References</h4>
            {atom.refs.map((r,i) => (
              <p key={i} style={{fontSize:12,color:"#52525b",margin:"0 0 4px"}}>{r}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Architecture layers view ──────────────────────────────────────────

function ArchView({ onSelect, selected }) {
  const W = 1100, H = 700;
  const layerNames = ["Erasure coding","Messaging / Topology","Overhead reduction",
    "Reconstruction / Engine API","Publisher optimization","Mempool techniques",
    "Security / sampling","Propagation scheduling"];
  const layers = {};
  ATOMS.forEach(a => {
    const l = CATEGORIES[a.cat].layer;
    if (!layers[l]) layers[l] = [];
    layers[l].push(a);
  });
  const layerKeys = Object.keys(layers).sort((a,b)=>Number(a)-Number(b));

  return (
    <div style={{overflow:"auto"}}>
      <div style={{minWidth:W,padding:"0 12px"}}>
        {layerKeys.map((lk,li) => {
          const items = layers[lk];
          return (
            <div key={lk} style={{display:"flex",alignItems:"center",gap:12,marginBottom:6,
              background:li%2===0?"#fafafa":"#fff",borderRadius:8,padding:"10px 16px"}}>
              <div style={{minWidth:180,fontSize:11,fontWeight:700,textTransform:"uppercase",
                letterSpacing:"0.06em",color:"#71717a"}}>{layerNames[Number(lk)]}</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",flex:1}}>
                {items.map(a => {
                  const cat = CATEGORIES[a.cat];
                  const isSel = selected === a.id;
                  return (
                    <button key={a.id} onClick={() => onSelect(a.id)}
                      style={{padding:"6px 12px",borderRadius:6,fontSize:12,fontWeight:600,
                        cursor:"pointer",transition:"all 0.15s",
                        background:isSel ? cat.color : cat.color+"11",
                        color:isSel ? "#fff" : cat.color,
                        border:`1.5px solid ${isSel ? cat.color : cat.color+"44"}`,
                        boxShadow:isSel?"0 2px 8px "+cat.color+"33":"none"}}>
                      <span style={{opacity:0.6,marginRight:4}}>{a.id}</span>{a.name.length > 28 ? a.name.slice(0,26)+"..." : a.name}
                      <span style={{marginLeft:6,fontSize:10,opacity:0.7,
                        background:MATURITY_COLORS[a.maturity]+"33",padding:"1px 5px",borderRadius:99}}>
                        M{a.maturity}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Graph view (SVG force-directed) ───────────────────────────────────

function GraphView({ onSelect, selected, edgeFilter }) {
  const W = 1100, H = 680;
  const pos = useMemo(() => forceLayout(ATOMS, EDGES, W, H, 300), []);
  const filteredEdges = edgeFilter === "all" ? EDGES : EDGES.filter(e => e.type === edgeFilter);

  const edgeColors = {requires:"#2563eb",enables:"#059669",conflicts:"#dc2626",
    alternative:"#d97706",resolves:"#7c3aed",evolves:"#0891b2",transforms:"#be185d"};

  return (
    <svg width={W} height={H} style={{background:"#fafafa",borderRadius:8}}>
      <defs>
        {Object.entries(edgeColors).map(([type,color]) => (
          <marker key={type} id={`arrow-${type}`} viewBox="0 0 10 10" refX="28" refY="5"
            markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
          </marker>
        ))}
      </defs>
      {filteredEdges.map((e,i) => {
        if (!pos[e.from] || !pos[e.to]) return null;
        const hi = selected && (e.from===selected || e.to===selected);
        const dim = selected && !hi;
        return (
          <line key={i} x1={pos[e.from].x} y1={pos[e.from].y}
            x2={pos[e.to].x} y2={pos[e.to].y}
            stroke={edgeColors[e.type]||"#a1a1aa"}
            strokeWidth={hi?2.5:1.2} opacity={dim?0.1:hi?1:0.4}
            strokeDasharray={e.type==="conflicts"||e.type==="alternative"?"5,4":"none"}
            markerEnd={`url(#arrow-${e.type})`} />
        );
      })}
      {ATOMS.map(a => {
        const p = pos[a.id];
        if (!p) return null;
        const cat = CATEGORIES[a.cat];
        const isSel = selected === a.id;
        const connected = selected && EDGES.some(e =>
          (e.from===selected&&e.to===a.id)||(e.to===selected&&e.from===a.id));
        const dim = selected && !isSel && !connected;
        return (
          <g key={a.id} onClick={() => onSelect(a.id)} style={{cursor:"pointer"}}
            opacity={dim?0.15:1}>
            <circle cx={p.x} cy={p.y} r={isSel?18:14}
              fill={cat.color+"18"} stroke={cat.color}
              strokeWidth={isSel?3:1.5} />
            <circle cx={p.x} cy={p.y} r={3}
              fill={MATURITY_COLORS[a.maturity]} />
            <text x={p.x} y={p.y-18} textAnchor="middle"
              fontSize={10} fontWeight={isSel?700:500}
              fill={cat.color} fontFamily="'IBM Plex Mono',monospace">
              {a.id}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Composite comparison view ─────────────────────────────────────────

function CompositeView({ onSelect, selected }) {
  return (
    <div style={{overflow:"auto"}}>
      <table style={{borderCollapse:"collapse",fontSize:12,fontFamily:"'IBM Plex Sans',system-ui,sans-serif"}}>
        <thead>
          <tr>
            <th style={{padding:"8px 12px",textAlign:"left",borderBottom:"2px solid #e4e4e7",
              position:"sticky",left:0,background:"#fff",zIndex:2,minWidth:100}}>Atom</th>
            {COMPOSITES.map(c => (
              <th key={c.id} style={{padding:"8px 10px",textAlign:"center",borderBottom:"2px solid #e4e4e7",
                fontSize:11,fontWeight:700,whiteSpace:"nowrap",minWidth:80}}>
                <div>{c.name}</div>
                <div style={{fontSize:10,fontWeight:400,color:"#a1a1aa",marginTop:2}}>
                  M{c.maturity}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ATOMS.map((a,ai) => {
            const cat = CATEGORIES[a.cat];
            const isSel = selected === a.id;
            return (
              <tr key={a.id} onClick={() => onSelect(a.id)}
                style={{cursor:"pointer",background:isSel?cat.color+"08":ai%2===0?"#fafafa":"#fff"}}>
                <td style={{padding:"6px 12px",fontWeight:600,color:cat.color,
                  position:"sticky",left:0,background:isSel?cat.color+"08":ai%2===0?"#fafafa":"#fff",
                  borderBottom:"1px solid #f4f4f5",whiteSpace:"nowrap"}}>
                  <span style={{opacity:0.5,marginRight:4}}>{a.id}</span>
                  {a.name.length > 24 ? a.name.slice(0,22)+"..." : a.name}
                </td>
                {COMPOSITES.map(c => (
                  <td key={c.id} style={{padding:"6px 10px",textAlign:"center",
                    borderBottom:"1px solid #f4f4f5"}}>
                    {c.atoms.includes(a.id) ? (
                      <div style={{width:14,height:14,borderRadius:99,background:cat.color,
                        margin:"0 auto",boxShadow:"0 1px 3px "+cat.color+"33"}} />
                    ) : null}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Property matrix view ──────────────────────────────────────────────

function PropertyView({ onSelect, selected }) {
  return (
    <div style={{overflow:"auto"}}>
      <table style={{borderCollapse:"collapse",fontSize:12,fontFamily:"'IBM Plex Sans',system-ui,sans-serif"}}>
        <thead>
          <tr>
            <th style={{padding:"8px 12px",textAlign:"left",borderBottom:"2px solid #e4e4e7",
              position:"sticky",left:0,background:"#fff",zIndex:2,minWidth:100}}>Atom</th>
            {PROPERTIES.map(p => (
              <th key={p.id} style={{padding:"6px 6px",textAlign:"center",borderBottom:"2px solid #e4e4e7",
                fontSize:10,fontWeight:600,writingMode:"vertical-lr",height:100,whiteSpace:"nowrap"}}>
                <span style={{opacity:0.5}}>{p.id} </span>{p.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ATOMS.map((a,ai) => {
            const cat = CATEGORIES[a.cat];
            const isSel = selected === a.id;
            return (
              <tr key={a.id} onClick={() => onSelect(a.id)}
                style={{cursor:"pointer",background:isSel?cat.color+"08":ai%2===0?"#fafafa":"#fff"}}>
                <td style={{padding:"5px 12px",fontWeight:600,color:cat.color,fontSize:11,
                  position:"sticky",left:0,background:isSel?cat.color+"08":ai%2===0?"#fafafa":"#fff",
                  borderBottom:"1px solid #f4f4f5",whiteSpace:"nowrap"}}>
                  {a.id}
                </td>
                {PROPERTIES.map(p => {
                  const ben = a.benefits.includes(p.id);
                  const hurt = (a.hurts||[]).includes(p.id);
                  return (
                    <td key={p.id} style={{padding:"4px",textAlign:"center",
                      borderBottom:"1px solid #f4f4f5"}}>
                      {ben && <div style={{width:10,height:10,borderRadius:99,
                        background:"#22c55e",margin:"0 auto"}} />}
                      {hurt && <div style={{width:10,height:10,borderRadius:99,
                        background:"#ef4444",margin:"0 auto"}} />}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Decision tree view ────────────────────────────────────────────────

function DecisionView({ onSelect }) {
  const nodes = [
    { id:"start", label:"What's the binding constraint?", x:440, y:30, w:240, type:"question" },
    { id:"el", label:"EL blobpool bandwidth\n(4-5x CL at Fusaka counts)", x:140, y:120, w:200, type:"problem" },
    { id:"cl", label:"CL overhead at 256+ blobs\n(per-message processing)", x:440, y:120, w:210, type:"problem" },
    { id:"super", label:"Supernode dependence\n(centralization pressure)", x:740, y:120, w:200, type:"problem" },

    { id:"el_near", label:"Near-term\n(no consensus changes)", x:60, y:240, w:160, type:"path" },
    { id:"el_mid", label:"Medium-term\n(consensus changes)", x:260, y:240, w:160, type:"path" },

    { id:"g4", label:"G4: Sparse blobpool\n~4x reduction, eth/71", x:60, y:340, w:160, type:"solution",atoms:["G4","E10","A5"] },
    { id:"stream", label:"Blob streaming\nAOT/JIT lanes + CR", x:260, y:340, w:160, type:"solution",atoms:["I1","I2","I3","I4"] },

    { id:"cell", label:"Cell-level primitives\n(shipped in EIP-7594)", x:380, y:240, w:160, type:"solution",atoms:["A1","D3"] },
    { id:"partial", label:"getBlobsV3/V4\n(partial responses)", x:380, y:340, w:160, type:"solution",atoms:["E8","E10"] },
    { id:"gossip", label:"GossipSub partial msgs\n(no hard fork)", x:560, y:240, w:160, type:"solution",atoms:["B3","D1","D2"] },

    { id:"fulldas", label:"FullDAS core loop\n(2D + cell + cross-fwd)", x:740, y:240, w:180, type:"solution",atoms:["A2","B2","E3","E4","E5"] },

    { id:"privacy", label:"Query unlinkability\n(open frontier)", x:440, y:440, w:180, type:"frontier" },
    { id:"rlnc", label:"RS vs RLNC\n(open frontier)", x:680, y:440, w:160, type:"frontier" },
  ];

  const arrows = [
    {from:"start",to:"el"},{from:"start",to:"cl"},{from:"start",to:"super"},
    {from:"el",to:"el_near"},{from:"el",to:"el_mid"},
    {from:"el_near",to:"g4"},{from:"el_mid",to:"stream"},
    {from:"cl",to:"cell"},{from:"cl",to:"gossip"},
    {from:"cell",to:"partial"},
    {from:"super",to:"fulldas"},
  ];

  const typeStyles = {
    question:{bg:"#18181b",fg:"#fff",border:"#18181b"},
    problem:{bg:"#fef2f2",fg:"#991b1b",border:"#fca5a5"},
    path:{bg:"#eff6ff",fg:"#1e40af",border:"#93c5fd"},
    solution:{bg:"#f0fdf4",fg:"#166534",border:"#86efac"},
    frontier:{bg:"#fefce8",fg:"#854d0e",border:"#fde047"},
  };

  return (
    <svg width={960} height={500} style={{background:"#fafafa",borderRadius:8}}>
      {arrows.map((ar,i) => {
        const f = nodes.find(n=>n.id===ar.from);
        const t = nodes.find(n=>n.id===ar.to);
        return <line key={i} x1={f.x+f.w/2} y1={f.y+30} x2={t.x+t.w/2} y2={t.y}
          stroke="#d4d4d8" strokeWidth={1.5} />;
      })}
      {nodes.map(n => {
        const s = typeStyles[n.type];
        return (
          <g key={n.id} onClick={() => n.atoms && onSelect(n.atoms[0])} style={{cursor:n.atoms?"pointer":"default"}}>
            <rect x={n.x} y={n.y} width={n.w} height={n.type==="question"?36:56}
              rx={6} fill={s.bg} stroke={s.border} strokeWidth={1.5} />
            {n.label.split("\n").map((line,li) => (
              <text key={li} x={n.x+n.w/2} y={n.y+(n.type==="question"?22:20+li*16)}
                textAnchor="middle" fontSize={li===0?12:11} fontWeight={li===0?700:400}
                fill={s.fg} fontFamily="'IBM Plex Sans',system-ui,sans-serif">{line}</text>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

// ── Maturity timeline view ────────────────────────────────────────────

function MaturityView({ onSelect, selected }) {
  const groups = [1,2,3,4,5].map(m => ATOMS.filter(a => a.maturity === m));
  return (
    <div style={{display:"flex",gap:12,padding:"0 4px",overflow:"auto"}}>
      {[1,2,3,4,5].map(m => (
        <div key={m} style={{flex:1,minWidth:180}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,
            padding:"8px 12px",background:MATURITY_COLORS[m]+"15",borderRadius:8,
            border:`1px solid ${MATURITY_COLORS[m]}33`}}>
            <div style={{width:12,height:12,borderRadius:99,background:MATURITY_COLORS[m]}} />
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"#18181b"}}>{MATURITY_LABELS[m]}</div>
              <div style={{fontSize:11,color:"#71717a"}}>{groups[m-1].length} atoms</div>
            </div>
          </div>
          {groups[m-1].map(a => {
            const cat = CATEGORIES[a.cat];
            const isSel = selected === a.id;
            return (
              <button key={a.id} onClick={() => onSelect(a.id)}
                style={{display:"block",width:"100%",textAlign:"left",padding:"8px 12px",
                  marginBottom:4,borderRadius:6,cursor:"pointer",transition:"all 0.15s",
                  background:isSel?cat.color+"12":"#fff",
                  border:`1px solid ${isSel?cat.color+"44":"#e4e4e7"}`}}>
                <div style={{fontSize:12,fontWeight:700,color:cat.color}}>{a.id}</div>
                <div style={{fontSize:11,color:"#52525b",marginTop:2,lineHeight:1.4}}>
                  {a.name.length > 32 ? a.name.slice(0,30)+"..." : a.name}
                </div>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Main app ──────────────────────────────────────────────────────────

const VIEWS = [
  { id:"arch", label:"Architecture layers" },
  { id:"graph", label:"Dependency graph" },
  { id:"composite", label:"Composite comparison" },
  { id:"props", label:"Property matrix" },
  { id:"decision", label:"Decision tree" },
  { id:"maturity", label:"Maturity timeline" },
];

export default function DASExplorer() {
  const [view, setView] = useState("arch");
  const [selected, setSelected] = useState(null);
  const [edgeFilter, setEdgeFilter] = useState("all");
  const atom = selected ? ATOMS.find(a => a.id === selected) : null;

  return (
    <div style={{fontFamily:"'IBM Plex Sans',system-ui,sans-serif",background:"#fff",
      minHeight:"100vh",color:"#18181b"}}>
      {/* Header */}
      <div style={{borderBottom:"1px solid #e4e4e7",padding:"16px 24px",
        display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <h1 style={{margin:0,fontSize:18,fontWeight:800,letterSpacing:"-0.02em"}}>
            DAS building blocks explorer
            <span style={{fontSize:12,fontWeight:400,color:"#a1a1aa",marginLeft:8}}>v3</span>
          </h1>
          <p style={{margin:"2px 0 0",fontSize:12,color:"#71717a"}}>
            {ATOMS.length} atoms, {PROPERTIES.length} properties, {COMPOSITES.length} composites, {EDGES.length} dependency edges
          </p>
        </div>
        <div style={{display:"flex",gap:2,background:"#f4f4f5",borderRadius:8,padding:3}}>
          {VIEWS.map(v => (
            <button key={v.id} onClick={() => setView(v.id)}
              style={{padding:"6px 14px",borderRadius:6,fontSize:12,fontWeight:view===v.id?700:500,
                border:"none",cursor:"pointer",transition:"all 0.15s",
                background:view===v.id?"#fff":"transparent",
                color:view===v.id?"#18181b":"#71717a",
                boxShadow:view===v.id?"0 1px 3px rgba(0,0,0,0.08)":"none"}}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category legend */}
      <div style={{padding:"10px 24px",borderBottom:"1px solid #f4f4f5",
        display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}>
        <span style={{fontSize:11,color:"#a1a1aa",fontWeight:600}}>Categories:</span>
        {Object.entries(CATEGORIES).map(([k,v]) => (
          <span key={k} style={{fontSize:11,fontWeight:600,color:v.color,
            display:"flex",alignItems:"center",gap:4}}>
            <span style={{width:8,height:8,borderRadius:2,background:v.color}} />
            {k}: {v.name}
          </span>
        ))}
        {view === "graph" && (
          <>
            <span style={{fontSize:11,color:"#a1a1aa",fontWeight:600,marginLeft:16}}>Edge filter:</span>
            {["all","requires","enables","conflicts","alternative","resolves","evolves"].map(f => (
              <button key={f} onClick={() => setEdgeFilter(f)}
                style={{fontSize:11,padding:"2px 8px",borderRadius:99,cursor:"pointer",
                  border:`1px solid ${edgeFilter===f?"#18181b":"#d4d4d8"}`,
                  background:edgeFilter===f?"#18181b":"#fff",
                  color:edgeFilter===f?"#fff":"#52525b"}}>
                {f}
              </button>
            ))}
          </>
        )}
      </div>

      {/* Content */}
      <div style={{padding:20,paddingRight:selected?500:20}}>
        {view === "arch" && <ArchView onSelect={setSelected} selected={selected} />}
        {view === "graph" && <GraphView onSelect={setSelected} selected={selected} edgeFilter={edgeFilter} />}
        {view === "composite" && <CompositeView onSelect={setSelected} selected={selected} />}
        {view === "props" && <PropertyView onSelect={setSelected} selected={selected} />}
        {view === "decision" && <DecisionView onSelect={setSelected} />}
        {view === "maturity" && <MaturityView onSelect={setSelected} selected={selected} />}
      </div>

      {/* Detail panel */}
      <DetailPanel atom={atom} onClose={() => setSelected(null)} />
    </div>
  );
}
