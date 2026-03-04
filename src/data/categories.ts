export type CategoryId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I';

export interface Category {
  name: string;
  color: string;
  layer: number;
}

export const CATEGORIES: Record<CategoryId, Category> = {
  A: { name: 'Erasure coding',               color: '#2563eb', layer: 0 },
  B: { name: 'Messaging',                    color: '#7c3aed', layer: 1 },
  C: { name: 'Subnet topology',              color: '#0891b2', layer: 1 },
  D: { name: 'Overhead reduction',           color: '#059669', layer: 2 },
  E: { name: 'Reconstruction / Engine API',  color: '#d97706', layer: 3 },
  F: { name: 'Publisher optimization',       color: '#dc2626', layer: 4 },
  G: { name: 'Mempool techniques',           color: '#be185d', layer: 5 },
  H: { name: 'Security / sampling',          color: '#4338ca', layer: 6 },
  I: { name: 'Propagation scheduling',       color: '#0d9488', layer: 7 },
};
