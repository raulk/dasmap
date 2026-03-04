# Ethereum DAS building blocks: an atomic inventory (v3)

This document decomposes the Ethereum data availability sampling (DAS) design space into atomic building blocks and maps how composite proposals combine them. It covers erasure coding schemes, messaging granularity, subnet topology, reconstruction approaches, publisher-side optimizations, overhead reduction techniques, mempool-side techniques, and security/sampling strategies.

Audience: Ethereum protocol researchers and P2P networking engineers.

---

## 1. Taxonomy of desirable properties

Every building block and composite proposal can be evaluated against the following properties. These form the scoring axes used throughout this document.

| ID | Property | Description |
|----|----------|-------------|
| P1 | Throughput scalability | Maximum blob count per slot the technique supports or enables |
| P2 | Per-node bandwidth efficiency | How much data a non-supernode must download/upload per slot |
| P3 | Supernode independence | Whether the system works without relying on a small set of nodes that must download or reconstruct the global dataset. Reliance on supernodes is acceptable only as a transitional, explicitly bounded assumption |
| P4 | Critical-path viability | Whether the design works within slot-time constraints for block propagation and attestation deadlines, and avoids pushing heavy computation or large fan-out into the proposer's tight window unless explicitly offloaded |
| P5 | Reconstruction granularity | Finest unit at which data can be recovered (cell, row, column, full matrix) |
| P6 | Cross-dimensional repair | Whether recovery actions in one dimension improve availability in the other (e.g. row-derived data helps repair columns and vice versa), enabling availability amplification rather than isolated repairs |
| P7 | Liveness resilience | Under partial failures (missing subnets, slow peers, delayed publishing), the system degrades gracefully, enabling fallback paths (req/resp, local reconstruction, alternate dissemination) without catastrophic stalls |
| P8 | Query unlinkability | Whether an adversary can infer a node's sampling targets from observable network behaviour (subnet joins, request patterns, peer selection), or link those targets back to specific node identities |
| P9 | Future compatibility | Whether the infrastructure composes towards 2D sampling and full Danksharding, including eventual movement from "columns as samples" to "cells as samples" and more robust reconstruction |
| P10 | Implementation complexity | Amount of new networking machinery, spec changes, and unknowns. Preference for reusing well-understood components (GossipSub, discv5, req/resp) over bespoke overlay networks |
| P11 | Builder bandwidth relief | Whether the block builder's uplink burden is reduced |
| P12 | Mempool fragmentation tolerance | Whether it works when no single EL node has all blobs (private orderflow, sharded/segmented mempools, partial local availability), and whether it exploits local availability when present |
| P13 | Withholding attack resistance | Strength of probabilistic guarantees against data withholding |
| P14 | Backwards compatibility | Whether it can be deployed without consensus changes or hard forks |
| P15 | Cryptographic/verification overhead | Whether proof sizes, proof generation placement (sender, proposer, helper nodes), and verification cost (batching, caching) remain tractable at high blob counts |

---

## 2. Atomic building blocks

### Category A: erasure coding schemes

#### A1. 1D row extension (Reed-Solomon)

**Description.** Each blob is extended horizontally to 2x width using RS coding. The extended blob becomes a row in the data matrix. Columns (vertical slices across all rows) become the sampling unit. The extension can be performed by the blob transaction sender, off the critical path.

**Maturity: 5** (shipped on mainnet via EIP-4844; used in PeerDAS/Fusaka)

