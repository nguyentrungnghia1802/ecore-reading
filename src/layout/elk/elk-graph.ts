import type { ElkNode } from 'elkjs/lib/elk-api';
import type { SizedDiagram } from '../../diagram/sizing';
import type { LayoutProfile } from '../profiles/layout-profiles';

export function toElkGraph(diagram: SizedDiagram, profile: LayoutProfile): ElkNode {
  return {
    id: 'root',
    layoutOptions: profile.elkOptions,
    children: diagram.nodes.map((node) => ({
      id: node.id,
      width: node.size.width,
      height: node.size.height,
      layoutOptions: { 'elk.portConstraints': 'FIXED_SIDE' },
      ports: node.ports.map((port, index) => ({
        id: port.id,
        width: 1,
        height: 1,
        layoutOptions: {
          'elk.port.side': port.side.toUpperCase(),
          'elk.port.index': String(index),
        },
      })),
    })),
    edges: diagram.relations.map((relation) => ({
      id: relation.id,
      sources: [relation.sourcePortId ?? relation.sourceNodeId],
      targets: [relation.targetPortId ?? relation.targetNodeId],
    })),
  };
}
