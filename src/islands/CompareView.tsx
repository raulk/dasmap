import { useState } from 'react';
import { ATOMS } from '../data/atoms';
import { COMPOSITES } from '../data/composites';
import { CATEGORIES } from '../data/categories';
import { MATURITY_COLORS, MATURITY_LABELS } from '../data/maturity';

export default function CompareView() {
  const [activeComposites, setActiveComposites] = useState<Set<string>>(
    new Set(COMPOSITES.map(c => c.id))
  );

  function toggleComposite(id: string) {
    setActiveComposites(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const visibleComposites = COMPOSITES.filter(c => activeComposites.has(c.id));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Composite toggle buttons */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 12, color: '#a8a29e', fontWeight: 500, minWidth: 80 }}>Composites</span>
        {COMPOSITES.map(c => {
          const active = activeComposites.has(c.id);
          const matColor = MATURITY_COLORS[c.maturity];
          return (
            <button
              key={c.id}
              onClick={() => toggleComposite(c.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '3px 10px',
                borderRadius: 9999,
                border: '1.5px solid #ccc8bf',
                background: active ? '#1c1917' : 'transparent',
                color: active ? '#fff' : '#57534e',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s',
                fontFamily: 'inherit',
              }}
            >
              <div style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: matColor,
                flexShrink: 0,
              }} />
              {c.name}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #e0ddd6' }}>
        <table style={{ borderCollapse: 'collapse', minWidth: '100%', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              {/* Sticky top-left corner */}
              <th
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
              {visibleComposites.map(composite => (
                <th
                  key={composite.id}
                  onClick={() => { window.location.href = '/composites/' + composite.id; }}
                  style={{
                    width: 100,
                    minWidth: 90,
                    height: 140,
                    padding: 0,
                    borderBottom: '1px solid #e0ddd6',
                    borderRight: '1px solid #e0ddd6',
                    cursor: 'pointer',
                    background: '#faf9f7',
                    verticalAlign: 'bottom',
                    position: 'relative',
                    overflow: 'visible',
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    bottom: 8,
                    left: '50%',
                    transformOrigin: 'bottom left',
                    transform: 'rotate(-50deg)',
                    whiteSpace: 'nowrap',
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#44403a',
                    userSelect: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                  }}>
                    <span style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: MATURITY_COLORS[composite.maturity],
                      flexShrink: 0,
                      display: 'inline-block',
                    }} />
                    {composite.name}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ATOMS.map((atom, rowIdx) => {
              const cat = CATEGORIES[atom.cat];
              const rowBg = rowIdx % 2 === 0 ? '#fff' : '#faf9f7';
              const dotColor = cat.color;
              return (
                <tr
                  key={atom.id}
                  onClick={() => { window.location.href = '/atoms/' + atom.id.toLowerCase(); }}
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
                      borderLeft: `3px solid ${cat.color}`,
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
                    <div style={{ marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: MATURITY_COLORS[atom.maturity],
                        flexShrink: 0,
                      }} />
                      <span style={{ fontSize: 10, color: '#a1a1aa' }}>M{atom.maturity}</span>
                    </div>
                  </td>
                  {visibleComposites.map(composite => (
                    <td
                      key={composite.id}
                      style={{
                        width: 100,
                        minWidth: 90,
                        textAlign: 'center',
                        verticalAlign: 'middle',
                        padding: '4px 0',
                        borderBottom: '1px solid #e0ddd6',
                        borderRight: '1px solid #e0ddd6',
                      }}
                    >
                      {composite.atoms.includes(atom.id) && (
                        <div style={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          background: dotColor,
                          margin: '0 auto',
                          boxShadow: `0 1px 3px ${dotColor}44`,
                        }} />
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