**References.**
- [EIP-4844](https://eips.ethereum.org/EIPS/eip-4844)
- [EIP-7594: PeerDAS](https://eips.ethereum.org/EIPS/eip-7594)

**Benefits.** P2 (each node downloads only a fraction of columns), P4 (extension done off critical path by tx sender), P10 (well-understood, single polynomial evaluation), P11 (extension offloaded from builder).

**Open questions.**
- With 1D extension only, reconstruction requires collecting >=50% of all columns, which means only supernodes or semi-supernodes can reconstruct. Is this acceptable long-term, or does it create a centralization pressure?
- At very high blob counts, does the column size (which grows linearly with blob count) create practical gossip message size issues?

**Cross-dependencies.**
- Enables A4 (EL blob encoding): row extension can be moved to the mempool if done at tx submission
- Requires C1 (column subnets): columns are the distribution and sampling unit
- Required by E1 (supernode reconstruction) and E2 (semi-supernode reconstruction): they decode rows from collected columns

---

#### A2. 2D extension (Reed-Solomon)

**Description.** Data is extended both horizontally (row-wise) and vertically (column-wise) using a bivariate polynomial. Creates a full matrix where any individual row or column can be independently repaired from >=50% of its cells. The second dimension must be computed at block construction time (on the critical path), unless combined with EL blob encoding.

**Maturity: 2** (described in original Danksharding design; analyzed in FullDAS; not implemented in any client)

**References.**
- [FullDAS (cskiraly, May 2024)](https://ethresear.ch/t/fulldas-towards-massive-scalability-with-32mb-blocks-and-beyond/19529)
- [FullDASv2 (cskiraly, May 2025)](https://ethresear.ch/t/accelerating-blob-scaling-with-fulldasv2-with-getblobs-mempool-encoding-and-possibly-rlc/22477)
- [Revisiting secure DAS in 1D and 2D (Benedikt + Francesco, Jul 2025)](https://ethresear.ch/t/revisiting-secure-das-in-one-and-two-dimensions/22762)
- [Nuances of data recoverability in DAS (Vitalik, Aug 2023)](https://ethresear.ch/t/nuances-of-data-recoverability-in-data-availability-sampling/16256)

**Benefits.** P5 (per-row and per-column repair from partial cells), P6 (enables cross-forwarding between dimensions), P3 (any custodying node can participate in repair), P1 (designed for 256+ blobs per slot).

**Open questions.**
- The vertical extension computation is on the critical path for the builder. How much does EL blob encoding (A4) actually offset this?
- What is the concrete latency overhead of computing the second dimension at block time for 128+ blobs?
- The "revisiting secure DAS" post by Benedikt and Francesco analyzes whether 2D actually improves security bounds compared to 1D with more columns. The answer is nuanced and depends on the adversary model. Is 2D worth the complexity if 1D with thinner columns achieves similar security?

**Cross-dependencies.**
- Requires A1 (1D row extension): the first dimension
- Enables E3 (per-row local reconstruction) and E4 (per-column local reconstruction): independent dimension repair
- Enables E5 (cross-forwarding): recovered cells from one dimension feed the other
- Benefits from A4 (EL blob encoding): offloads first-dimension computation from builder
- Requires B2 (cell-level messaging) to fully exploit: column-level messages can't do per-row repair

---

#### A3. RLNC (Random Linear Network Coding)

**Description.** Replace fixed RS cells with random linear combinations of the data. Any K linearly independent combinations suffice to decode the full data. Multiple sub-variants exist with different tradeoffs.

**Sub-variants:**

**A3a. I-RLC (interactive).** The receiver selects random coefficients and requests coded pieces interactively. Prevents the sender from generating linearly dependent combinations. Adds round-trip latency.

**A3b. NI-RLC (non-interactive).** Coefficients derived deterministically from the receiver's node ID. No interaction needed, but prevents on-the-fly recombination (the "N" in RLNC is lost). Nodes can only recombine after full decoding.

**A3c. R-RLC (restricted).** Most coefficients forced to zero; combinations restricted to a subset of cells (e.g. within one column). Enables partial repair at slight coding efficiency loss. Analogous to LT codes.

**A3d. Column-restricted RLC.** Linear combinations only from cells of a given column. Allows per-column recovery once enough coded pieces arrive. But cross-forwarding between dimensions is lost because a linear combination of column cells doesn't help row distribution.

**Maturity: 2** (EthResearch analysis; no implementation)

**References.**
- [Alternative DAS concept based on RLNC (Kolotov et al., Jun 2025)](https://ethresear.ch/t/alternative-das-concept-based-on-rlnc/22651)
- [Faster block/blob propagation in Ethereum (potuz)](https://ethresear.ch/t/faster-block-blob-propagation-in-ethereum/21370)
- [FullDASv2 RLNC analysis (cskiraly, May 2025)](https://ethresear.ch/t/accelerating-blob-scaling-with-fulldasv2-with-getblobs-mempool-encoding-and-possibly-rlc/22477)

**Benefits.** P13 (no two samples overlap; once K NI-RLC copies are distributed, decoding is guaranteed; harder to fool nodes compared to RS where an adversary can withhold N-K-1 specific cells), P11 (builder can generate coded pieces without knowing exactly how many are needed), P1 (in principle scales well because any K pieces suffice).

**Open questions.**
- cskiraly's FullDASv2 post identifies four distinct RLNC-based DAS designs, each with different tradeoffs. Design no. 3 (individualized samples without P2P redistribution) effectively creates a client-server model where only the builder serves the network. Is there a viable design that preserves P2P redistribution while getting RLNC's probabilistic benefits?
- Design no. 4 (hierarchical restricted RLC) is flagged as "still work in progress" with a dedicated writeup planned. Has this materialized?
- Without per-row/per-column repair, the pipelined dispersal model of FullDAS breaks. Sampling can only start after custody is complete (the node has enough pieces to decode). How much latency does this add to the critical path?
- The feedback loop problem: to reach optimal performance with fountain/RLNC codes, the builder needs a feedback signal to stop generating new pieces. No such feedback mechanism exists in the current P2P architecture.

**Cross-dependencies.**
- Conflicts with E5 (cross-forwarding): RLNC loses the ability to cross-forward between dimensions because coded pieces from one dimension don't help the other
- Conflicts with A2 (2D extension): if RLNC replaces RS, the 2D structure and its per-dimension repair properties are lost (unless column-restricted RLC is used, which partially recovers them)
- Benefits from B2 (cell-level messaging): coded pieces are cell-sized
- Potentially benefits from F5 (block header-first propagation): supernodes can start generating coded pieces as soon as they know the commitments

---

#### A4. EL blob encoding (mempool-side extension)

**Description.** Row-wise RS erasure coding is performed when the blob transaction is submitted to the mempool, rather than at block construction time. Blobs arrive at nodes already extended. Reduces computation for the builder and for nodes using getBlobs.

**Maturity: 3** (specified for Fusaka; part of PeerDAS flow)

**References.**
- [FullDASv2 (cskiraly, May 2025)](https://ethresear.ch/t/accelerating-blob-scaling-with-fulldasv2-with-getblobs-mempool-encoding-and-possibly-rlc/22477)
- [EIP-7594](https://eips.ethereum.org/EIPS/eip-7594)

**Benefits.** P11 (builder no longer computes row extensions; only the second dimension if 2D remains), P4 (removes extension computation from block production hot path), P12 (enables the mempool itself to become EC-aware).

**Open questions.**
- Who bears the cost of KZG proof computation for the extended cells? The blob tx sender? This adds cost to L2 sequencers.
- Does pre-encoding in the mempool change the DOS surface for the EL gossip layer?

**Cross-dependencies.**
- Requires A1 (1D row extension): the encoding being moved to the mempool
- Enables E6 (getBlobs-assisted reconstruction): getBlobs returns pre-encoded data, so the CL can skip extension
- Enables G3 (EC-aware mempool): the mempool natively carries encoded data
- Benefits A2 (2D extension): reduces the builder's remaining computation to only the second dimension

---

#### A5. Sender-side cell proof computation in the tx wrapper

**Description.** Blob transaction senders compute cell-level KZG proofs and include them in the EIP-4844 transaction wrapper, rather than requiring the block proposer to compute them at block time. Nodes validate that commitments match versioned hashes and verify that cell proofs match the blob's cells (including extension cells). Batch verification (via `verify_cell_kzg_proof_batch`) is explicitly specified.

**Maturity: 5** (included in Final EIP-7594 and shipped with Fusaka)

**References.**
- [EIP-7594](https://eips.ethereum.org/EIPS/eip-7594)
- [A universal verification equation for DAS (Kadianakis, Dietrichs, Feist, Aug 2022)](https://ethresear.ch/t/a-universal-verification-equation-for-data-availability-sampling/13240)

**Benefits.** P4 (removes a key proposer-side computation bottleneck), P15 (batch verification amortizes cost), P12 (EL mempool can verify cells locally).

**Open questions.**
- Pushing DAS cryptography into EL and mempool rules tightens coupling between the two layers and makes future changes harder. Alternative paths (e.g. more radical transaction-type changes) may be needed if the proof format evolves.
- What is the practical batch size before diminishing returns? How does batch verification interact with streaming cell arrival (cells don't all arrive at once)?

**Cross-dependencies.**
- Benefits all reconstruction approaches: cells arrive pre-proven, so validation cost is low
- Benefits B2 (cell-level messaging): critical for validating individual cells before forwarding
- Benefits E3 (per-row local reconstruction): need to verify recovered cells cheaply
- Enables A4 (EL blob encoding): the mempool can validate encoded blobs

---

### Category B: messaging granularity

#### B1. Column-level messaging

**Description.** The unit of P2P gossip is an entire column (a vertical slice across all blobs in a block). Each column message contains one cell per blob. Used in current PeerDAS.

**Maturity: 5** (implemented in Fusaka mainnet clients)

**References.**
- [EIP-7594](https://eips.ethereum.org/EIPS/eip-7594)
- [PeerDAS documentation (fradamt + b-wagn, Aug 2024)](https://ethresear.ch/t/peerdas-documentation/20361)

**Benefits.** P10 (simple; one message per column per slot), P14 (fits existing GossipSub infrastructure).

**Open questions.**
- Column size grows linearly with blob count. At 128 blobs, a single column message is ~64 KiB. At 256 blobs, ~128 KiB. Does this hit practical GossipSub message size limits or cause fragmentation?
- With column-level messages, if a node's EL is missing even one blob, it cannot assemble a full column from getBlobs. This creates a cliff effect at scale.

**Cross-dependencies.**
- Required by E1 (supernode reconstruction) and E2 (semi-supernode reconstruction): they collect full columns
- Required by C1 (column subnets): columns are the gossip unit on these subnets
- Conflicts with E3 (per-row local reconstruction): you can't recover individual rows from full columns unless you have enough columns to decode the whole matrix
- Conflicts with E7 (getBlobs cell injection): getBlobs returns rows, not columns; with column-level messaging, a partial row can't be injected into column subnets at cell granularity

---

#### B2. Cell-level messaging

**Description.** The unit of P2P gossip is a single cell (the intersection of one row and one column in the data matrix). Any custodying node can send or receive individual cells. Prerequisite for local reconstruction without supernodes.

**Maturity: 2** (described in FullDAS and FullDASv2; not implemented in mainnet clients)

**References.**
- [FullDAS (cskiraly, May 2024)](https://ethresear.ch/t/fulldas-towards-massive-scalability-with-32mb-blocks-and-beyond/19529)
- [FullDASv2 (cskiraly, May 2025)](https://ethresear.ch/t/accelerating-blob-scaling-with-fulldasv2-with-getblobs-mempool-encoding-and-possibly-rlc/22477)
- [SubnetDAS discussion on cell gossiping (fradamt, Oct 2023)](https://ethresear.ch/t/subnetdas-an-intermediate-das-approach/17169/3)

**Benefits.** P3 (any node with a few cells can contribute to repair), P5 (per-row and per-column repair from individual cells), P6 (enables cross-forwarding at finest granularity), P12 (even a single blob from the EL can contribute cells to column subnets).

**Open questions.**
- Per-message overhead is the key concern flagged by cskiraly. At 256 blobs with 128 columns, the matrix has 32,768 cells per slot. Each cell needs a GossipSub message with headers, message ID gossip, and validation. Is the per-message processing cost tractable?
- How does cell-level gossip interact with GossipSub's IHAVE/IWANT protocol? The signaling overhead could dominate bandwidth at high cell counts.
- Anti-DOS: how do you validate a single cell before forwarding? You need the block header (or at least the KZG commitments) to check a cell's KZG proof. This means cell gossip can only start after the block/commitments propagate. fradamt flagged this in the SubnetDAS discussion.

**Cross-dependencies.**
- Enables E3 (per-row local reconstruction): need cell granularity to collect partial rows
- Enables E4 (per-column local reconstruction): same for columns
- Enables E5 (cross-forwarding): recovered cells forwarded individually to orthogonal subnets
- Enables E7 (getBlobs cell injection): cells from EL blobs pushed to column subnets
- Benefits from D1 (structured message IDs): reduces message ID overhead
- Benefits from D2 (bitmap-based IHAVE/IWANT): compresses signaling
- Benefits from A5 (sender-side proofs + batch verification): amortizes KZG proof checks across cells
- Requires A2 (2D extension) for full benefit: with 1D extension only, per-column reconstruction still needs 50% of all rows in that column, which is the same as having 50% of all blobs

---

#### B3. GossipSub partial messages extension

**Description.** A backwards-compatible GossipSub upgrade that allows nodes to disseminate partial messages (cells) within existing column topics, without requiring a hard fork or new topic structure. Uses a group ID (block root) and bitmap (indexing cells) so peers can advertise and request just the missing pieces. Nodes can upgrade incrementally. A devnet PoC reportedly reduced data sent for data columns by ~10x in a two-peer experiment.

**Maturity: 3** (EthResearch post with design, draft libp2p spec, draft consensus-spec PR, and devnet PoC)

**References.**
- [GossipSub's partial messages extension and cell-level dissemination (MarcoPolo, Sep 2025)](https://ethresear.ch/t/gossipsubs-partial-messages-extension-and-cell-level-dissemination/23017)

**Benefits.** P14 (works within existing GossipSub; incremental upgrade), P3 (gets cell-level benefits without full protocol overhaul), P12 (increases usefulness of partial EL data via getBlobs).

**Open questions.**
- How do non-upgraded nodes handle partial messages they receive? Do they silently drop them, or does this create compatibility issues?
- Scaling to real meshes with realistic RTTs, tuning eager-push probabilities, and integrating with IDONTWANT/mesh behaviour are still open engineering problems.
- Does the extension compose cleanly with PPPT (F2) and batch publishing (F1)?

**Cross-dependencies.**
- Enables B2 (cell-level messaging) in a backwards-compatible way
- Benefits from E6 (getBlobs-assisted reconstruction): makes getBlobs data more useful even with partial mempool
- Requires C1 (column subnets): operates within existing column topic structure
- Benefits strongly from E8 (getBlobs v3): partial returns from EL feed directly into partial message reconciliation

---

#### B4. Mixed column+cell messaging

**Description.** Use column-level messages as the primary transport but allow cell-level messages as a secondary path for repair and cross-forwarding. A compromise that manages per-message overhead while retaining cell-level repair benefits.

**Maturity: 1** (discussed in FullDASv2 as an option; no detailed design)

**References.**
- [FullDASv2 (cskiraly, May 2025)](https://ethresear.ch/t/accelerating-blob-scaling-with-fulldasv2-with-getblobs-mempool-encoding-and-possibly-rlc/22477)

**Benefits.** P10 (lower per-message overhead than pure cell-level), P6 (retains repair capability via cell path), P4 (primary path is fast; cell path adds repair without slowing the main flow).

**Open questions.**
- What triggers the switch from column to cell messaging? Is it automatic (e.g. after timeout) or always parallel?
- How do you avoid double-counting when the same data arrives via both paths?

**Cross-dependencies.**
- Requires B1 (column-level messaging) and B2 (cell-level messaging)
- Benefits from D1 (structured message IDs): for deduplication across paths

---

### Category C: subnet topology

#### C1. Column subnets

**Description.** One gossip subnet per column (or per custody group of columns). Nodes subscribe to a deterministic set based on their node ID. Used for data distribution and sampling in all DAS proposals. Custody is expressed in "custody groups" and advertised via ENR (`cgc`).

**Maturity: 5** (implemented in Fusaka mainnet)

**References.**
- [EIP-7594](https://eips.ethereum.org/EIPS/eip-7594)
- [PeerDAS original post (Sep 2023)](https://ethresear.ch/t/peerdas-a-simpler-das-approach-using-battle-tested-p2p-components/16541)

**Benefits.** P9 (every DAS proposal uses column subnets in some form), P10 (well-understood; attestation subnets are precedent).

**Open questions.**
- The number of custody groups and their mapping to subnets affects subnet density. With too many subnets and too few nodes per subnet, gossip becomes unreliable.
- Deterministic custody improves coordination but aggravates query-linkability risks and creates incentives for targeted DoS on "important" subnets.

**Cross-dependencies.**
- Required by B1 (column-level messaging): columns are gossiped on these subnets
- Required by H1 (subnet-based sampling): sample = subscribe to subnet

---

#### C2. Row subnets

**Description.** One gossip subnet per row (i.e. per blob position in the block). Used for blob distribution and for cross-seeding recovered cells. In SubnetDAS, only validators join row subnets.

**Maturity: 2** (described in SubnetDAS and FullDAS; not implemented)

**References.**
- [SubnetDAS (fradamt + Ansgar, Oct 2023)](https://ethresear.ch/t/subnetdas-an-intermediate-das-approach/17169)
- [FullDAS (cskiraly, May 2024)](https://ethresear.ch/t/fulldas-towards-massive-scalability-with-32mb-blocks-and-beyond/19529)

**Benefits.** P6 (enables row-wise reconstruction and cross-seeding to column subnets), P5 (per-row recovery).

**Open questions.**
- Row indices correspond to blob positions in a block. These are not known until the block is proposed. How do nodes pre-join row subnets if the blob ordering is only determined at block time? SubnetDAS proposed stable row assignments for validators, but this only works for custody, not for reconstructing a specific blob that an L2 cares about.
- At 256 blobs, you need 256 row subnets. Combined with 128 column subnets, that's 384 total subnets. Is this too many for practical peer management?

**Cross-dependencies.**
- Enables E3 (per-row local reconstruction): row subnets are where row repair happens
- Enables E5 (cross-forwarding): recovered cells from row repair are pushed to column subnets
- Benefits from B2 (cell-level messaging): fradamt noted that cell-level gossiping in row subnets is needed for local reconstruction
- Requires A2 (2D extension) for full utility: with 1D only, rows are just blobs, and row subnets are just blob distribution channels

---

#### C3. Stable + rotating subnet assignment

**Description.** Nodes join k stable column subnets (for density and data retrievability) plus k rotating ones (for sampling freshness). Proposed in SubnetDAS to partially mitigate query linkability.

**Maturity: 2** (described in SubnetDAS)

**References.**
- [SubnetDAS (fradamt + Ansgar, Oct 2023)](https://ethresear.ch/t/subnetdas-an-intermediate-das-approach/17169)

**Benefits.** P8 (rotating subnets reduce the window in which an adversary can predict a node's queries), P9 (stable subnets maintain subnet density; rotating subnets provide sampling security).

**Open questions.**
- Even with rotation, the act of joining/leaving subnets (peer grafting) is visible. An adversary can track subnet transitions.
- djrtwo noted in the SubnetDAS discussion that rotation makes it harder to keep a consistent set of nodes fooled across slots.

**Cross-dependencies.**
- Requires C1 (column subnets): the subnets being rotated
- Improves H1 (subnet-based sampling): adds freshness to sample indices

---

#### C4. Row/column ID-based peer discovery

**Description.** Nodes advertise their custody rows and columns in their ENR (Ethereum Node Record). Peers can be discovered based on shared custody interests, eliminating connection delay when a node needs to find peers for a specific dimension.

**Maturity: 2** (proposed in FullDAS; ENR fields for custody groups exist in PeerDAS spec but not for row/column discovery at cell level)

**References.**
- [FullDAS (cskiraly, May 2024)](https://ethresear.ch/t/fulldas-towards-massive-scalability-with-32mb-blocks-and-beyond/19529)

**Benefits.** P4 (eliminates peer search delay at the start of dispersal), P7 (nodes can quickly find repair partners for missing dimensions).

**Open questions.**
- ENR size is limited. How many custody IDs can be advertised before hitting practical limits?
- Does advertising custody assignments in ENR worsen query linkability?

**Cross-dependencies.**
- Benefits B2 (cell-level messaging): cell-level gossip needs targeted peer connections
- Benefits E5 (cross-forwarding): nodes need to find peers in orthogonal subnets quickly

---

### Category D: overhead reduction

#### D1. Structured message IDs

**Description.** Derive GossipSub message IDs from (row, column) coordinates rather than hashing the full payload. Reduces message ID size and computation in IHAVE/IWANT exchanges.

**Maturity: 1** (proposed in FullDAS; not specified or implemented)

**References.**
- [FullDAS (cskiraly, May 2024)](https://ethresear.ch/t/fulldas-towards-massive-scalability-with-32mb-blocks-and-beyond/19529)

**Benefits.** P2 (reduces signaling overhead per cell), P4 (faster IHAVE/IWANT processing).

**Cross-dependencies.**
- Benefits B2 (cell-level messaging): critical for managing overhead at cell granularity
- Benefits D2 (bitmap-based IHAVE/IWANT): structured IDs enable bitmap compression

---

#### D2. Bitmap-based IHAVE/IWANT

**Description.** Instead of listing individual cell message IDs, use bitmaps to represent which cells a node has or wants in a given row/column. Compresses signaling overhead dramatically at high cell counts.

**Maturity: 1** (proposed in FullDAS; not specified or implemented)

**References.**
- [FullDAS (cskiraly, May 2024)](https://ethresear.ch/t/fulldas-towards-massive-scalability-with-32mb-blocks-and-beyond/19529)

**Benefits.** P2 (O(1) per row/column instead of O(n) per cell), P1 (makes cell-level messaging viable at high blob counts).

**Cross-dependencies.**
- Requires D1 (structured message IDs): bitmaps index over structured coordinates
- Benefits B2 (cell-level messaging): makes cell-level IHAVE/IWANT practical

---

#### D3. Batch KZG verification

**Description.** Verify multiple KZG cell proofs at once using amortized verification equations, rather than checking each cell proof independently. See also A5 (sender-side proofs), which ensures the proofs are available to verify.

**Maturity: 3** (research published; referenced in EIP-7594 spec; partial implementations exist)

**References.**
- [A universal verification equation for DAS (Kadianakis, Dietrichs, Feist, Aug 2022)](https://ethresear.ch/t/a-universal-verification-equation-for-data-availability-sampling/13240)
- [EIP-7594](https://eips.ethereum.org/EIPS/eip-7594)

**Benefits.** P4 (reduces per-cell verification cost), P1 (makes high cell counts computationally tractable), P15 (core technique for managing cryptographic overhead at scale).

**Open questions.**
- What is the practical batch size before diminishing returns? How does this interact with streaming cell arrival (cells don't all arrive at once)?

**Cross-dependencies.**
- Benefits B2 (cell-level messaging): critical for validating cells before forwarding
- Benefits E3 (per-row local reconstruction): need to verify recovered cells cheaply

---

### Category E: reconstruction approaches

#### E1. Supernode full-matrix reconstruction

**Description.** A node subscribes to all 128 column subnets, collects all columns, and can reconstruct any missing rows via RS decoding. Spec-defined behavior includes cross-seeding reconstructed columns back to the network.

**Maturity: 5** (implemented in Fusaka clients; Lighthouse `--subscribe-all-data-column-subnets` flag)

**References.**
- [Sigma Prime blog: PeerDAS and distributed blob building (Sep 2024)](https://blog.sigmaprime.io/peerdas-distributed-blob-building.html)
- [Prysm docs: blobs and supernodes](https://prysm.offchainlabs.com/docs/learn/concepts/blobs/)

**Benefits.** P5 (full matrix; can serve any blob via beacon API), P7 (supernodes can repair and republish any data).

**Open questions.**
- Supernode count on mainnet is uncertain. If too few supernodes exist, the network becomes dependent on a small set of well-resourced nodes. This is a centralization vector.
- Sigma Prime's tests showed supernodes consume significantly higher CL bandwidth. What is the minimum viable supernode count for network health?

**Cross-dependencies.**
- Requires B1 (column-level messaging) and C1 (column subnets): collects full columns
- Requires A1 (1D row extension): decodes rows from columns
- Enables F4 (distributed blob building): supernodes distribute the proposer's load

---

#### E1b. Desynchronized reconstruction with random delay

**Description.** To avoid correlated CPU spikes when multiple supernodes reconstruct simultaneously, the spec allows nodes to delay reconstruction using random delays. Once reconstruction yields a column, the node treats it as if it arrived from the network, updating anti-equivocation structures and publishing to mesh neighbors. This is normative spec guidance, not a separate mechanism, but it's a distinct design decision that affects timing and load distribution.

**Maturity: 3** (normative spec guidance in das-core; behavior is still implementation-tunable)

**References.**
- Fulu das-core "Reconstruction and cross-seeding" section

**Benefits.** P4 (avoids correlated CPU spikes at reconstruction time), P7 (desynchronization prevents cascading failures).

**Open questions.**
- "When to reconstruct" remains an explicit timing and anti-DoS question in the spec notes. Sigma Prime flagged a race condition where reconstruction and proof computation compete for CPU simultaneously.

**Cross-dependencies.**
- Depends on E1 (supernode reconstruction): applies to the same reconstruction process
- Benefits from E6 (getBlobs column assembly): faster local data means reconstruction can start earlier, making the random delay budget larger

---

#### E2. Semi-supernode reconstruction

**Description.** Subscribe to exactly enough columns (64 out of 128) to hit the 50% reconstruction threshold. Minimum viable setup for serving the beacon blob API.

**Maturity: 4** (Prysm `--semi-supernode` flag)

**References.**
- [Prysm docs](https://prysm.offchainlabs.com/docs/learn/concepts/blobs/)

**Benefits.** P2 (roughly half the bandwidth of a full supernode), P5 (full matrix reconstruction, just at the minimum threshold).

**Open questions.**
- At exactly 50%, any single missing column makes reconstruction fail. How sensitive is this to network conditions?

**Cross-dependencies.**
- Same as E1 but with lower bandwidth; still requires B1, C1, A1

---

#### E2b. getBlobsV2 all-or-nothing semantics (a constraint, not a feature)

**Description.** The Osaka Engine API defines `engine_getBlobsV2` as returning `null` if any requested blob is missing or unavailable. Partial availability is not surfaced. This forces CL logic that wants to build columns from EL data to require that the EL has all blobs for the block. This is a named constraint rather than a feature, because it directly limits the utility of other reconstruction approaches.

**Maturity: 5** (shipped as part of Fusaka Engine API)

**References.**
- [FullDASv2 (cskiraly, May 2025)](https://ethresear.ch/t/accelerating-blob-scaling-with-fulldasv2-with-getblobs-mempool-encoding-and-possibly-rlc/22477)

**Benefits.** P10 (simple semantics).

**Open questions.**
- This is directly identified as an inefficiency in FullDASv2: "if the EL misses just one blob, the column can't be created, and getBlobs is rendered useless." The all-or-nothing semantic is the primary motivation for getBlobsV3 (E8).

**Cross-dependencies.**
- Constrains E6 (getBlobs column assembly): partial mempool data is invisible
- Constrains E7 (getBlobs cell injection): impossible without partial responses
- Motivates E8 (getBlobs v3): the fix for this constraint

---

#### E3. Per-row local reconstruction

**Description.** A node with >50% of cells in a single row decodes the missing cells using RS. Does not require global data. Any custodying node can do it.

**Maturity: 2** (described in FullDAS and SubnetDAS; not implemented)

**References.**
- [FullDAS (cskiraly, May 2024)](https://ethresear.ch/t/fulldas-towards-massive-scalability-with-32mb-blocks-and-beyond/19529)
- [SubnetDAS discussion (fradamt, Oct 2023)](https://ethresear.ch/t/subnetdas-an-intermediate-das-approach/17169/3)

**Benefits.** P3 (any node with enough cells in one row can repair), P7 (inline repair during dispersal, not after the fact), P5 (per-row).

**Open questions.**
- With 1D extension only, a "row" is an extended blob with 2*128 = 256 cells. Getting 50% (128 cells) of one row requires custody of 128 columns for that row, which is still supernode-level. Per-row local reconstruction only becomes practical with 2D extension, where the vertical extension creates rows in the lower half of the matrix that can be recovered from partial column data.
- Alternatively, with cell-level messaging and many nodes contributing cells from different columns, can enough cells accumulate in row subnets to enable reconstruction even with 1D extension?

**Cross-dependencies.**
- Requires A2 (2D extension) for full utility (see open question above)
- Requires B2 (cell-level messaging): need cell granularity to collect partial rows
- Requires C2 (row subnets): row subnets are where partial row data accumulates
- Enables E5 (cross-forwarding): recovered cells feed column subnets

---

#### E4. Per-column local reconstruction

**Description.** Same as E3 but along the column dimension. A node with >50% of cells in a single column decodes the rest.

**Maturity: 2** (described in FullDAS)

**References.**
- [FullDAS (cskiraly, May 2024)](https://ethresear.ch/t/fulldas-towards-massive-scalability-with-32mb-blocks-and-beyond/19529)

**Benefits.** Same as E3 but for columns. P3 (per-column, not per-matrix).

**Cross-dependencies.**
- Requires A2 (2D extension): columns only have redundancy with vertical extension
- Requires B2 (cell-level messaging)
- Enables E5 (cross-forwarding)

---

#### E5. Cross-forwarding / cross-seeding

**Description.** After recovering a cell at position (row_i, col_j) via row repair, the node pushes that cell to col_j's subnet (and vice versa). Creates an availability amplification feedback loop between dimensions.

**Maturity: 2** (core concept in FullDAS; discussed in SubnetDAS discussion)

**References.**
- [FullDAS (cskiraly, May 2024)](https://ethresear.ch/t/fulldas-towards-massive-scalability-with-32mb-blocks-and-beyond/19529)
- [SubnetDAS discussion (fradamt, Oct 2023)](https://ethresear.ch/t/subnetdas-an-intermediate-das-approach/17169/3)

**Benefits.** P6 (the core amplification mechanism; row repair feeds columns, column repair feeds rows), P4 (pipelined with dispersal; cskiraly's FullDAS design has sampling lag just 1 hop behind dispersal), P3 (distributed repair without central coordinator).

**Open questions.**
- How fast does the cross-forwarding feedback loop converge? Is there a risk of oscillation or flooding?
- RLNC (A3) breaks cross-forwarding because coded pieces from one dimension don't help the other. Is this a dealbreaker for RLNC adoption?

**Cross-dependencies.**
- Requires E3 (per-row reconstruction) and/or E4 (per-column reconstruction): need to recover cells first
- Requires B2 (cell-level messaging): forwarded cells are individual cells
- Requires A2 (2D extension): cross-forwarding only makes sense with two dimensions
- Benefits from C4 (peer discovery): need to find peers in orthogonal subnets quickly

---

#### E6. getBlobs-assisted column assembly

**Description.** CL fetches complete blobs (rows) from the EL mempool via the engine API (engine_getBlobsV1/V2). If all blobs are present, full columns can be assembled without waiting for CL gossip.

**Maturity: 5** (implemented in Lighthouse and other clients; shipped with Fusaka)

**References.**
- [Sigma Prime blog (Sep 2024)](https://blog.sigmaprime.io/peerdas-distributed-blob-building.html)
- [Is data available in the EL mempool? (cskiraly)](https://ethresear.ch/t/is-data-available-in-the-el-mempool/22329)

**Benefits.** P4 (blobs often arrive in the EL mempool before the block; no waiting for CL gossip), P11 (supernodes don't need the builder to send them data).

**Open questions.**
- cskiraly's mempool analysis shows that today, with low blob counts, the public mempool is nearly complete. At scale, with sharded mempools and private blobs, completeness will drop. How gracefully does this degrade?
- The cliff effect: with column-level messaging, missing even one blob from the EL makes getBlobs useless for that column. This is the key problem that cell-level messaging (and getBlobsV3) solves.

**Cross-dependencies.**
- Requires A1 (1D row extension) or A4 (EL blob encoding): getBlobs returns rows (blobs)
- Constrained by E2b (getBlobsV2 all-or-nothing): partial mempool data is invisible
- Benefits E1 (supernode reconstruction): supernodes can reconstruct faster
- Benefits F4 (distributed blob building): supernodes fetch blobs from EL to start publishing early
- Degraded by G2 (sharded blob mempool): partial mempools reduce completeness

---

#### E7. getBlobs cell injection (FullDASv2)

**Description.** Even if the EL has only one blob, the CL can extract individual cells from that blob and push them into column subnets. Does not require all blobs to be present. Works with partial/sharded mempools.

**Maturity: 2** (described in FullDASv2; not implemented)

**References.**
- [FullDASv2 (cskiraly, May 2025)](https://ethresear.ch/t/accelerating-blob-scaling-with-fulldasv2-with-getblobs-mempool-encoding-and-possibly-rlc/22477)

**Benefits.** P12 (works with sharded mempools; even one blob is useful), P3 (any node with any blob can contribute cells), P7 (creates additional data paths beyond pure CL gossip).

**Open questions.**
- If a node is not subscribed to a column subnet, should it push the cell or just gossip its availability? cskiraly argues the latter is better (lower cost).
- Does injecting EL-sourced cells into CL gossip create validation issues? The cell needs to be verifiable against the block's KZG commitments.

**Cross-dependencies.**
- Requires B2 (cell-level messaging): need cell granularity to inject individual cells
- Requires A4 (EL blob encoding): blobs arrive pre-encoded from the mempool
- Blocked by E2b (getBlobsV2 all-or-nothing): impossible without partial responses
- Improves on E6 (getBlobs column assembly): works even when E6 fails due to incomplete mempool
- Benefits from E8 (getBlobs v3): partial responses surface which blobs are available

---

#### E8. getBlobs v3 (partial responses with null entries)

**Description.** `engine_getBlobsV3` keeps the same request format as V2 but returns an array of equal length where missing blobs are `null` at those positions. The CL learns which blobs are locally available and can exchange only missing parts with peers. Explicitly motivated by cell-level dissemination and partial-message-based reconciliation.

**Maturity: 4** (spec merged via execution-apis PR #719; multiple EL client implementations tracked; not yet required by consensus)

**References.**
- [FullDASv2 (cskiraly, May 2025)](https://ethresear.ch/t/accelerating-blob-scaling-with-fulldasv2-with-getblobs-mempool-encoding-and-possibly-rlc/22477)
- [GossipSub partial messages extension (Sep 2025)](https://ethresear.ch/t/gossipsubs-partial-messages-extension-and-cell-level-dissemination/23017)

**Benefits.** P12 (CL can exploit partial mempool availability), P7 (enables fallback reconciliation paths), P9 (enables the post-PeerDAS EL/CL integration stack).

**Open questions.**
- How do CL clients negotiate and opportunistically use V3 without breaking backwards compatibility with V2?
- How quickly do EL clients prune blobs, and does this affect the null patterns in ways that confuse the CL?

**Cross-dependencies.**
- Resolves E2b (getBlobsV2 all-or-nothing): the fix for the all-or-nothing constraint
- Enables E7 (getBlobs cell injection): partial responses surface which blobs are available for cell extraction
- Benefits B3 (GossipSub partial messages): partial EL data feeds directly into partial-message reconciliation
- Benefits from A4 (EL blob encoding): pre-encoded blobs make partial returns more useful
- Evolved by E10 (getBlobsV4): V4 takes partial responses to cell-level granularity, which is the natural interface when the EL holds cells rather than full blobs (sparse blobpool)

---

#### E9. RLNC-based full reconstruction

**Description.** Collect K linearly independent coded pieces from anywhere in the matrix. Decode all at once. No per-row/per-column partial repair.

**Maturity: 2** (analyzed in FullDASv2 and RLNC DAS alternative post)

**References.**
- [Alternative DAS concept based on RLNC (Kolotov et al., Jun 2025)](https://ethresear.ch/t/alternative-das-concept-based-on-rlnc/22651)

**Benefits.** P13 (stronger guarantees; any K pieces suffice), P3 (any node with K pieces can reconstruct, in theory).

**Open questions.**
- "Any K pieces" sounds good in theory, but in practice, how does a node accumulate K pieces? Without per-dimension structure, there's no gossip topology that naturally aggregates pieces. This can degenerate into a client-server model (FullDASv2 design no. 3).

**Cross-dependencies.**
- Requires A3 (RLNC): the coding scheme
- Conflicts with E5 (cross-forwarding): no dimensional structure to cross-forward between
- Conflicts with E3 and E4 (per-dimension reconstruction): RLNC loses partial repair

---

#### E10. getBlobsV4 (cell-level Engine API)

**Description.** `engine_getBlobsV4` extends the Engine API to cell-level granularity. Unlike V2 (all-or-nothing full blobs) and V3 (full blobs with null entries for missing ones), V4 accepts an `indices_bitarray` parameter (uint128, interpreted as a bitfield over CELLS_PER_EXT_BLOB) specifying exactly which cell indices to retrieve. Returns per-blob cell arrays with null entries for missing cells, plus corresponding KZG proofs. This is the natural Engine API counterpart to a sparse blobpool where the EL holds cells, not full blobs.

Introduced alongside `engine_blobCustodyUpdatedV1`, which lets the CL inform the EL of its current custody column set. The EL then aligns its sampling to match, and the CL can retrieve exactly those cells via getBlobsV4.

**Maturity: 2** (specified in EIP-8070; no client implementation yet)

**References.**
- [EIP-8070: Sparse Blobpool (Oct 2025)](https://eips.ethereum.org/EIPS/eip-8070)

**Benefits.** P2 (CL requests only the cells it needs, not full blobs), P9 (cell-level Engine API composes with any CL DAS scheme that operates at cell granularity), P12 (works naturally with sparse/sharded mempools where full blobs don't exist locally).

**Open questions.**
- How does V4 interact with V3? Are they alternatives (deploy one or the other) or do they coexist (V3 for full-blob scenarios, V4 for cell-level)? The EIP doesn't specify a deprecation path.
- The response includes KZG proofs per cell. With 128 cells per blob and potentially 128+ blobs, this is a large proof payload. Is proof batching across the Engine API boundary practical?
- 500ms timeout: at high blob counts with many cells, is this sufficient? The timeout is the same as V2/V3 but the response payload structure is more complex.

**Cross-dependencies.**
- Requires G4 (sparse blobpool): V4 only makes sense when the EL holds cells rather than full blobs
- Evolves E8 (getBlobsV3): V4 is the cell-level successor to V3's partial-response semantics
- Resolves E2b (getBlobsV2 all-or-nothing) more completely than V3: V4 operates at cell granularity, so even a single cell is useful
- Benefits B2 (cell-level messaging) and B3 (GossipSub partial messages): cells from V4 feed directly into cell-level CL dissemination
- Benefits E7 (getBlobs cell injection): V4 is exactly the interface that makes cell injection ergonomic

---

### Category F: publisher-side optimizations

#### F1. Batch publishing

**Description.** The block builder publishes cells in scheduled batches rather than flooding all at once. Each cell is sent once (or close to once), relying on the P2P network to amplify. Reduces GossipSub overhead at the source.

**Maturity: 2** (EthResearch post with measurements)

**References.**
- [Improving DAS performance with GossipSub batch publishing (cskiraly, Feb 2025)](https://ethresear.ch/t/improving-das-performance-with-gossipsub-batch-publishing/21713)

**Benefits.** P11 (builder sends each cell ~once instead of to multiple peers), P4 (lower latency than standard GossipSub for DAS in cskiraly's results).

**Open questions.**
- Optimal batch size and scheduling strategy as a function of network size and blob count?
- Interaction with GossipSub's eager/lazy push mechanisms?

**Cross-dependencies.**
- Benefits from B2 (cell-level messaging): batch scheduling over cells
- Complementary to F2 (PPPT): batch publishing reduces source overhead; PPPT reduces network-wide overhead

---

#### F2. Push-pull phase transition (PPPT)

**Description.** Start with push-based gossip for initial speed, then transition to pull-based (IHAVE/IWANT) once enough data is in the network. Reduces duplicate bandwidth by 2x or more without significantly increasing latency.

**Maturity: 2** (EthResearch post with measurements; related work in GossipSub v2.0)

**References.**
- [PPPT (cskiraly, Apr 2025)](https://ethresear.ch/t/pppt-fighting-the-gossipsub-overhead-with-push-pull-phase-transition/22118)
- [Doubling the blob count with GossipSub v2.0](https://ethresear.ch/t/doubling-the-blob-count-with-gossipsub-v2-0/21893)

**Benefits.** P2 (halves or better the duplicate overhead in GossipSub), P1 (frees bandwidth headroom for more blobs).

**Open questions.**
- When to trigger the phase transition? Too early = slow propagation; too late = wasted duplicates. Is this adaptive or fixed?
- How does this interact with heterogeneous node bandwidth? Low-bandwidth nodes might still be in "push" phase while high-bandwidth nodes have already transitioned.

**Cross-dependencies.**
- Complementary to F1 (batch publishing): both reduce overhead, at source and in-network respectively
- Benefits B2 (cell-level messaging): reduces the overhead that makes cell-level messaging expensive
- Independent of erasure coding scheme (works with RS or RLNC)

---

#### F3. Gradual publication (supernodes)

**Description.** After reconstruction, supernodes shuffle their columns into N chunks and publish chunk by chunk with a delay between them (e.g. 200ms between 4 chunks). Later chunks are often already propagated by other supernodes, avoiding duplicate bandwidth.

**Maturity: 4** (implemented in Lighthouse; tested on Fusaka devnets)

**References.**
- [Sigma Prime blog (Sep 2024)](https://blog.sigmaprime.io/peerdas-distributed-blob-building.html)

**Benefits.** P2 (reduces supernode outbound from ~32 MiB to much less per proposal), P4 (first chunks published immediately; natural deduplication for later chunks).

**Cross-dependencies.**
- Requires E1 (supernode reconstruction): only supernodes publish all columns
- Benefits from E6 (getBlobs column assembly): faster reconstruction means earlier publication start

---

#### F4. Distributed blob building

**Description.** Multiple supernodes retrieve blobs from the EL, compute KZG cell proofs, and publish data columns, distributing the proposer's computation and bandwidth burden. The proposer only needs to publish the block; supernodes handle the blob data.

**Maturity: 4** (implemented in Lighthouse; tested on Fusaka devnets)

**References.**
- [Sigma Prime blog (Sep 2024)](https://blog.sigmaprime.io/peerdas-distributed-blob-building.html)

**Benefits.** P11 (proposer doesn't need to compute proofs or publish all columns), P3 (partial; reduces dependency on the proposer's bandwidth, though still depends on supernodes).

**Open questions.**
- Race condition: reconstruction and proof computation can happen simultaneously, competing for CPU. Sigma Prime flagged this in their tests.
- How many supernodes are needed for this to work reliably?

**Cross-dependencies.**
- Requires E1 (supernode reconstruction): supernodes do the heavy lifting
- Requires E6 (getBlobs column assembly): supernodes fetch blobs from EL
- Benefits from F5 (block header-first propagation): earlier block arrival means earlier supernode action

---

#### F5. Block header-first propagation

**Description.** Gossip block headers (with KZG commitments) on a separate fast topic before the full block. Lets supernodes and other nodes start proof computation, blob fetching, and cell validation earlier.

**Maturity: 2** (proposed by Dankrad; discussed in context of distributed blob building)

**References.**
- Discussed in [Sigma Prime blog (Sep 2024)](https://blog.sigmaprime.io/peerdas-distributed-blob-building.html) referencing Dankrad's proposal

**Benefits.** P4 (decouples header propagation from data propagation), P11 (supernodes can start working before the full block arrives).

**Open questions.**
- New gossip topic means new infrastructure. Worth the complexity?
- How do you prevent header-only spam (headers without corresponding data)?

**Cross-dependencies.**
- Benefits F4 (distributed blob building): earlier start for supernodes
- Benefits D3 (batch verification): nodes can prepare verification contexts from commitments before cells arrive
- Benefits B2 (cell-level messaging): cells can be validated as soon as commitments are known

---

### Category G: mempool-side techniques

#### G1. EL mempool pre-seeding

**Description.** Blobs arrive at the EL via devp2p announce/fetch gossip before the block is proposed. This is "free" bandwidth from the builder's perspective since they aren't the original source of the blob. The CL can then use getBlobs to leverage this pre-existing data.

**Maturity: 5** (this is how blob transactions work on mainnet today)

**References.**
- [Is data available in the EL mempool? (cskiraly)](https://ethresear.ch/t/is-data-available-in-the-el-mempool/22329)

**Benefits.** P11 (builder bandwidth is zero for public blobs already in the mempool), P4 (data is pre-positioned before the slot even starts).

**Open questions.**
- cskiraly's analysis shows ~11 KiB/s per blob per node. At 128 blobs, that's ~1.4 MiB/s. Is this sustainable for home stakers?
- Private blobs (from MEV builders' private tx feeds) bypass the public mempool entirely. As private blob share increases, pre-seeding effectiveness decreases.

**Cross-dependencies.**
- Enables E6 (getBlobs column assembly): pre-seeded blobs are what getBlobs retrieves
- Enables E7 (getBlobs cell injection): even partial pre-seeding helps with cell injection
- Degraded by private blob transactions
- G4 (sparse blobpool) transforms this atom: with sparse blobpool, pre-seeding becomes cell-level rather than full-blob, and custody alignment ensures the pre-seeded cells are the ones the CL needs

---

#### G2. Sharded blob mempool

**Description.** EL nodes subscribe to a subset of mempool shards rather than the full blob pool. Reduces per-node EL bandwidth at the cost of no single node having all blobs.

**Maturity: 2** (EthResearch post with design; EIP-8077 for nonce-gap handling)

**References.**
- [A new design for DAS and sharded blob mempools (Jun 2025)](https://ethresear.ch/t/a-new-design-for-das-and-sharded-blob-mempools/22537)
- [EIP-8077 nonce gap simulation (Dec 2025)](https://ethresear.ch/t/eip-8077-nonce-gap-simulation-report/23687)

**Benefits.** P2 (EL nodes only download a fraction of blobs), P1 (removes EL bandwidth as a scaling bottleneck).

**Open questions.**
- Nonce gaps: when blob txs from the same sender land in different shards, nodes see non-sequential nonces. EIP-8077 proposes adding sender address and nonce to tx announcements to mitigate this. Simulation results show up to ~36% of blob txs affected in worst-case scenarios.
- How do you define shard boundaries? By blob index? By sender? By hash?
- Block builders need access to blobs across all shards to compose blocks. Does this recreate the supernode problem at the EL layer?

**Cross-dependencies.**
- Requires E7 (getBlobs cell injection): with a sharded mempool, no single EL node has all blobs, so cell injection is the only way to leverage partial data
- Requires B2 (cell-level messaging): column-level messaging can't use partial mempool data
- Benefits from E8 (getBlobs v3): partial responses let the CL use partial data as it arrives
- Requires EIP-8077 or equivalent for nonce-gap handling
- Alternative: G4 (sparse blobpool) achieves ~4x bandwidth reduction without deterministic sharding, avoiding the nonce-gap problem entirely. G2 and G4 address the same bottleneck (EL blobpool bandwidth) with different tradeoffs: G4 is simpler but provides less bandwidth reduction at very high blob counts; G2 is more aggressive but introduces nonce gaps and requires EIP-8077

---

#### G3. EC-aware mempool

**Description.** The mempool natively understands erasure coding, enabling EC-based sampling and reconstruction at the EL layer itself. Blurs the EL/CL boundary for data availability.

**Maturity: 1** (briefly mentioned in FullDASv2 as a future possibility)

**References.**
- [FullDASv2 (cskiraly, May 2025)](https://ethresear.ch/t/accelerating-blob-scaling-with-fulldasv2-with-getblobs-mempool-encoding-and-possibly-rlc/22477)

**Benefits.** P12 (mempool itself can verify and repair data), P1 (enables "vertical sharding" at the mempool level).

**Open questions.**
- This is a radical change to the EL. What are the implications for the EL/CL separation?
- Does this require consensus changes or can it be purely at the networking layer?

**Cross-dependencies.**
- Requires A4 (EL blob encoding): blobs must arrive pre-encoded
- Requires G2 (sharded blob mempool): sharding is what creates the need for EC awareness
- Enables E7 (getBlobs cell injection): mempool can serve cells, not just blobs

---

#### G4. Sparse blobpool (EIP-8070)

**Description.** Introduces custody-aligned probabilistic sampling at the EL blobpool layer, replacing full replication of blob data. For each new type 3 (blob-carrying) transaction, a node fetches the full blob payload with probability p=0.15 ("provider role") and otherwise samples only its CL-aligned custody columns ("sampler role"). Samplers fetch as few as 8/128 cells per blob, yielding an average bandwidth reduction of ~4x compared to today's full blobpool (0.15 + 0.85/8 ~ 0.25).

Key design choices: (a) the EL sampling is aligned with the CL custody set, so sampled cells satisfy both EL and CL needs, preserving getBlobs utility; (b) providers form a stochastic backbone (at p=0.15 with mesh degree 50, there is 98.6% probability of at least 3 provider peers and only 0.03% chance of total unavailability); (c) sampling noise (requesting at least one random extra column per provider request) defends against targeted withholding by peers pretending to be providers.

Introduces devp2p eth/71 with: modified NewPooledTransactionHashes carrying a cell_mask bitfield, modified GetPooledTransactions that elides blob payloads for type 3 txs, and new GetCells/Cells messages for cell-level requests. Also introduces engine_blobCustodyUpdatedV1 (CL informs EL of custody set) and engine_getBlobsV4 (cell-level Engine API with indices bitarray). See E10.

**Maturity: 2** (draft EIP with mathematical reliability framework, Fusaka devnet bandwidth measurements motivating the design, but no client implementation yet)

**References.**
- [EIP-8070: Sparse Blobpool (Oct 2025)](https://eips.ethereum.org/EIPS/eip-8070)
- [EthMagicians discussion](https://ethereum-magicians.org/t/eip-8070-sparse-blobpool/26023)

**Benefits.** P2 (4x average bandwidth reduction for EL blobpool; at Fusaka devnet blob counts, EL bandwidth is 4-5x CL bandwidth, so this is the dominant bottleneck), P4 (preserves pre-propagation over the full slot, keeping blob data off the critical path), P9 (custody alignment means EL sampling composes with any CL DAS scheme; the CL can still use getBlobs to satisfy its custody needs from EL-sampled data), P10 (preserves the unstructured stochastic nature of the current blobpool rather than introducing complex sharding; devp2p changes are incremental), P14 (no consensus rule changes; new devp2p version eth/71 can coexist with eth/70 during rollout).

**Open questions.**
- The cell_mask in NewPooledTransactionHashes applies uniformly to all type 3 txs in the message. This means a node cannot signal different availability for different txs in one announcement. The EIP acknowledges this limitation and proposes splitting announcements. Is this practical at high tx rates?
- The provider/sampler decision is probabilistic per-tx. Nodes may use stateless heuristics (hash of tx properties + time-bound value) to make the decision deterministic over a window. What is the attack surface if an adversary can predict a node's provider/sampler decisions?
- Supernode behavior: supernodes must load-balance across peers and reconstruct from 64 columns. The EIP recommends larger peersets for supernodes. Does this create a fingerprinting vector (supernodes are identifiable by their larger peerset and request patterns)?
- Block builder inclusion policies: the EIP defines conservative (full local availability), optimistic (sampled blobs OK), and proactive (resample before proposal). The optimistic policy means a builder could include a blob that is not fully available locally, relying on network-wide availability. What is the failure rate? The secondary reliability table shows >99.99% reconstruction probability with 47+ sampler peers, but this assumes honest peers.
- RBF impact is listed as an open point. If a blob tx is replaced-by-fee, does the replacement inherit the provider/sampler decision? If not, the same blob data may be fetched twice.
- The sampling noise mechanism (request C_extra=1 random extra column) is simple but adds ~12 KiB overhead per request. At high blob counts with many requests, does this overhead become material?

**Cross-dependencies.**
- Alternative to G2 (sharded blob mempool): both reduce EL blobpool bandwidth, but G4 is simpler (probabilistic sparse replication vs deterministic sharding) and avoids the nonce-gap problem that G2 creates
- Benefits E6 (getBlobs column assembly): custody-aligned sampling means sampled cells are exactly what the CL needs; getBlobs remains useful even with a sparse blobpool
- Enables E10 (getBlobsV4): the cell-level Engine API that lets the CL request specific cells from the EL
- Benefits from A5 (sender-side cell proofs): cells arriving pre-proven means EL nodes can validate sampled cells without the full blob
- Requires EIP-7594 (PeerDAS): custody set alignment requires the CL custody assignment to exist
- Requires EIP-7870: bandwidth accounting framework that EIP-8070 is designed to stay within
- Partially addresses the problem that motivates E7 (getBlobs cell injection): with a sparse blobpool, the EL naturally holds cells (not full blobs), so cell-level interaction with the CL becomes the default rather than a special case

---

### Category H: security and sampling techniques

#### H1. Subnet-based sampling

**Description.** Nodes get their samples by subscribing to column subnets. Sample = column. Queries are linkable (subnet membership is visible).

**Maturity: 5** (PeerDAS on Fusaka mainnet; SubnetDAS proposed the same mechanism)

**References.**
- [EIP-7594](https://eips.ethereum.org/EIPS/eip-7594)
- [SubnetDAS (Oct 2023)](https://ethresear.ch/t/subnetdas-an-intermediate-das-approach/17169)

**Benefits.** P10 (simple; reuses existing subnet infrastructure), P9 (every DAS proposal uses this).

**Open questions.**
- Linkability: an adversary can observe which subnets a node joins and only publish data for those subnets, convincing that node of availability while withholding the rest. SubnetDAS's security analysis bounds the fraction of foolable nodes at 5-10% for 2000-10000 nodes.

**Cross-dependencies.**
- Requires C1 (column subnets)
- Can be augmented by H2 (peer-based sampling) for stronger confirmation

---

#### H2. Peer-based sampling (req/resp)

**Description.** Request specific cells from random peers via req/resp protocol, not via subnet membership. Partially mitigates query linkability because queries go to individual peers rather than being broadcast via subnet joins.

**Maturity: 3** (PeerDAS spec includes req/resp for column requests; used for catch-up)

**References.**
- [EIP-7594](https://eips.ethereum.org/EIPS/eip-7594)
- [PeerDAS original post (Sep 2023)](https://ethresear.ch/t/peerdas-a-simpler-das-approach-using-battle-tested-p2p-components/16541)

**Benefits.** P8 (better than subnet-based; queries are one-to-one), P13 (randomized peer selection makes targeted withholding harder).

**Open questions.**
- If used as the primary sampling mechanism, it creates liveness concerns: if queried peers are offline or malicious, the node can't confirm availability. SubnetDAS and fradamt's analysis suggest using peer sampling only for the confirmation rule, not fork choice.

**Cross-dependencies.**
- Complementary to H1 (subnet-based sampling): use subnet-based for fork choice, peer-based for confirmation
- Enables H5 (confirmation rule layering)

---

#### H3. LossyDAS (adaptive/incremental sampling)

**Description.** Tolerate some missed samples and adaptively increase sampling effort. Instead of requiring all k samples to succeed, allow a few failures and adjust the security model accordingly.

**Maturity: 2** (EthResearch post with analysis)

**References.**
- [LossyDAS (cskiraly et al., Mar 2024)](https://ethresear.ch/t/lossydas-lossy-incremental-and-diagonal-sampling-for-data-availability/18963)

**Benefits.** P4 (nodes don't stall waiting for slow/missing samples), P13 (adaptive; can increase sample count if initial samples seem suspicious).

**Open questions.**
- fradamt's analysis in the SubnetDAS discussion shows that tolerating multiple misses requires significantly more total samples. With t tolerated misses, the failure probability blows up to sum(C(k,i) * 2^{-k}, i=0..t). Is the bandwidth tradeoff worth it?

**Cross-dependencies.**
- Benefits H1 (subnet-based sampling) and H2 (peer-based sampling): adds robustness to either
- Independent of erasure coding scheme

---

#### H4. Local randomness for sampling

**Description.** Derive sample indices from local entropy (e.g. VRF output) so an adversary can't predict which cells a node will request next.

**Maturity: 2** (described in FullDAS)

**References.**
- [FullDAS (cskiraly, May 2024)](https://ethresear.ch/t/fulldas-towards-massive-scalability-with-32mb-blocks-and-beyond/19529)

**Benefits.** P13 (adversary can't pre-position data for predicted queries), P8 (even if the adversary sees the query, they couldn't have prepared for it).

**Cross-dependencies.**
- Benefits H2 (peer-based sampling): unpredictable queries to random peers
- Independent of subnet topology

---

#### H5. Confirmation rule layering

**Description.** Use subnet-based DAS for fork choice (weaker but liveness-safe) and peer-based DAS only for transaction confirmation (stronger but liveness-sensitive). A liveness failure of the peer sampling layer doesn't affect consensus.

**Maturity: 2** (analyzed in SubnetDAS; referenced in DAS fork-choice post)

**References.**
- [SubnetDAS (Oct 2023)](https://ethresear.ch/t/subnetdas-an-intermediate-das-approach/17169)
- [DAS fork-choice (fradamt et al., May 2024)](https://ethresear.ch/t/das-fork-choice/19578)

**Benefits.** P8 (peer sampling confirmation provides individual safety), P10 (subnet-based fork choice is simpler and more robust; peer sampling is optional/additional).

**Open questions.**
- What is the latency overhead of the confirmation rule? If peer sampling takes longer, transaction confirmation is delayed.
- Can the confirmation rule be optional per-node? fradamt suggests yes.

**Cross-dependencies.**
- Requires H1 (subnet-based sampling) for fork choice
- Requires H2 (peer-based sampling) for confirmation
- Analyzed in the context of SubnetDAS but applicable to any DAS scheme

---

### Category I: propagation scheduling (blob streaming)

The atoms in this category come from the blob streaming proposal (QED, fradamt, Julian, Feb 2026). They operate at a different level than categories A-H: they restructure *when* and *by whom* blob data enters the propagation pipeline, and how availability is recorded and consumed. They do not replace any DAS mechanism; the DAS infrastructure (columns, cells, subnets, reconstruction) is used identically. The value is in bandwidth smoothing, global propagation allocation, censorship resistance for blob txs, and mitigation of the free option problem.

The proposal explicitly positions itself as an alternative to blobpool sampling mechanisms (EIP-8070 sparse blobpool, horizontal sharding) for scaling throughput, while additionally providing censorship resistance guarantees that those mechanisms cannot.

#### I1. Blob tickets (CL-side propagation rights)

**Description.** A ticket system grants the right to propagate a blob through the CL sampling infrastructure. Tickets are acquired by interacting with an on-chain ticket contract. Each ticket grants two independent rights: (a) propagate one blob on the CL, and (b) propagate multiple blob txs (e.g. up to 16) on the EL mempool. The CL and EL track ticket usage separately. Tickets can potentially be purchased for future slots (slot N+k).

This differs from "blobpool tickets" (which only control access to EL mempool propagation) in two ways: propagation moves to the CL (reusing DAS infrastructure that would otherwise need to be duplicated on the EL), and a ticket is all that users need to get an AOT blob included (no separate blob basefee at inclusion time). The ticket purchase is where the scarce bandwidth resource is paid for.

Because blobpool admission is now controlled by pre-paid tickets rather than validity checks, sampling can be safely layered on top: nodes no longer need to verify full blob availability to decide whether to propagate a transaction. This is the key insight that lets the proposal extend the sampling window to the full slot.

**Maturity: 1** (ethresear.ch post with mechanism design; no spec or implementation)

**References.**
- [Scaling the DA layer with blob streaming (QED, fradamt, Julian, Feb 2026)](https://ethresear.ch/t/scaling-the-da-layer-with-blob-streaming/24202)
- [Blob mempool tickets](https://hackmd.io/PnHbLie4Tm6vz-3-fVD2MA#Blob-mempool-tickets)
- [On the future of the blob mempool](https://ethresear.ch/t/on-the-future-of-the-blob-mempool/22613)
- [Variants of mempool tickets](https://ethresear.ch/t/variants-of-mempool-tickets/23338)

**Benefits.** P4 (propagation moves off the critical path; bandwidth spreads over the full slot), P2 (smoother bandwidth consumption avoids spikes; effective pre-propagation approaches steady-state capacity), P7 (ticket-based rate-limiting bounds propagation load, providing DoS resistance and consistent node views), P12 (explicit global allocation prevents uncontrolled mempool fragmentation).

**Open questions.**
- Forward ticket purchasing (slot N+k) is left as an open question. How far ahead should tickets be purchasable? This creates a futures market for blob space with potential for speculation and hoarding.
- How does the ticket market interact with MEV? Builders who observe ticket auctions can front-run demand or buy tickets to control propagation priority.
- Tying blob tx propagation to tickets loosens mempool rules (same address can queue many blob txs). Does this create new spam vectors?

**Cross-dependencies.**
- Benefits from all DAS dissemination atoms (B1-B4, C1-C2): blob data pushed via tickets uses the same column/cell subnet infrastructure
- Benefits from F1 (batch publishing) and F2 (PPPT): pre-propagated blobs can use optimized dissemination since they're not time-constrained
- Partially replaces G1 (EL mempool pre-seeding): CL-side ticket-based propagation is an in-protocol alternative to out-of-protocol blobpool pre-seeding
- Alternative to G4 (sparse blobpool): both address EL blobpool bandwidth, but through fundamentally different means. G4 keeps pre-propagation on the EL with probabilistic sampling; I1 moves pre-propagation to the CL entirely. G4 is simpler and deployable without consensus changes; I1 is more ambitious and additionally provides censorship resistance
- Enables I2 (DA contract): tickets create the propagation flow; the DA contract records the result
- Enables I3 (JIT/AOT payload split): the two-lane architecture

---

#### I2. DA contract (on-chain availability recording)

**Description.** A system contract that records which blobs are available, queryable both within the EVM and by nodes (for mempool validation and FOCIL participation). At the start of each block, a system call records the versioned hashes from the payload into the contract. Implemented as a ring buffer over a recent window (~128 blocks, ~16,384 entries at 128 blobs/block), providing O(1) proof-free lookups. Beyond the window, users prove inclusion against a `versioned_hashes_root` in the block header.

The key architectural shift: availability becomes a recorded, persistent fact. Once recorded, a blob tx referencing those versioned hashes becomes equivalent to a regular transaction for mempool and inclusion purposes. Checking the DA contract for current-block versioned hashes is cheap (warm read, since hashes were written at block start).

**Maturity: 1** (ethresear.ch post with pseudocode contract design; no EIP or implementation)

**References.**
- [Scaling the DA layer with blob streaming (Feb 2026)](https://ethresear.ch/t/scaling-the-da-layer-with-blob-streaming/24202)

**Benefits.** P7 (blob txs survive mempool eviction; resubmission needs no ticket), P12 (decouples blob tx validity from real-time availability), P9 (recorded availability composes with future DAS upgrades; the contract is scheme-agnostic).

**Open questions.**
- Storage growth: bounded by ring buffer, but the system call writing 128 versioned hashes per block has a gas cost. Is this acceptable overhead?
- Reorg handling: if block N records availability but is reorged out, any blob tx in block N+1 relying on that recording fails. Not addressed in the proposal.
- The 128-block window covers typical rollup needs, but some L2 challenge periods are longer. Is the proof-based fallback (against `versioned_hashes_root`) sufficient?
- Since the DA contract is queryable within the EVM, regular txs can condition logic on blob availability. This is a new primitive. What use cases and attack surfaces does it open?

**Cross-dependencies.**
- Requires I1 (blob tickets): the DA contract records availability of blobs propagated via tickets
- Enables I4 (PTC blob inclusion enforcement): PTC-mandated versioned hashes are recorded here
- Enables I3 (JIT/AOT payload split): async versioned hashes reference blobs whose availability was previously recorded
- Interacts with E2b (getBlobsV2 all-or-nothing): once availability is recorded, the CL no longer needs real-time getBlobs checks for those blobs

---

#### I3. JIT/AOT payload split (dual versioned hash lists)

**Description.** The block payload contains two lists of versioned hashes: `jit_versioned_hashes` (blobs the builder commits to just-in-time, propagated during the critical path, spot-priced via blob basefee) and `aot_versioned_hashes` (blobs pre-propagated via tickets, now asserted as available, already paid for at ticket purchase). Both lists condition payload validity on availability. JIT blobs correspond to today's private blobs; there is no blobpool pre-propagation for them.

Capacity is governed by three parameters: B_1 (JIT max, bounded by critical-path duration and free option tolerance), B_2 (total JIT+AOT max, bounded by network propagation budget over a full slot), and R (reserved JIT capacity, protected from AOT usage). If `a` AOT blobs are scheduled for a slot, up to min(B_1, B_2-a) JIT blobs can be included, guaranteeing at least R JIT slots.

AOT pricing uses an EIP-1559-style controller: base fee bf^AOT adjusts per-slot based on ticket demand vs AOT target. JIT blob basefee is set equal to bf^AOT. In overdemand, tickets are allocated by decreasing bid-per-ticket, with excess tickets rolling to the next slot.

**Maturity: 1** (ethresear.ch post; no consensus spec changes drafted)

**References.**
- [Scaling the DA layer with blob streaming (Feb 2026)](https://ethresear.ch/t/scaling-the-da-layer-with-blob-streaming/24202)

**Benefits.** P1 (total throughput increases: AOT uses bandwidth outside the critical path that is currently wasted), P4 (JIT retains today's critical-path properties; AOT doesn't compete for the same window; smaller critical path mitigates free option problem), P11 (builder only propagates JIT blobs; AOT propagation is distributed across ticket holders).

**Open questions.**
- The R parameter (reserved JIT capacity) is the most sensitive design choice. Too low risks underserving L1's JIT needs (blocks-in-blobs); too high forces AOT users through builders, losing CR guarantees.
- JIT blobs correspond to today's private blobs. Users must communicate directly with builders. Does this entrench builder centralization for JIT blob users?
- The capacity rollover mechanism (excess ticket demand rolls to next slot) creates complex dynamics. Under sustained overdemand, tickets queue up, creating backpressure that interacts with the EIP-1559 controller.
- L1-as-rollup (blocks-in-blobs with zkEVM) requires JIT blobs because L1 txs come from many independent users. What fraction of B_2 will L1 consume?

**Cross-dependencies.**
- Requires I1 (blob tickets): AOT blobs need tickets for pre-propagation
- Requires I2 (DA contract): AOT versioned hashes reference blobs whose availability was previously recorded
- Interacts with all critical-path atoms (F1-F5): JIT blobs use the same propagation pipeline as today
- Interacts with E6 (getBlobs column assembly): for JIT blobs, getBlobs is irrelevant (private blobs go directly to builders); for AOT blobs, data is already in the CL from ticket-authorized propagation

---

#### I4. PTC blob inclusion enforcement (censorship resistance)

**Description.** PTC (Payload Timeliness Committee) members observe which blobs have been propagated by a deadline, sample them, and vote on availability. A majority vote determines which versioned hashes the proposer *must* include in the payload. Proposer can include additional blobs but cannot exclude PTC-required ones. Attesters enforce this unless they locally don't see those blobs as available (safety override). Each ticket can be seen as granting the role of inclusion list proposer for a single blob.

This provides end-to-end censorship resistance for blob txs: PTC enforces blob inclusion (availability recording in DA contract), while FOCIL enforces blob tx inclusion (execution). JIT blobs cannot benefit from PTC guarantees (they propagate at/after block construction time). A blob that fails JIT inclusion can always be resubmitted as AOT, gaining full CR.

**Maturity: 1** (ethresear.ch post; depends on FOCIL, EIP-7805, itself not yet shipped)

**References.**
- [Scaling the DA layer with blob streaming (Feb 2026)](https://ethresear.ch/t/scaling-the-da-layer-with-blob-streaming/24202)
- [EIP-7805: FOCIL](https://eips.ethereum.org/EIPS/eip-7805)

**Benefits.** P13 (PTC prevents builders from selectively withholding blob availability recording), P7 (even if a builder censors a blob tx, availability is still recorded and the tx can be force-included via FOCIL).

**Open questions.**
- PTC committee size and selection mechanism are unspecified. What is the minimum committee size for security?
- The safety override (attesters don't enforce PTC if they locally don't see availability) is critical but creates an attack surface: selective partitioning could split the vote.
- JIT blobs have strictly weaker CR than AOT. Is this acceptable for L1-as-rollup?

**Cross-dependencies.**
- Requires I2 (DA contract): PTC-mandated versioned hashes are recorded here
- Requires I1 (blob tickets): only ticketed blobs propagate before the PTC deadline
- Requires FOCIL (EIP-7805): end-to-end CR depends on FOCIL for blob tx inclusion
- Structurally similar to H5 (confirmation rule layering): PTC is a new layer in the confirmation stack

---

## 3. Composite proposals

### EIP-4844 (Proto-Danksharding) (baseline)

**Atoms used:** A1, G1

**Description.** Every node downloads every blob. No sampling, no reconstruction needed. 3-6 blobs per slot.

**Maturity: 5** (mainnet since Dencun, Mar 2024)

**Reference:** [EIP-4844](https://eips.ethereum.org/EIPS/eip-4844)

---

### PeerDAS (EIP-7594) (Fusaka)

**Atoms used:** A1, A4, A5, B1, C1, E1, E1b, E2, E2b, E6, F3, F4, G1, H1, H2

**Description.** 1D RS extension. Column-level messaging on column subnets. Sender-side cell proofs. Supernodes and semi-supernodes reconstruct with desynchronized timing. getBlobs from EL (V2, all-or-nothing). Distributed blob building via supernodes. Gradual publication. Subnet-based sampling with peer-based req/resp for catch-up.

**Maturity: 5** (Fusaka mainnet)

**Reference:** [EIP-7594](https://eips.ethereum.org/EIPS/eip-7594), [Sigma Prime blog](https://blog.sigmaprime.io/peerdas-distributed-blob-building.html)

**Key limitations.** Supernode dependent for reconstruction. Column-level messaging creates cliff effect with getBlobs. No per-row/per-column local reconstruction. getBlobsV2 all-or-nothing hides partial mempool availability. EL blobpool fully replicates all blobs, consuming 4-5x the bandwidth of the CL at Fusaka devnet blob counts; the sparse blobpool (G4) is the most direct near-term fix.

---

### SubnetDAS (fradamt + Ansgar, Oct 2023)

**Atoms used:** A1, B1 (columns) + B2 (cells in row subnets for reconstruction), C1, C2, C3, E3, E5, H1, H5

**Description.** 1D RS extension. Column subnets for sampling. Row subnets for blob distribution (validators only). Stable + rotating subnet assignment. Local reconstruction in row subnets with cross-seeding. Confirmation rule layering proposed as optional enhancement. Explicit security analysis bounding foolable nodes at 5-10%.

**Maturity: 2** (EthResearch post with security analysis; not implemented)

**Reference:** [SubnetDAS](https://ethresear.ch/t/subnetdas-an-intermediate-das-approach/17169)

**Key limitations.** Linkable queries (accepted as tradeoff). Row subnets are only for validators. 1D extension limits per-row reconstruction utility.

---

### FullDAS (cskiraly, May 2024)

**Atoms used:** A1, A2, A5, B2, C1, C2, C4, D1, D2, D3, E3, E4, E5, F1, F2, H1, H3, H4

**Description.** 2D RS extension. Cell-level messaging. Row and column subnets. Pipelined dispersal-to-custody and sampling-from-custody phases. Per-row and per-column local reconstruction with cross-forwarding. Batch publishing. PPPT. Bitmap-based signaling. LossyDAS. Local randomness for sampling. Row/column ID-based peer discovery.

**Maturity: 2** (comprehensive EthResearch post; some components simulated; batch publishing and in-network repair partially implemented in clients)

**Reference:** [FullDAS](https://ethresear.ch/t/fulldas-towards-massive-scalability-with-32mb-blocks-and-beyond/19529)

**Key limitations.** Many interdependent components. Cell-level messaging overhead is the primary bottleneck concern. 2D extension adds builder computation.

---

### FullDASv2 (cskiraly, May 2025)

**Atoms used:** all FullDAS atoms + A4, E6, E7, E8, A3 (explored), G3 (sketched)

**Description.** Extends FullDAS with getBlobs integration (including cell injection from partial mempools), EL blob encoding, proposed getBlobs v3 streaming interface. Analyzes RLNC as an alternative/complement to RS. Discusses EC-aware mempools as a future direction.

**Maturity: 2** (EthResearch post with detailed analysis)

**Reference:** [FullDASv2](https://ethresear.ch/t/accelerating-blob-scaling-with-fulldasv2-with-getblobs-mempool-encoding-and-possibly-rlc/22477)

**Key additions over FullDAS.** getBlobs cell injection solves the cliff effect. EL blob encoding offloads builder computation. RLNC analysis maps the full design space of coding alternatives.

---

### Distributed blob building (Lighthouse/Sigma Prime, Sep 2024)

**Atoms used:** E1, E6, F3, F4, F5

**Description.** An optimization within PeerDAS where supernodes fetch blobs from the EL, compute proofs, and publish columns, relieving the block proposer. Includes gradual publication to reduce duplicate bandwidth.

**Maturity: 4** (implemented in Lighthouse; tested on devnets)

**Reference:** [Sigma Prime blog](https://blog.sigmaprime.io/peerdas-distributed-blob-building.html)

---

### RLNC-based DAS (Kolotov et al., Jun 2025)

**Atoms used:** A3 (A3b specifically), E9

**Description.** Replaces RS with RLNC coding and Pedersen commitments (instead of KZG). Stronger probabilistic guarantees against withholding. Trades off per-dimension repair and cross-forwarding.

**Maturity: 2** (EthResearch post with theoretical analysis)

**Reference:** [Alternative DAS concept based on RLNC](https://ethresear.ch/t/alternative-das-concept-based-on-rlnc/22651)

**Key limitations.** Loses cross-forwarding (E5). Loses per-dimension local reconstruction (E3, E4). Unclear how P2P redistribution works without dimensional structure.

---

### Sharded blob mempool DAS (Jun 2025)

**Atoms used:** G2, G3, A4, E7, B2

**Description.** Pushes erasure coding into the mempool. Nodes subscribe to mempool shards. DAS matrix construction draws from sharded, partial mempool data. Couples with cell-level CL messaging.

**Maturity: 2** (EthResearch post)

**Reference:** [A new design for DAS and sharded blob mempools](https://ethresear.ch/t/a-new-design-for-das-and-sharded-blob-mempools/22537)

**Key limitations.** Radical redesign of EL/CL interaction. Nonce gap problem (EIP-8077). Builder access to cross-shard blobs.

---

### GossipSub partial messages extension (Sep 2025)

**Atoms used:** B3 (wraps B2 into backwards-compatible upgrade), D1, D2 (partial overlap via bitmap addressing)

**Description.** A GossipSub-level extension allowing cell-level dissemination within existing column topics without a hard fork. Draft libp2p spec, draft consensus-spec PR, and devnet PoC.

**Maturity: 3** (detailed post, draft specs, PoC)

**Reference:** [GossipSub partial messages extension](https://ethresear.ch/t/gossipsubs-partial-messages-extension-and-cell-level-dissemination/23017)

---

### Sparse blobpool (EIP-8070, Oct 2025)

**Atoms used:** G4, E10, A5 (sender-side proofs enable per-cell validation), G1 (pre-seeding, now at cell granularity)

**Also requires (from outside v2 scope):** EIP-7594 (PeerDAS custody set), EIP-7870 (bandwidth accounting)

**Description.** Replaces full replication in the EL blobpool with probabilistic custody-aligned sampling. Nodes fetch full blob payloads with p=0.15 and sample custody-aligned cells otherwise. Introduces devp2p eth/71 with cell_mask signaling, GetCells/Cells messages, and Engine API extensions (blobCustodyUpdatedV1, getBlobsV4). Designed to be deployable without consensus changes.

**Maturity: 2** (draft EIP with mathematical reliability framework and Fusaka devnet bandwidth measurements, but no client implementation)

**Reference:** [EIP-8070](https://eips.ethereum.org/EIPS/eip-8070)

**Key properties.** ~4x EL bandwidth reduction. Preserves getBlobs utility via custody alignment. No nonce-gap problem (unlike G2). Backwards-compatible devp2p rollout. Does not require consensus changes.

**Key limitations.** Provider backbone is probabilistic (0.03% total unavailability). Builder inclusion policies for sampled-only blobs are not battle-tested. The 4x reduction may be insufficient at very high blob counts where G2's more aggressive sharding is needed. Supernode behavior at the EL layer is underspecified.

---

### Blob streaming (QED, fradamt, Julian, Feb 2026)

**Atoms used (from this document):** I1, I2, I3, I4, plus all CL DAS atoms from whichever DAS scheme is active (A1/A2, B1-B3, C1, H1, H2)

**Also requires:** FOCIL (EIP-7805)

**Description.** Enshrines AOT (ahead-of-time) blob propagation as a first-class CL mechanism alongside a spot-priced JIT (just-in-time) lane. Users buy tickets to propagate blobs before the critical path; the CL sampling infrastructure handles AOT dissemination. A DA contract records availability on-chain, enabling blob txs to propagate as regular txs after recording. PTC enforces inclusion of propagated blobs. Capacity governed by three parameters (B_1 JIT max, B_2 total max, R reserved JIT). EIP-1559-style pricing for AOT tickets. JIT blobs correspond to today's private blobs.

**Maturity: 1** (ethresear.ch post with mechanism design and pricing framework; depends on FOCIL which is not yet shipped)

**Reference:** [Scaling the DA layer with blob streaming](https://ethresear.ch/t/scaling-the-da-layer-with-blob-streaming/24202)

**Key properties.** Throughput scales because AOT uses bandwidth outside the critical path. End-to-end CR for blob txs via PTC + FOCIL + DA contract. Smaller critical path mitigates free option problem. Ticket-based rate-limiting provides DoS resistance. Forward ticket purchasing enables L2 cost planning.

**Key limitations.** Maturity 1: no spec, no implementation, depends on unshipped FOCIL. JIT blobs have weaker CR than AOT. Capacity split (R parameter) is a fundamental design choice with no proposed adaptive mechanism. JIT blobs require direct builder communication (no blobpool path), which may entrench builder centralization. PTC committee design is unspecified. The full system is complex: new system contract, new auction, new committee role, dual payload lists, EIP-1559 controller for ticket pricing.

**Relationship to sparse blobpool (G4).** Both address EL blobpool bandwidth at scale, but through fundamentally different strategies. G4 keeps pre-propagation on the EL with probabilistic sampling; blob streaming moves AOT pre-propagation to the CL entirely and adds CR, pricing, and capacity management. G4 is simpler and deployable without consensus changes; blob streaming is more ambitious. They are not necessarily mutually exclusive: G4 could serve as a near-term step (no consensus changes needed) while blob streaming is developed, or G4 could handle JIT blob pre-propagation in the EL while blob streaming handles AOT on the CL.

---

### PANDAS (Ascigil et al., Sep 2024)

**Atoms used:** A2, B2, E3, E4, E5 (plus novel DHT-based peer management)

**Description.** A network-layer protocol targeting 32 MiB blobs and beyond. Assumes PBS for initial seeding. Uses 2D encoding with cell-level messaging and a DHT-based approach for peer/sample management.

**Maturity: 2** (EthResearch post with simulation results)

**Reference:** [PANDAS](https://ethresear.ch/t/pandas-a-practical-approach-for-next-generation-data-availability-sampling/20426)

---

## 4. Cross-dependency graph

This section maps the full dependency structure. "Requires" means X cannot function without Y. "Benefits from" means Y improves X but is not strictly necessary. "Enables" means X is a prerequisite that makes Y possible. "Conflicts with" means adopting X makes Y infeasible or significantly less useful. "Constrains" means X limits the utility of Y in a specific way.

### Hard requirements

- B2 (cell-level messaging) **requires** D1 (structured message IDs) + D2 (bitmap IHAVE/IWANT) + A5/D3 (sender-side proofs + batch verification) to be practical at scale. Without overhead reduction, per-message costs make cell-level messaging infeasible at 200+ blobs.
- E3 (per-row local reconstruction) **requires** A2 (2D extension) + B2 (cell-level messaging) + C2 (row subnets). Per-row repair only works if rows have redundancy (2D) and cells can be individually gossipped in row subnets.
- E4 (per-column local reconstruction) **requires** A2 (2D extension) + B2 (cell-level messaging). Same logic along the column dimension.
- E5 (cross-forwarding) **requires** E3 or E4 (per-dimension reconstruction) + B2 (cell-level messaging). You need to recover cells before you can forward them.
- E7 (getBlobs cell injection) **requires** B2 (cell-level messaging) + E8 (getBlobsV3 partial responses). Need cell granularity and partial return semantics.
- G2 (sharded blob mempool) **requires** E7 (getBlobs cell injection) + B2 (cell-level messaging). With a sharded mempool, column-level getBlobs fails; only cell injection works.
- H5 (confirmation rule layering) **requires** H1 (subnet-based sampling) for fork choice + H2 (peer-based sampling) for confirmation.

### Constraints

- E2b (getBlobsV2 all-or-nothing) **constrains** E6 (getBlobs column assembly): partial mempool data is invisible to the CL.
- E2b **constrains** E7 (getBlobs cell injection): impossible without partial responses.
- B1 (column-level messaging) **constrains** E3 (per-row local reconstruction): with column-level messages, you can only reconstruct if you have enough full columns, which is full-matrix reconstruction.
- B1 **constrains** E7 (getBlobs cell injection): column-level messaging can't leverage partial EL data.

### Enablement chains

- A4 (EL blob encoding) **enables** G3 (EC-aware mempool) **enables** G2 (sharded blob mempool at EC level). This is the progression from pre-encoding to full mempool EC awareness.
- B3 (GossipSub partial messages) **enables** B2 (cell-level messaging) in a backwards-compatible way. This is the incremental path to cell-level without a hard fork.
- E8 (getBlobsV3) **resolves** E2b (all-or-nothing constraint) and **enables** E7 (cell injection) and B3 (partial message reconciliation).
- E10 (getBlobsV4) **evolves** E8 (getBlobsV3) to cell-level granularity, enabling direct cell-level interaction between EL and CL. This is the Engine API endpoint for a sparse blobpool world.
- G4 (sparse blobpool) **enables** E10 (getBlobsV4) and **transforms** G1 (EL mempool pre-seeding) from full-blob to cell-level.
- F5 (block header-first propagation) **enables** F4 (distributed blob building) to start earlier and **enables** D3 (batch verification) contexts to be prepared before cells arrive.
- E6 (getBlobs v1/v2) **enables** F4 (distributed blob building). Supernodes fetch blobs from EL before columns arrive via gossip.

### Alternatives

- G4 (sparse blobpool) and G2 (sharded blob mempool) are **alternative approaches** to the same problem (EL blobpool bandwidth at scale). G4 is simpler (probabilistic sampling, no nonce gaps, no consensus changes) but provides ~4x reduction. G2 is more aggressive (deterministic sharding) but introduces nonce gaps (EIP-8077) and requires deeper architectural changes. They could potentially be composed (sparse replication within each shard) but this is unexplored.
- Blob streaming (I1-I4) is an **alternative to both G4 and G2** at a different architectural level. Rather than making the EL blobpool more efficient, it moves AOT pre-propagation to the CL entirely, bypassing the EL blobpool for AOT blobs. It additionally provides censorship resistance, pricing, and capacity management that G4 and G2 cannot. However, it requires consensus changes and depends on unshipped infrastructure (FOCIL). G4 and blob streaming are not mutually exclusive: G4 could handle residual EL-side pre-propagation (for JIT blobs) while blob streaming handles AOT on the CL.

### Conflicts

- A3 (RLNC) **conflicts with** E5 (cross-forwarding). RLNC coded pieces from one dimension don't help the other dimension. This is the fundamental tension between RLNC's stronger probabilistic guarantees and RS's structural repair properties.
- A3 (RLNC) **conflicts with** E3/E4 (per-dimension local reconstruction). Without fixed row/column structure, partial repair is lost (unless restricted RLC, A3c, is used, which partially recovers it at coding efficiency cost).

### Synergies

- F1 (batch publishing) + F2 (PPPT) are **complementary**. Batch publishing reduces source overhead; PPPT reduces in-network overhead. Together they address both ends of the duplicate bandwidth problem.
- E6 (getBlobs) + F4 (distributed blob building) + F3 (gradual publication) form the **PeerDAS optimization stack**. Supernodes fetch from EL, compute proofs, and publish gradually.
- A2 (2D extension) + B2 (cell-level messaging) + E3/E4 (local reconstruction) + E5 (cross-forwarding) form the **FullDAS core loop**. This is the tightly coupled set of atoms that enables supernode-free, inline repair during dispersal.
- G2 (sharded mempool) + E7 (cell injection) + E8 (getBlobsV3) + B2 (cell-level messaging) form the **post-PeerDAS EL/CL integration stack**. This is the path to making DAS work when no single node has all blobs.
- G4 (sparse blobpool) + E10 (getBlobsV4) + B3 (GossipSub partial messages) form the **near-term EL bandwidth relief stack**. G4 reduces EL blobpool bandwidth ~4x, E10 lets the CL consume the cell-level data, and B3 lets the CL disseminate partial data efficiently. This stack is deployable without consensus changes and addresses the most acute bottleneck observed in Fusaka devnets (EL blobpool bandwidth 4-5x higher than CL).
- I1 (blob tickets) + I2 (DA contract) + I3 (JIT/AOT split) + I4 (PTC enforcement) form the **blob streaming stack**. This is the path to moving pre-propagation in-protocol with explicit capacity allocation, pricing, and censorship resistance. It is additive to the DAS infrastructure (all CL DAS atoms are reused) and addresses both bandwidth smoothing and the free option problem. Depends on FOCIL (EIP-7805).

---

## 5. Narrative summary and open frontiers

PeerDAS as deployed in Fusaka is a deliberately conservative 1D construction. It shards distribution over column subnets with deterministic custody groups, relies on req/resp sampling, and defines reconstruction under a 50% column threshold, with explicit supernode roles as the practical backstop. This is real progress, but it is not supernode-independent in the strong sense: the specs explicitly state that reconstruction requires at least one supernode, and validator custody rules force some nodes into that role above a stake threshold.

**The EL blobpool is the immediate bottleneck, not CL DAS.** Fusaka devnet measurements (EIP-8070, Figure 1) show that at blob targets of 22-48, the average bandwidth consumption of the EL blobpool is 4-5x that of the CL. The CL already benefits from column-level sampling via PeerDAS; the EL still fully replicates every blob. As BPO forks increase throughput, this gap widens further and the EL will dominate bandwidth utilization, potentially starving block and attestation propagation.

Two approaches target this bottleneck, at different levels of ambition.

The sparse blobpool (EIP-8070, G4) is the most direct near-term response. By bringing custody-aligned probabilistic sampling to the EL, it achieves ~4x bandwidth reduction while preserving the stochastic, unstructured nature of the current blobpool. The key insight is custody alignment: the EL samples the same columns as the CL, so getBlobs (now via the cell-level getBlobsV4 interface, E10) continues to serve exactly the cells the CL needs. This avoids the architectural complexity of deterministic sharding (G2) and its nonce-gap problem (EIP-8077), at the cost of a less aggressive bandwidth reduction. The sparse blobpool is deployable without consensus changes (new devp2p version eth/71, Engine API extensions), making it a plausible near-term step.

Blob streaming (I1-I4) takes a more radical approach: rather than making the EL blobpool more efficient, it moves AOT (ahead-of-time) blob pre-propagation to the CL entirely, as a first-class ticket-based mechanism alongside a spot-priced JIT (just-in-time) lane. The core observation is that today's system couples propagation, availability determination, and execution into a single slot, creating bandwidth spikes during the critical path while leaving the rest of the slot underutilized. By decoupling propagation (tickets, ahead of time) from availability determination (DA contract, recorded on-chain) from execution (blob tx inclusion), bandwidth can be smoothed over the full slot, and throughput increases because AOT blobs use bandwidth outside the critical path. Additionally, ticket-based rate-limiting makes pre-propagation DoS-resistant, and the DA contract + PTC enforcement provides end-to-end censorship resistance for blob txs, something no blobpool sampling mechanism (G4, G2) can achieve. The tradeoff is complexity: blob streaming requires consensus changes, a new system contract, a new committee (PTC), EIP-1559-style ticket pricing, and depends on unshipped FOCIL. The two approaches are not mutually exclusive: G4 could serve as near-term relief while blob streaming is developed, and G4 could continue to handle JIT blob pre-propagation on the EL even after blob streaming is deployed for AOT.

At higher blob counts, the biggest tension beyond the EL bottleneck is mismatch and overhead on the CL side.

The mismatch is structural: the CL gossips columns, the EL getBlobs interface is row-oriented, and getBlobsV2 is all-or-nothing. This combination becomes useless exactly when you need it most, namely when nodes have partial local availability (private blobs, sharded mempools, or simply "one missing blob"). FullDASv2 identifies this explicitly as "no column reconstruction" and "no reconstruction of individual rows" under the current column-level message unit. The Engine API evolution from V2 (all-or-nothing) through V3 (null entries for missing blobs) to V4 (cell-level with indices bitarray) traces the path toward resolving this mismatch.

The overhead concern shifts the bottleneck from link capacity to per-message processing. At 256 blobs with 128 columns, cell-level messaging produces 32,768 cells per slot. Each cell needs GossipSub message handling, ID gossip, and KZG verification. Without aggressive overhead reduction (bitmap signaling, batch verification, push-pull transitions), the per-message costs alone can break the system. FullDASv2's blunt conclusion is that "raw bandwidth is not the main concern; rather, it is per-message processing and signalling overhead."

Four atomic ideas look like the critical path for scaling to 256+ blobs per slot:

First, **the EL bandwidth bottleneck needs immediate relief.** The sparse blobpool (G4) with getBlobsV4 (E10) addresses this without consensus changes. Custody alignment preserves the getBlobs pre-seeding benefit. This is the most deployment-ready step.

Second, **cell-level primitives are already in place.** Cell proofs, batch verification, and reconstruction helpers are shipped as part of EIP-7594. These are a prerequisite for any finer-granularity networking, and they're ready.

Third, **getBlobs needs to surface partial availability.** getBlobsV3 (E8) does exactly this by returning null entries for missing blobs. The spec is merged, and multiple EL clients are implementing it. getBlobsV4 (E10) takes this further to cell-level granularity, which is the natural interface once the EL holds cells rather than full blobs.

Fourth, **the network layer has to stop treating "the message" as the whole column** when almost all of it is redundant for many peers. The GossipSub partial messages extension (B3) plus bitmap-addressed cells is the most concrete "deployable without a hard fork" path to reconcile columns from local data while fetching only missing cells, with a documented PoC and a clear dependency chain into getBlobsV3/V4.

Beyond these near-term steps, the remaining hard research frontier is the trade-space between RS structure and RLNC coding. RS gives per-dimension repair and cross-forwarding, which are what make FullDAS's pipelined dispersal model work. RLNC gives stronger probabilistic guarantees but breaks those structural repair properties. The burden on RLNC advocates is to make it verifiable, non-gameable, and compatible with pipelined dissemination under DAS's "each node wants a different subset" semantics. The four RLNC design variants in FullDASv2 map this trade-space but don't resolve it.

Finally, query unlinkability remains the uncomfortable gap. Deterministic custody groups and explicit req/resp sampling are clean engineering, but they create observable structure and predictable targets. The sparse blobpool amplifies this concern slightly: custody alignment means the EL and CL have identical sampling patterns, which an adversary can exploit for fingerprinting. The sampling noise mechanism (requesting one random extra column per provider request) mitigates targeted withholding but doesn't address broader linkability. SubnetDAS's security analysis shows the bounds are acceptable for an intermediate step (5-10% of nodes foolable), and confirmation rule layering (H5) provides a clean architectural separation between liveness-safe fork choice and safety-critical confirmation. But any credible full Danksharding-scale system sampling cells at high frequency will need an explicit privacy-aware sampling and discovery strategy, or it risks turning sampling patterns into a side-channel.

---

## 6. Summary of references

| Ref | Title | Date | URL |
|-----|-------|------|-----|
| 1 | EIP-4844: Proto-Danksharding | Feb 2023 | https://eips.ethereum.org/EIPS/eip-4844 |
| 2 | EIP-7594: PeerDAS | Jan 2024 | https://eips.ethereum.org/EIPS/eip-7594 |
| 3 | PeerDAS original post | Sep 2023 | https://ethresear.ch/t/peerdas-a-simpler-das-approach-using-battle-tested-p2p-components/16541 |
| 4 | SubnetDAS | Oct 2023 | https://ethresear.ch/t/subnetdas-an-intermediate-das-approach/17169 |
| 5 | From 4844 to Danksharding | Dec 2023 | https://ethresear.ch/t/from-4844-to-danksharding-a-path-to-scaling-ethereum-da/18046 |
| 6 | LossyDAS | Mar 2024 | https://ethresear.ch/t/lossydas-lossy-incremental-and-diagonal-sampling-for-data-availability/18963 |
| 7 | FullDAS | May 2024 | https://ethresear.ch/t/fulldas-towards-massive-scalability-with-32mb-blocks-and-beyond/19529 |
| 8 | DAS fork-choice | May 2024 | https://ethresear.ch/t/das-fork-choice/19578 |
| 9 | PeerDAS documentation | Aug 2024 | https://ethresear.ch/t/peerdas-documentation/20361 |
| 10 | PANDAS | Sep 2024 | https://ethresear.ch/t/pandas-a-practical-approach-for-next-generation-data-availability-sampling/20426 |
| 11 | PeerDAS + distributed blob building (Sigma Prime) | Sep 2024 | https://blog.sigmaprime.io/peerdas-distributed-blob-building.html |
| 12 | Batch publishing | Feb 2025 | https://ethresear.ch/t/improving-das-performance-with-gossipsub-batch-publishing/21713 |
| 13 | Faster block/blob propagation (potuz) | 2025 | https://ethresear.ch/t/faster-block-blob-propagation-in-ethereum/21370 |
| 14 | PPPT | Apr 2025 | https://ethresear.ch/t/pppt-fighting-the-gossipsub-overhead-with-push-pull-phase-transition/22118 |
| 15 | Doubling blob count with GossipSub v2.0 | 2025 | https://ethresear.ch/t/doubling-the-blob-count-with-gossipsub-v2-0/21893 |
| 16 | Is data available in the EL mempool? | 2025 | https://ethresear.ch/t/is-data-available-in-the-el-mempool/22329 |
| 17 | FullDASv2 | May 2025 | https://ethresear.ch/t/accelerating-blob-scaling-with-fulldasv2-with-getblobs-mempool-encoding-and-possibly-rlc/22477 |
| 18 | Sharded blob mempool DAS | Jun 2025 | https://ethresear.ch/t/a-new-design-for-das-and-sharded-blob-mempools/22537 |
| 19 | Alternative DAS concept based on RLNC | Jun 2025 | https://ethresear.ch/t/alternative-das-concept-based-on-rlnc/22651 |
| 20 | Revisiting secure DAS in 1D and 2D | Jul 2025 | https://ethresear.ch/t/revisiting-secure-das-in-one-and-two-dimensions/22762 |
| 21 | Universal verification equation for DAS | Aug 2022 | https://ethresear.ch/t/a-universal-verification-equation-for-data-availability-sampling/13240 |
| 22 | Nuances of data recoverability | Aug 2023 | https://ethresear.ch/t/nuances-of-data-recoverability-in-data-availability-sampling/16256 |
| 23 | GossipSub partial messages extension | Sep 2025 | https://ethresear.ch/t/gossipsubs-partial-messages-extension-and-cell-level-dissemination/23017 |
| 24 | EIP-8077 nonce gap simulation | Dec 2025 | https://ethresear.ch/t/eip-8077-nonce-gap-simulation-report/23687 |
| 25 | Protocol Update 002 | Aug 2025 | https://blog.ethereum.org/2025/08/22/protocol-update-002 |
| 26 | Prysm blob documentation | 2025 | https://prysm.offchainlabs.com/docs/learn/concepts/blobs/ |
| 27 | Block and blob propagation with PeerDAS | 2025 | https://ethresear.ch/t/block-blob-propagation-with-peerdas/23801 |
| 28 | EIP-8070: Sparse Blobpool | Oct 2025 | https://eips.ethereum.org/EIPS/eip-8070 |
| 29 | EIP-7870: Bandwidth accounting | 2025 | https://eips.ethereum.org/EIPS/eip-7870 |
