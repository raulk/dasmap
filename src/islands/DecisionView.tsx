import { ATOMS } from '../data/atoms';
import { CATEGORIES } from '../data/categories';
import type { CategoryId } from '../data/categories';

// ── Types ────────────────────────────────────────────────────────────────────

interface NodeDef {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  kind: 'question' | 'leaf';
  atomIds?: string[];
  subLabel?: string;
}

interface EdgeDef {
  from: string;
  to: string;
}

// ── Layout data ───────────────────────────────────────────────────────────────

const NODES: NodeDef[] = [
  // Root
  {
    id: 'root',
    label: "What's the binding constraint?",
    x: 370,
    y: 20,
    w: 260,
    kind: 'question',
  },

  // Branch headers
  {
    id: 'b1',
    label: 'EL blobpool bandwidth',
    x: 20,
    y: 150,
    w: 185,
    kind: 'question',
  },
  {
    id: 'b2',
    label: 'CL overhead at 256+ blobs',
    x: 240,
    y: 150,
    w: 205,
    kind: 'question',
  },
  {
    id: 'b3',
    label: 'Supernode dependence',
    x: 480,
    y: 150,
    w: 200,
    kind: 'question',
  },
  {
    id: 'b4',
    label: 'Open frontiers',
    x: 710,
    y: 150,
    w: 175,
    kind: 'question',
  },

  // Branch 1 leaves
  {
    id: 'b1-near',
    label: 'Near-term',
    subLabel: 'no consensus changes',
    x: 20,
    y: 280,
    w: 165,
    kind: 'leaf',
    atomIds: ['G4'],
  },
  {
    id: 'b1-med',
    label: 'Medium-term',
    subLabel: 'blob streaming',
    x: 20,
    y: 400,
    w: 165,
    kind: 'leaf',
    atomIds: ['I1', 'I2', 'I3', 'I4'],
  },

  // Branch 2 leaves
  {
    id: 'b2-cell',
    label: 'Cell primitives',
    x: 240,
    y: 280,
    w: 205,
    kind: 'leaf',
    atomIds: ['A1', 'D3'],
  },
  {
    id: 'b2-partial',
    label: 'Partial getBlobs',
    x: 240,
    y: 380,
    w: 205,
    kind: 'leaf',
    atomIds: ['E8', 'E10'],
  },
  {
    id: 'b2-gossip',
    label: 'GossipSub partial',
    x: 240,
    y: 470,
    w: 205,
    kind: 'leaf',
    atomIds: ['B3'],
  },

  // Branch 3 leaves
  {
    id: 'b3-full',
    label: 'FullDAS core loop',
    x: 480,
    y: 280,
    w: 200,
    kind: 'leaf',
    atomIds: ['A2', 'B2', 'E3', 'E4', 'E5'],
  },

  // Branch 4 leaves
  {
    id: 'b4-unlink',
    label: 'Query unlinkability',
    x: 710,
    y: 280,
    w: 175,
    kind: 'leaf',
    atomIds: ['H4', 'C3'],
  },
  {
    id: 'b4-coding',
    label: 'RS vs RLNC',
    x: 710,
    y: 390,
    w: 175,
    kind: 'leaf',
    atomIds: ['A3', 'E9'],
  },
];

