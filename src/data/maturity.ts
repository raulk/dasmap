export const MATURITY_LABELS = ['', 'Idea', "Spec'd", 'Draft impl', 'Tested', 'Shipped'] as const;
export const MATURITY_COLORS = ['', '#f87171', '#fb923c', '#facc15', '#a3e635', '#34d399'] as const;

export const STAGE_LABELS = MATURITY_LABELS;
export const STAGE_COLORS = MATURITY_COLORS;

export type MaturityLevel = 1 | 2 | 3 | 4 | 5;
