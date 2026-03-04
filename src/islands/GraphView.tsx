import { useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { ATOMS } from '../data/atoms';
import { EDGES } from '../data/edges';
import { CATEGORIES } from '../data/categories';
import { MATURITY_LABELS } from '../data/maturity';
import { COMPOSITES } from '../data/composites';
import type { Atom } from '../data/atoms';
import type { EdgeType } from '../data/edges';
import type { CategoryId } from '../data/categories';

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
}

const EDGE_STYLES: Record<EdgeType, { color: string; dash: string; arrow: boolean }> = {
  'requires':      { color: '#2563eb', dash: 'none', arrow: true },
  'enables':       { color: '#059669', dash: 'none', arrow: true },
  'benefits from': { color: '#059669', dash: '5,4',  arrow: true },
  'conflicts':     { color: '#dc2626', dash: '5,4',  arrow: true },
  'alternative':   { color: '#d97706', dash: '5,4',  arrow: false },
  'complements':   { color: '#0d9488', dash: 'none', arrow: false },
  'resolves':      { color: '#7c3aed', dash: 'none', arrow: true },
  'evolves':       { color: '#0891b2', dash: 'none', arrow: true },
  'transforms':    { color: '#be185d', dash: 'none', arrow: true },
};

const ALL_EDGE_TYPES = Object.keys(EDGE_STYLES) as EdgeType[];
const ALL_CATEGORY_IDS = Object.keys(CATEGORIES) as CategoryId[];

const W = 1100;
const H = 680;

function computeLayout(width: number, height: number): Record<string, { x: number; y: number }> {
  const nodes: SimNode[] = ATOMS.map(a => ({ id: a.id, x: width / 2, y: height / 2 }));
  const links = EDGES.map(e => ({ source: e.from, target: e.to, type: e.type }));

  const sim = d3
    .forceSimulation<SimNode>(nodes)
    .force(
      'link',
      d3
        .forceLink<SimNode, (typeof links)[number]>(links)
        .id(d => d.id)
        .distance(60)
        .strength(0.6),
    )
    .force('charge', d3.forceManyBody<SimNode>().strength(-160))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('x', d3.forceX<SimNode>(width / 2).strength(0.06))
    .force('y', d3.forceY<SimNode>(height / 2).strength(0.06))
    .force('collide', d3.forceCollide<SimNode>(22));

  sim.stop();
  for (let i = 0; i < 300; i++) sim.tick();

  // Normalize positions to fit within the canvas with padding
  const pad = 40;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const n of nodes) {
    const nx = n.x ?? 0;
    const ny = n.y ?? 0;
    if (nx < minX) minX = nx;
    if (nx > maxX) maxX = nx;
    if (ny < minY) minY = ny;
    if (ny > maxY) maxY = ny;
  }

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const scaleX = (width - pad * 2) / rangeX;
  const scaleY = (height - pad * 2) / rangeY;
  const scale = Math.min(scaleX, scaleY);

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  const pos: Record<string, { x: number; y: number }> = {};
  for (const n of nodes) {
    pos[n.id] = {
      x: width / 2 + ((n.x ?? 0) - cx) * scale,
      y: height / 2 + ((n.y ?? 0) - cy) * scale,
    };
  }
  return pos;
}

const POSITIONS = computeLayout(W, H);

// Build a map for O(1) atom lookup.
const ATOM_MAP: Record<string, Atom> = Object.fromEntries(ATOMS.map(a => [a.id, a]));

