import { useState } from 'react';
import { ATOMS } from '../data/atoms';
import { COMPOSITES } from '../data/composites';
import { CATEGORIES } from '../data/categories';
import { MATURITY_LABELS } from '../data/maturity';
import { BASE } from '../lib/base';

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
          return (
            <button
              key={c.id}
              onClick={() => toggleComposite(c.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
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
                  onClick={() => { window.location.href = BASE + '/composites/' + composite.id; }}
                  style={{
                    width: 120,
                    minWidth: 100,
                    padding: '8px 6px',
                    borderBottom: '1px solid #e0ddd6',
                    borderRight: '1px solid #e0ddd6',
                    cursor: 'pointer',
                    background: '#faf9f7',
                    textAlign: 'center',
                    verticalAlign: 'bottom',
                  }}
                >
                  <span style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#44403a',
                    lineHeight: '15px',
                    userSelect: 'none',
                    display: 'block',
                  }}>
                    {composite.name}
                  </span>
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
                  {visibleComposites.map(composite => (
                    <td
                      key={composite.id}
                      style={{
                        width: 120,
                        minWidth: 100,
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