const EDGES: EdgeDef[] = [
  { from: 'root', to: 'b1' },
  { from: 'root', to: 'b2' },
  { from: 'root', to: 'b3' },
  { from: 'root', to: 'b4' },
  { from: 'b1', to: 'b1-near' },
  { from: 'b1', to: 'b1-med' },
  { from: 'b2', to: 'b2-cell' },
  { from: 'b2', to: 'b2-partial' },
  { from: 'b2', to: 'b2-gossip' },
  { from: 'b3', to: 'b3-full' },
  { from: 'b4', to: 'b4-unlink' },
  { from: 'b4', to: 'b4-coding' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getNodeById(id: string): NodeDef {
  const node = NODES.find((n) => n.id === id);
  if (!node) throw new Error(`Node not found: ${id}`);
  return node;
}

function nodeCenterX(node: NodeDef): number {
  return node.x + node.w / 2;
}

// Estimated node heights for edge anchoring
function nodeHeight(node: NodeDef): number {
  if (node.kind === 'question') return 52;
  const atoms = node.atomIds ?? [];
  return 56 + atoms.length * 28;
}

function nodeCenterY(node: NodeDef): number {
  return node.y + nodeHeight(node) / 2;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function AtomChip({ atomId }: { atomId: string }) {
  const atom = ATOMS.find((a) => a.id === atomId);
  if (!atom) return null;

  const cat = CATEGORIES[atom.cat as CategoryId];
  const truncated = atom.name.length > 28 ? atom.name.slice(0, 28) + '…' : atom.name;

  return (
    <a
      href={`/atoms/${atom.id.toLowerCase()}`}
      title={atom.name}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 7px',
        borderRadius: '4px',
        background: '#18181b',
        border: '1px solid #3f3f46',
        textDecoration: 'none',
        cursor: 'pointer',
        marginTop: '4px',
      }}
    >
      <span
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '10px',
          fontWeight: 600,
          color: cat.color,
          flexShrink: 0,
        }}
      >
        {atom.id}
      </span>
      <span
        style={{
          fontSize: '11px',
          color: '#a1a1aa',
          lineHeight: 1.3,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {truncated}
      </span>
    </a>
  );
}

function QuestionNode({ node }: { node: NodeDef }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: node.x,
        top: node.y,
        width: node.w,
        background: '#18181b',
        border: '1px solid #3f3f46',
        borderRadius: '8px',
        padding: '10px 12px',
        boxSizing: 'border-box',
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: '12px',
          fontWeight: 600,
          color: '#e4e4e7',
          lineHeight: 1.4,
        }}
      >
        {node.label}
      </p>
    </div>
  );
}

function LeafNode({ node }: { node: NodeDef }) {
  const atomIds = node.atomIds ?? [];
  return (
    <div
      style={{
        position: 'absolute',
        left: node.x,
        top: node.y,
        width: node.w,
        background: '#09090b',
        border: '1px solid #3f3f46',
        borderTop: '3px solid #52525b',
        borderRadius: '8px',
        padding: '8px 10px',
        boxSizing: 'border-box',
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: '11px',
          fontWeight: 600,
          color: '#a1a1aa',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          lineHeight: 1.3,
        }}
      >
        {node.label}
      </p>
      {node.subLabel && (
        <p
          style={{
            margin: '2px 0 4px',
            fontSize: '10px',
            color: '#71717a',
            lineHeight: 1.3,
          }}
        >
          {node.subLabel}
        </p>
      )}
      <div style={{ marginTop: '4px' }}>
        {atomIds.map((id) => (
          <AtomChip key={id} atomId={id} />
        ))}
      </div>
    </div>
  );
}

// ── Edge path builder ─────────────────────────────────────────────────────────

function buildEdgePath(from: NodeDef, to: NodeDef): string {
  const x1 = nodeCenterX(from);
  const y1 = from.y + nodeHeight(from);
  const x2 = nodeCenterX(to);
  const y2 = to.y;
  const midY = (y1 + y2) / 2;
  return `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
}

// ── Canvas dimensions ─────────────────────────────────────────────────────────

const CANVAS_W = 920;
const CANVAS_H = 570;

// ── Main component ────────────────────────────────────────────────────────────

export default function DecisionView() {
  return (
    <div
      style={{
        position: 'relative',
        width: CANVAS_W,
        height: CANVAS_H,
        background: '#09090b',
        overflow: 'auto',
      }}
    >
      {/* SVG edge layer — behind nodes */}
      <svg
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
        width={CANVAS_W}
        height={CANVAS_H}
      >
        {EDGES.map((edge) => {
          const fromNode = getNodeById(edge.from);
          const toNode = getNodeById(edge.to);
          return (
            <path
              key={`${edge.from}-${edge.to}`}
              d={buildEdgePath(fromNode, toNode)}
              fill="none"
              stroke="#3f3f46"
              strokeWidth={1.5}
            />
          );
        })}
      </svg>

      {/* Node layer */}
      {NODES.map((node) =>
        node.kind === 'question' ? (
          <QuestionNode key={node.id} node={node} />
        ) : (
          <LeafNode key={node.id} node={node} />
        ),
      )}
    </div>
  );
}
