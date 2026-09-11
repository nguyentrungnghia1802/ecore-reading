export type LayoutProfileId = 'hierarchy-down' | 'hierarchy-right' | 'compact';

export interface LayoutProfile {
  id: LayoutProfileId;
  elkOptions: Readonly<Record<string, string>>;
}

export const LAYOUT_PROFILES: Readonly<Record<LayoutProfileId, LayoutProfile>> = {
  'hierarchy-down': {
    id: 'hierarchy-down',
    elkOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.layered.spacing.nodeNodeBetweenLayers': '90',
      'elk.spacing.nodeNode': '50',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.randomSeed': '1',
    },
  },
  'hierarchy-right': {
    id: 'hierarchy-right',
    elkOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.layered.spacing.nodeNodeBetweenLayers': '90',
      'elk.spacing.nodeNode': '50',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.randomSeed': '1',
    },
  },
  compact: {
    id: 'compact',
    elkOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.layered.spacing.nodeNodeBetweenLayers': '42',
      'elk.spacing.nodeNode': '24',
      'elk.randomSeed': '1',
    },
  },
};

export function getLayoutProfile(id: LayoutProfileId): LayoutProfile {
  return LAYOUT_PROFILES[id];
}
