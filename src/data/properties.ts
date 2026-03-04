export interface Property {
  id: string;
  name: string;
  description: string;
}

export const PROPERTIES: Property[] = [
  {
    id: 'P1',
    name: 'Throughput scalability',
    description: 'Maximum blob count per slot the technique supports or enables.',
  },
  {
    id: 'P2',
    name: 'Per-node bandwidth efficiency',
    description: 'How much data a non-supernode must download and upload per slot. Lower is better.',
  },
  {
    id: 'P3',
    name: 'Supernode independence',
    description: 'Whether the system works without relying on a small set of nodes that must download or reconstruct the global dataset.',
  },
  {
    id: 'P4',
    name: 'Critical-path viability',
    description: 'Whether the design works within slot-time constraints for block propagation and attestation deadlines.',
  },
  {
    id: 'P5',
    name: 'Reconstruction granularity',
    description: 'Finest unit at which data can be recovered (cell, row, column, full matrix).',
  },
  {
    id: 'P6',
    name: 'Cross-dimensional repair',
    description: 'Whether recovery actions in one dimension improve availability in the other, enabling availability amplification.',
  },
  {
    id: 'P7',
    name: 'Liveness resilience',
    description: 'Under partial failures (missing subnets, slow peers, delayed publishing), the system degrades gracefully.',
  },
  {
    id: 'P8',
    name: 'Query unlinkability',
    description: "Whether an adversary can infer a node's sampling targets from observable network behaviour.",
  },
  {
    id: 'P9',
    name: 'Future compatibility',
    description: 'Whether the infrastructure composes towards 2D sampling and full Danksharding.',
  },
  {
    id: 'P10',
    name: 'Implementation complexity',
    description: 'Amount of new networking machinery, spec changes, and unknowns. Preference for reusing well-understood components.',
  },
  {
    id: 'P11',
    name: 'Builder bandwidth relief',
    description: "Whether the block builder's uplink burden is reduced.",
  },
  {
    id: 'P12',
    name: 'Mempool fragmentation tolerance',
    description: 'Whether it works when no single EL node has all blobs, and whether it exploits local availability when present.',
  },
  {
    id: 'P13',
    name: 'Withholding attack resistance',
    description: 'Strength of probabilistic guarantees against data withholding.',
  },
  {
    id: 'P14',
    name: 'Backwards compatibility',
    description: 'Whether it can be deployed without consensus changes or hard forks.',
  },
  {
    id: 'P15',
    name: 'Cryptographic/verification overhead',
    description: 'Whether proof sizes, proof generation placement, and verification cost remain tractable at high blob counts.',
  },
];
