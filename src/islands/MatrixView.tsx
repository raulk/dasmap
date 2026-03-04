import { useState, useMemo } from 'react';
import { ATOMS } from '../data/atoms';
import { PROPERTIES } from '../data/properties';
import { CATEGORIES } from '../data/categories';
import { MATURITY_LABELS } from '../data/maturity';
import type { CategoryId } from '../data/categories';
import { BASE } from '../lib/base';

type SortKey = 'category' | 'maturity' | 'benefits' | 'hurts';

const ALL_CATEGORY_IDS = Object.keys(CATEGORIES) as CategoryId[];
const ALL_MATURITIES = [1, 2, 3, 4, 5] as const;

export default function MatrixView() {
  const [sortKey, setSortKey] = useState<SortKey>('category');
  const [activeCats, setActiveCats] = useState<Set<CategoryId>>(new Set(ALL_CATEGORY_IDS));
  const [activeMaturities, setActiveMaturities] = useState<Set<number>>(new Set(ALL_MATURITIES));
  const [hoveredProperty, setHoveredProperty] = useState<string | null>(null);

  function toggleCategory(cat: CategoryId) {
    setActiveCats(prev => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  }

  function toggleMaturity(m: number) {
    setActiveMaturities(prev => {
      const next = new Set(prev);
      if (next.has(m)) {
        next.delete(m);
      } else {
        next.add(m);
      }
      return next;
    });
  }

  const filteredAtoms = useMemo(() => {
    return ATOMS.filter(a => activeCats.has(a.cat) && activeMaturities.has(a.maturity));
  }, [activeCats, activeMaturities]);

  const sortedAtoms = useMemo(() => {
    const atoms = [...filteredAtoms];
    switch (sortKey) {
      case 'category':
        return atoms.sort((a, b) => a.cat.localeCompare(b.cat) || a.id.localeCompare(b.id));
      case 'maturity':
        return atoms.sort((a, b) => b.maturity - a.maturity || a.id.localeCompare(b.id));
      case 'benefits':
        return atoms.sort((a, b) => b.benefits.length - a.benefits.length || a.id.localeCompare(b.id));
      case 'hurts':
        return atoms.sort((a, b) => b.hurts.length - a.hurts.length || a.id.localeCompare(b.id));
    }
  }, [filteredAtoms, sortKey]);

  const GreenDot = (
    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e', margin: '0 auto' }} />
  );

  const RedDot = (
    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', margin: '0 auto' }} />
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Category filter */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#a8a29e', fontWeight: 500, minWidth: 64 }}>Category</span>
          {ALL_CATEGORY_IDS.map(cat => {
            const catDef = CATEGORIES[cat];
            const active = activeCats.has(cat);
            return (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '3px 10px',
                  borderRadius: 4,
                  border: '1px solid ' + (active ? '#1c1917' : '#ccc8bf'),
                  background: active ? '#1c1917' : 'transparent',
                  color: active ? '#fff' : '#57534e',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  fontFamily: 'inherit',
                }}
              >
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>{cat}</span>
                <span>{catDef.name}</span>
              </button>
            );
          })}
        </div>

        {/* Stage filter */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#a8a29e', fontWeight: 500, minWidth: 64 }}>Stage</span>
          {ALL_MATURITIES.map(m => {
            const active = activeMaturities.has(m);
            return (
              <button
                key={m}
                onClick={() => toggleMaturity(m)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '3px 10px',
                  borderRadius: 4,
                  border: '1px solid ' + (active ? '#1c1917' : '#ccc8bf'),
                  background: active ? '#1c1917' : 'transparent',
                  color: active ? '#fff' : '#57534e',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  fontFamily: 'inherit',
                }}
              >
                {MATURITY_LABELS[m]}
              </button>
            );
          })}
        </div>

        {/* Sort */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#a8a29e', fontWeight: 500, minWidth: 64 }}>Sort</span>
          <select
            value={sortKey}
            onChange={e => setSortKey(e.target.value as SortKey)}
            style={{
              fontSize: 12,
              padding: '3px 8px',
              borderRadius: 6,
              border: '1.5px solid #ccc8bf',
              background: '#fff',
              color: '#1c1917',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <option value="category">Category</option>
            <option value="maturity">Stage (desc)</option>
            <option value="benefits">Benefit count (desc)</option>
            <option value="hurts">Hurt count (desc)</option>
          </select>
          <span style={{ fontSize: 12, color: '#a8a29e' }}>
            {sortedAtoms.length} atom{sortedAtoms.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #e0ddd6' }}>
        <table style={{ borderCollapse: 'collapse', minWidth: '100%', tableLayout: 'fixed' }}>
          <thead>
            {/* Code row */}
            <tr>
              <th
                rowSpan={2}
                style={{
                  position: 'sticky',
                  left: 0,
                  zIndex: 3,
                  background: '#faf9f7',
                  width: 200,
                  minWidth: 200,
                  borderBottom: '1px solid #e0ddd6',
                  borderRight: '1px solid #e0ddd6',
                }}
              />
              {PROPERTIES.map(prop => (
                <th
                  key={prop.id}
                  onClick={() => { window.location.href = BASE + '/properties/' + prop.id.toLowerCase(); }}
                  onMouseEnter={() => setHoveredProperty(prop.id)}
                  onMouseLeave={() => setHoveredProperty(null)}
                  style={{
                    width: 68,
                    minWidth: 68,
                    padding: '6px 0 2px',
                    borderRight: '1px solid #e0ddd6',
                    cursor: 'pointer',
                    background: hoveredProperty === prop.id ? '#f0eeeb' : '#faf9f7',
                    textAlign: 'center',
                    verticalAlign: 'bottom',
                  }}
                >
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#57534e',
                    userSelect: 'none',
                  }}>
                    {prop.id}
                  </span>
                </th>
              ))}
            </tr>
            {/* Name row */}
            <tr>
              {PROPERTIES.map(prop => (
                <th
                  key={prop.id}
                  onClick={() => { window.location.href = BASE + '/properties/' + prop.id.toLowerCase(); }}
                  onMouseEnter={() => setHoveredProperty(prop.id)}
                  onMouseLeave={() => setHoveredProperty(null)}
                  style={{
                    width: 68,
                    minWidth: 68,
                    padding: '0 4px 6px',
                    borderBottom: '1px solid #e0ddd6',
                    borderRight: '1px solid #e0ddd6',
                    cursor: 'pointer',
                    background: hoveredProperty === prop.id ? '#f0eeeb' : '#faf9f7',
                    textAlign: 'center',
                    verticalAlign: 'top',
                  }}
                >
                  <span style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: '#a8a29e',
                    lineHeight: '1.25',
                    userSelect: 'none',
                    display: 'block',
                  }}>
                    {prop.name}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedAtoms.map((atom, rowIdx) => {
              const cat = CATEGORIES[atom.cat];
              const rowBg = rowIdx % 2 === 0 ? '#fff' : '#faf9f7';
              return (
                <tr
                  key={atom.id}
                  onClick={() => { window.location.href = BASE + '/atoms/' + atom.id.toLowerCase(); }}
                  style={{ cursor: 'pointer', background: rowBg }}
                  onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = '#f0eeeb'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = rowBg; }}
                >
                  {/* Sticky left label cell */}
                  <td
                    style={{
                      position: 'sticky',
                      left: 0,
                      zIndex: 1,
                      background: 'inherit',
                      borderBottom: '1px solid #e0ddd6',
                      borderRight: '1px solid #e0ddd6',
                      padding: '6px 10px',
                      width: 200,
                      minWidth: 200,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, overflow: 'hidden' }}>
                      <span style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: 11,
                        fontWeight: 600,
                        color: cat.color,
                        flexShrink: 0,
                      }}>
                        {atom.id}
                      </span>
                      <span style={{
                        fontSize: 12,
                        color: '#44403a',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {atom.name}
                      </span>
                    </div>
                    <span style={{ fontSize: 10, color: '#a8a29e' }}>{MATURITY_LABELS[atom.maturity]}</span>
                  </td>
                  {PROPERTIES.map(prop => {
                    const benefits = atom.benefits.includes(prop.id);
                    const hurts = atom.hurts.includes(prop.id);
                    return (
                      <td
                        key={prop.id}
                        style={{
                          width: 68,
                          minWidth: 68,
                          textAlign: 'center',
                          verticalAlign: 'middle',
                          padding: '4px 0',
                          borderBottom: '1px solid #e0ddd6',
                          borderRight: '1px solid #e0ddd6',
                          background: hoveredProperty === prop.id ? '#f0eeeb' : 'inherit',
                        }}
                      >
                        {benefits ? GreenDot : hurts ? RedDot : null}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