export default function GraphView() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compositeId, setCompositeId] = useState<string>('');
  const [hiddenCategories, setHiddenCategories] = useState<Set<CategoryId>>(new Set());
  const [hiddenEdgeTypes, setHiddenEdgeTypes] = useState<Set<EdgeType>>(new Set());

  // Set of atom IDs highlighted by the selected composite.
  const highlightedAtoms = useMemo<Set<string>>(() => {
    if (!compositeId) return new Set();
    const comp = COMPOSITES.find(c => c.id === compositeId);
    return comp ? new Set(comp.atoms) : new Set();
  }, [compositeId]);

  // Set of atom IDs connected to the selected node.
  const connectedIds = useMemo<Set<string>>(() => {
    if (!selectedId) return new Set();
    const ids = new Set<string>();
    for (const e of EDGES) {
      if (e.from === selectedId) ids.add(e.to);
      if (e.to === selectedId) ids.add(e.from);
    }
    ids.add(selectedId);
    return ids;
  }, [selectedId]);

  const toggleCategory = useCallback((cat: CategoryId) => {
    setHiddenCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  const toggleEdgeType = useCallback((type: EdgeType) => {
    setHiddenEdgeTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  const resetCategories = useCallback(() => setHiddenCategories(new Set()), []);
  const resetEdgeTypes = useCallback(() => setHiddenEdgeTypes(new Set()), []);

  const handleNodeClick = useCallback((id: string) => {
    setSelectedId(prev => (prev === id ? null : id));
  }, []);

  const handleClose = useCallback(() => setSelectedId(null), []);

  const selectedAtom = selectedId != null ? ATOM_MAP[selectedId] : null;

  // Visible atoms (category filter).
  const visibleAtomIds = useMemo<Set<string>>(() => {
    return new Set(ATOMS.filter(a => !hiddenCategories.has(a.cat)).map(a => a.id));
  }, [hiddenCategories]);

  // Visible edges (edge type filter + both endpoints visible).
  const visibleEdges = useMemo(() => {
    return EDGES.filter(
      e =>
        !hiddenEdgeTypes.has(e.type) &&
        visibleAtomIds.has(e.from) &&
        visibleAtomIds.has(e.to),
    );
  }, [hiddenEdgeTypes, visibleAtomIds]);

  // Compute node opacity.
  function nodeOpacity(id: string): number {
    if (!visibleAtomIds.has(id)) return 0;
    if (compositeId && highlightedAtoms.size > 0) {
      return highlightedAtoms.has(id) ? 1 : 0.15;
    }
    if (selectedId) {
      return connectedIds.has(id) ? 1 : 0.15;
    }
    return 1;
  }

  // Compute edge opacity.
  function edgeOpacity(from: string, to: string): number {
    if (selectedId) {
      return connectedIds.has(from) && connectedIds.has(to) ? 1 : 0.08;
    }
    if (compositeId && highlightedAtoms.size > 0) {
      return highlightedAtoms.has(from) && highlightedAtoms.has(to) ? 0.8 : 0.05;
    }
    return 0.5;
  }

  const arrowTypes = ALL_EDGE_TYPES.filter(t => EDGE_STYLES[t].arrow);

  return (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
      {/* Main panel */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Controls */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            marginBottom: '12px',
            padding: '12px 14px',
            background: '#faf9f7',
            borderRadius: '6px',
            border: '1px solid #e0ddd6',
          }}
        >
          {/* Edge type filters */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', color: '#a8a29e', fontWeight: 600, marginRight: '2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Edges
            </span>
            <button
              onClick={resetEdgeTypes}
              style={{
                padding: '2px 8px',
                borderRadius: '4px',
                border: '1px solid #ccc8bf',
                background: hiddenEdgeTypes.size === 0 ? '#1c1917' : '#fff',
                color: hiddenEdgeTypes.size === 0 ? '#fff' : '#57534e',
                fontSize: '11px',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              All
            </button>
            {ALL_EDGE_TYPES.map(type => {
              const style = EDGE_STYLES[type];
              const active = !hiddenEdgeTypes.has(type);
              return (
                <button
                  key={type}
                  onClick={() => toggleEdgeType(type)}
                  style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: `1px solid ${style.color}`,
                    background: active ? style.color + '22' : '#fff',
                    color: active ? style.color : '#a8a29e',
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontWeight: 500,
                    textDecoration: !active ? 'line-through' : 'none',
                  }}
                >
                  {type}
                </button>
              );
            })}
          </div>

          {/* Category filters */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', color: '#a8a29e', fontWeight: 600, marginRight: '2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Categories
            </span>
            <button
              onClick={resetCategories}
              style={{
                padding: '2px 8px',
                borderRadius: '4px',
                border: '1px solid #ccc8bf',
                background: hiddenCategories.size === 0 ? '#1c1917' : '#fff',
                color: hiddenCategories.size === 0 ? '#fff' : '#57534e',
                fontSize: '11px',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              All
            </button>
            {ALL_CATEGORY_IDS.map(cat => {
              const category = CATEGORIES[cat];
              const active = !hiddenCategories.has(cat);
              return (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: '1px solid ' + (active ? '#1c1917' : '#ccc8bf'),
                    background: active ? '#1c1917' : 'transparent',
                    color: active ? '#fff' : '#57534e',
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontWeight: 500,
                    fontFamily: 'inherit',
                  }}
                >
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{cat}</span>
                  <span>{category.name}</span>
                </button>
              );
            })}
          </div>

          {/* Composite highlight */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '10px', color: '#a8a29e', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Composite
            </span>
            <select
              value={compositeId}
              onChange={e => setCompositeId(e.target.value)}
              style={{
                fontSize: '12px',
                padding: '3px 8px',
                borderRadius: '4px',
                border: '1px solid #ccc8bf',
                background: '#fff',
                color: '#57534e',
                cursor: 'pointer',
              }}
            >
              <option value="">None</option>
              {COMPOSITES.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* SVG graph */}
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{
            display: 'block',
            width: '100%',
            height: 'auto',
            background: '#faf9f7',
            borderRadius: '6px',
            border: '1px solid #e0ddd6',
          }}
        >
          <defs>
            {/* One arrowhead marker per arrow-type edge type color. */}
            {arrowTypes.map(type => {
              const { color } = EDGE_STYLES[type];
              return (
                <marker
                  key={type}
                  id={`arrow-${type.replace(/\s+/g, '-')}`}
                  viewBox="0 0 10 10"
                  refX="22"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
                </marker>
              );
            })}
          </defs>

          {/* Edges */}
          <g>
            {visibleEdges.map((edge, i) => {
              const fromPos = POSITIONS[edge.from];
              const toPos = POSITIONS[edge.to];
              if (!fromPos || !toPos) return null;
              const style = EDGE_STYLES[edge.type];
              const opacity = edgeOpacity(edge.from, edge.to);
              const markerId = style.arrow
                ? `url(#arrow-${edge.type.replace(/\s+/g, '-')})`
                : undefined;
              return (
                <line
                  key={i}
                  x1={fromPos.x}
                  y1={fromPos.y}
                  x2={toPos.x}
                  y2={toPos.y}
                  stroke={style.color}
                  strokeWidth={1.5}
                  strokeDasharray={style.dash === 'none' ? undefined : style.dash}
                  strokeOpacity={opacity}
                  markerEnd={markerId}
                />
              );
            })}
          </g>

          {/* Nodes */}
          <g>
            {ATOMS.map(atom => {
              const pos = POSITIONS[atom.id];
              if (!pos || !visibleAtomIds.has(atom.id)) return null;
              const category = CATEGORIES[atom.cat];
              const isSelected = selectedId === atom.id;
              const r = isSelected ? 18 : 14;
              const opacity = nodeOpacity(atom.id);
              return (
                <g
                  key={atom.id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  style={{ cursor: 'pointer', opacity }}
                  onClick={() => handleNodeClick(atom.id)}
                >
                  {/* Node circle */}
                  <circle
                    r={r}
                    fill={category.color + '18'}
                    stroke={category.color}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                  />
                  {/* Label */}
                  <text
                    textAnchor="middle"
                    dy="30"
                    fontSize="10"
                    fontFamily="'JetBrains Mono', monospace"
                    fill={category.color}
                    fontWeight={isSelected ? 700 : 500}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {atom.id}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Legend */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            marginTop: '10px',
            padding: '8px 0',
          }}
        >
          {ALL_EDGE_TYPES.map(type => {
            const { color, dash, arrow } = EDGE_STYLES[type];
            return (
              <div
                key={type}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#a8a29e' }}
              >
                <svg width="28" height="10">
                  <line
                    x1="0"
                    y1="5"
                    x2={arrow ? '20' : '28'}
                    y2="5"
                    stroke={color}
                    strokeWidth="1.5"
                    strokeDasharray={dash === 'none' ? undefined : dash}
                  />
                  {arrow && (
                    <polygon points="20,2 28,5 20,8" fill={color} />
                  )}
                </svg>
                {type}
              </div>
            );
          })}
        </div>
      </div>

      {/* Sidebar */}
      {selectedAtom != null && (
        <div
          style={{
            width: '280px',
            flexShrink: 0,
            background: '#ffffff',
            border: '1px solid #e0ddd6',
            borderRadius: '6px',
            padding: '16px',
            position: 'sticky',
            top: '16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '20px',
                fontWeight: 700,
                color: CATEGORIES[selectedAtom.cat].color,
              }}
            >
              {selectedAtom.id}
            </span>
            <button
              onClick={handleClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '18px',
                color: '#a8a29e',
                lineHeight: 1,
                padding: '0 2px',
              }}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div style={{ fontSize: '14px', fontWeight: 600, color: '#1c1917', marginBottom: '6px', lineHeight: 1.3 }}>
            {selectedAtom.name}
          </div>

          <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: '11px',
                padding: '2px 7px',
                borderRadius: '4px',
                background: CATEGORIES[selectedAtom.cat].color + '18',
                color: CATEGORIES[selectedAtom.cat].color,
                fontWeight: 600,
              }}
            >
              {CATEGORIES[selectedAtom.cat].name}
            </span>
            <span
              style={{
                fontSize: '11px',
                padding: '2px 7px',
                borderRadius: '4px',
                background: '#f5f5f4',
                color: '#78716c',
                fontWeight: 500,
                border: '1px solid #e0ddd6',
              }}
            >
              {MATURITY_LABELS[selectedAtom.maturity]}
            </span>
          </div>

          <p
            style={{
              fontSize: '12px',
              color: '#57534e',
              lineHeight: 1.6,
              marginBottom: '14px',
            }}
          >
            {selectedAtom.desc.length > 200
              ? selectedAtom.desc.slice(0, 200) + '…'
              : selectedAtom.desc}
          </p>

          <a
            href={`/atoms/${selectedAtom.id.toLowerCase()}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '13px',
              color: CATEGORIES[selectedAtom.cat].color,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            View detail
            <span aria-hidden="true">→</span>
          </a>
        </div>
      )}
    </div>
  );
}
