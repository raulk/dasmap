export type EdgeType =
  | 'requires'
  | 'enables'
  | 'benefits from'
  | 'conflicts'
  | 'alternative'
  | 'complements'
  | 'resolves'
  | 'evolves'
  | 'transforms';

export interface Edge {
  from: string;
  to: string;
  type: EdgeType;
  note?: string;
}

// Atom-to-atom dependency edges (excludes property impacts).
// Property impacts (benefits/hurts) are stored on the atom itself.
export const EDGES: Edge[] = [
  // A
  { from: 'A1', to: 'A4',  type: 'enables',       note: 'Row extension can be moved to the mempool' },
  { from: 'A1', to: 'C1',  type: 'requires',       note: 'Columns are the distribution and sampling unit' },
  { from: 'A1', to: 'E1',  type: 'requires',       note: 'Supernodes decode rows from collected columns' },
  { from: 'A1', to: 'E2',  type: 'requires',       note: 'Semi-supernodes also decode rows from columns' },
  { from: 'A2', to: 'A1',  type: 'requires',       note: 'First dimension prerequisite' },
  { from: 'A2', to: 'B2',  type: 'requires',       note: 'Cell-level messaging needed to fully exploit 2D' },
  { from: 'A2', to: 'E3',  type: 'enables',        note: 'Independent row repair from partial cell data' },
  { from: 'A2', to: 'E4',  type: 'enables',        note: 'Independent column repair from partial cell data' },
  { from: 'A2', to: 'E5',  type: 'enables',        note: 'Cross-forwarding requires two dimensions' },
  { from: 'A3', to: 'E3',  type: 'conflicts',      note: 'RLNC loses per-row repair structure' },
  { from: 'A3', to: 'E4',  type: 'conflicts',      note: 'RLNC loses per-column repair structure' },
  { from: 'A3', to: 'E5',  type: 'conflicts',      note: 'Coded pieces from one dimension do not help the other' },
  { from: 'A3', to: 'E9',  type: 'enables',        note: 'RLNC-based full reconstruction' },
  { from: 'A4', to: 'G3',  type: 'enables',        note: 'EC-aware mempool requires pre-encoded blobs' },
  { from: 'A4', to: 'E7',  type: 'enables',        note: 'Pre-encoded blobs allow cell-level injection' },
  { from: 'A5', to: 'G4',  type: 'enables',        note: 'Sender-side proofs enable per-cell EL validation' },
  { from: 'A5', to: 'B2',  type: 'benefits from',  note: 'Cell-level messaging benefits from pre-proven cells' },

  // B
  { from: 'B1', to: 'C1',  type: 'requires',       note: 'Columns are gossiped on column subnets' },
  { from: 'B2', to: 'A2',  type: 'requires',       note: '2D extension needed for full cell-level benefit' },
  { from: 'B2', to: 'E3',  type: 'enables',        note: 'Cell granularity needed to collect partial rows' },
  { from: 'B2', to: 'E4',  type: 'enables',        note: 'Cell granularity needed for partial column repair' },
  { from: 'B2', to: 'E5',  type: 'enables',        note: 'Forwarded cells are individual cells' },
  { from: 'B2', to: 'E7',  type: 'enables',        note: 'Cell injection requires cell granularity' },
  { from: 'B3', to: 'B2',  type: 'enables',        note: 'Backwards-compatible path to cell-level messaging' },
  { from: 'B3', to: 'E8',  type: 'benefits from',  note: 'Partial EL data feeds into partial-message reconciliation' },
  { from: 'B4', to: 'B1',  type: 'requires',       note: 'Column-level primary path' },
  { from: 'B4', to: 'B2',  type: 'requires',       note: 'Cell-level secondary repair path' },

  // C
  { from: 'C1', to: 'H1',  type: 'enables',        note: 'Column subnets are the basis for subnet-based sampling' },
  { from: 'C2', to: 'E3',  type: 'enables',        note: 'Row subnets are where partial row data accumulates' },
  { from: 'C2', to: 'E5',  type: 'enables',        note: 'Cross-seeded cells forwarded via row subnets' },
  { from: 'C3', to: 'C1',  type: 'requires',       note: 'Rotates over column subnets' },
  { from: 'C3', to: 'H1',  type: 'enables',        note: 'Rotation adds freshness to sampling' },
  { from: 'C4', to: 'E5',  type: 'benefits from',  note: 'Cross-forwarding needs peers in orthogonal subnets quickly' },

  // D
  { from: 'D1', to: 'D2',  type: 'enables',        note: 'Structured IDs enable bitmap compression' },
  { from: 'D2', to: 'D1',  type: 'requires',       note: 'Bitmaps index over structured coordinates' },
  { from: 'D3', to: 'A5',  type: 'benefits from',  note: 'Pre-proven cells are available to batch-verify' },

  // E
  { from: 'E1', to: 'F3',  type: 'enables',        note: 'Only supernodes publish all columns' },
  { from: 'E1', to: 'F4',  type: 'enables',        note: 'Supernodes do the heavy lifting in distributed building' },
  { from: 'E1b', to: 'E1', type: 'requires',       note: 'Desynchronized delay applies to supernode reconstruction' },
  { from: 'E3', to: 'E5',  type: 'enables',        note: 'Recovered row cells feed column subnets' },
  { from: 'E4', to: 'E5',  type: 'enables',        note: 'Recovered column cells feed row subnets' },
  { from: 'E5', to: 'E3',  type: 'requires',       note: 'Must recover cells before forwarding' },
  { from: 'E5', to: 'E4',  type: 'requires',       note: 'Must recover cells before forwarding' },
  { from: 'E6', to: 'E1',  type: 'benefits from',  note: 'Faster reconstruction when all blobs available via getBlobs' },
  { from: 'E6', to: 'F4',  type: 'enables',        note: 'Supernodes fetch blobs from EL to start publishing early' },
  { from: 'E6', to: 'G1',  type: 'requires',       note: 'Pre-seeded blobs are what getBlobs retrieves' },
  { from: 'E7', to: 'B2',  type: 'requires',       note: 'Cell injection requires cell granularity messaging' },
  { from: 'E7', to: 'E8',  type: 'requires',       note: 'Partial responses enable cell-level injection' },
  { from: 'E8', to: 'E2b', type: 'resolves',       note: 'Partial responses fix the all-or-nothing constraint' },
  { from: 'E8', to: 'E7',  type: 'enables',        note: 'Partial responses surface which blobs are available' },
  { from: 'E8', to: 'B3',  type: 'enables',        note: 'Partial EL data feeds partial-message reconciliation' },
  { from: 'E9', to: 'A3',  type: 'requires',       note: 'RLNC-based reconstruction requires RLNC coding' },
  { from: 'E9', to: 'E5',  type: 'conflicts',      note: 'No dimensional structure to cross-forward between' },
  { from: 'E10', to: 'E8', type: 'evolves',        note: 'Cell-level successor to V3 partial-response semantics' },
  { from: 'E10', to: 'E2b', type: 'resolves',      note: 'More completely resolves all-or-nothing at cell granularity' },
  { from: 'E10', to: 'G4', type: 'requires',       note: 'V4 only makes sense when EL holds cells not full blobs' },

  // F
  { from: 'F3', to: 'E1',  type: 'requires',       note: 'Only supernodes publish all columns' },
  { from: 'F4', to: 'E1',  type: 'requires',       note: 'Supernodes do the heavy lifting' },
  { from: 'F4', to: 'E6',  type: 'requires',       note: 'Supernodes fetch blobs from EL' },
  { from: 'F4', to: 'F5',  type: 'benefits from',  note: 'Earlier header arrival means earlier supernode action' },
  { from: 'F5', to: 'F4',  type: 'enables',        note: 'Earlier header enables earlier supernode action' },
  { from: 'F5', to: 'D3',  type: 'enables',        note: 'Nodes prepare verification contexts from commitments' },

  // G
  { from: 'G1', to: 'E6',  type: 'enables',        note: 'Pre-seeded blobs are what getBlobs retrieves' },
  { from: 'G1', to: 'E7',  type: 'enables',        note: 'Partial pre-seeding helps with cell injection' },
  { from: 'G2', to: 'E7',  type: 'requires',       note: 'Cell injection is the only way to use partial mempool data' },
  { from: 'G2', to: 'B2',  type: 'requires',       note: 'Column-level messaging cannot use partial mempool data' },
  { from: 'G2', to: 'G4',  type: 'alternative',    note: 'Both reduce EL blobpool bandwidth; G4 simpler, no nonce gaps' },
  { from: 'G3', to: 'A4',  type: 'requires',       note: 'EC-aware mempool requires pre-encoded blobs' },
  { from: 'G3', to: 'G2',  type: 'enables',        note: 'Sharded mempool benefits from EC awareness' },
  { from: 'G4', to: 'A5',  type: 'requires',       note: 'Sender-side proofs enable per-cell EL validation' },
  { from: 'G4', to: 'E10', type: 'enables',        note: 'Cell-level Engine API for sparse blobpool' },
  { from: 'G4', to: 'G1',  type: 'transforms',     note: 'Pre-seeding becomes cell-level rather than full-blob' },

  // H
  { from: 'H1', to: 'C1',  type: 'requires',       note: 'Column subnets are the basis for subnet-based sampling' },
  { from: 'H2', to: 'H5',  type: 'enables',        note: 'Peer-based sampling used for confirmation rule' },
  { from: 'H5', to: 'H1',  type: 'requires',       note: 'Subnet-based sampling for fork choice' },
  { from: 'H5', to: 'H2',  type: 'requires',       note: 'Peer-based sampling for confirmation' },

  // I
  { from: 'I1', to: 'I2',  type: 'enables',        note: 'Tickets create the propagation flow; DA contract records it' },
  { from: 'I1', to: 'I3',  type: 'enables',        note: 'Tickets enable the AOT lane in the dual-payload split' },
  { from: 'I1', to: 'G4',  type: 'alternative',    note: 'Both address EL blobpool bandwidth via different strategies' },
  { from: 'I1', to: 'G1',  type: 'alternative',    note: 'CL-side ticket propagation vs EL blobpool pre-seeding' },
  { from: 'I2', to: 'I4',  type: 'enables',        note: 'PTC-mandated versioned hashes are recorded in DA contract' },
  { from: 'I2', to: 'I3',  type: 'enables',        note: 'AOT versioned hashes reference recorded availability' },
  { from: 'I2', to: 'I1',  type: 'requires',       note: 'DA contract records availability of blobs propagated via tickets' },
  { from: 'I4', to: 'I2',  type: 'requires',       note: 'PTC-mandated hashes recorded in DA contract' },
  { from: 'I4', to: 'I1',  type: 'requires',       note: 'Only ticketed blobs propagate before PTC deadline' },
];
