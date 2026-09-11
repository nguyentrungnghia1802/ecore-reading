import ELK from 'elkjs/lib/elk.bundled.js';
import type { ElkExtendedEdge, ElkNode } from 'elkjs/lib/elk-api';
import type { SizedDiagram, SizedDiagramRelation } from '../../diagram/sizing';
import type { LayoutModel, LayoutNode, LayoutSection, Point } from '../model';
import type { LayoutProfile } from '../profiles/layout-profiles';
import { validateLayoutModel } from '../validation/validate-layout';
import { toElkGraph } from './elk-graph';

export interface ElkLayoutEngine {
  layout(graph: ElkNode): Promise<ElkNode>;
}

function valueOrDefault(value: number | undefined, fallback = 0): number {
  return value === undefined ? fallback : value;
}

function sectionFromElk(edge: ElkExtendedEdge): LayoutSection[] {
  return (edge.sections ?? []).map((section) => ({
    start: { x: valueOrDefault(section.startPoint.x), y: valueOrDefault(section.startPoint.y) },
    bendPoints: (section.bendPoints ?? []).map((point) => ({
      x: valueOrDefault(point.x),
      y: valueOrDefault(point.y),
    })),
    end: { x: valueOrDefault(section.endPoint.x), y: valueOrDefault(section.endPoint.y) },
  }));
}

function center(node: LayoutNode): Point {
  return {
    x: node.position.x + node.size.width / 2,
    y: node.position.y + node.size.height / 2,
  };
}

function fallbackSection(
  relation: SizedDiagramRelation,
  nodes: ReadonlyMap<string, LayoutNode>,
): LayoutSection {
  const source = nodes.get(relation.sourceNodeId);
  const target = nodes.get(relation.targetNodeId);
  if (source === undefined || target === undefined) {
    return { start: { x: 0, y: 0 }, bendPoints: [], end: { x: 0, y: 0 } };
  }
  if (source.id === target.id) {
    const right = source.position.x + source.size.width;
    const top = source.position.y;
    return {
      start: { x: right, y: top + source.size.height / 2 },
      bendPoints: [
        { x: right + 32, y: top + source.size.height / 2 },
        { x: right + 32, y: top - 32 },
        { x: right - source.size.width / 2, y: top - 32 },
      ],
      end: { x: right - source.size.width / 2, y: top },
    };
  }
  return { start: center(source), bendPoints: [], end: center(target) };
}

function convertLayout(
  input: SizedDiagram,
  graph: ElkNode,
  profile: LayoutProfile,
): LayoutModel {
  const elkNodes = new Map((graph.children ?? []).map((node) => [node.id, node]));
  const nodes: LayoutNode[] = input.nodes.map((sized) => {
    const elkNode = elkNodes.get(sized.id);
    return {
      id: sized.id,
      semanticId: sized.semanticId,
      kind: sized.kind,
      title: sized.title,
      ...(sized.stereotype === undefined ? {} : { stereotype: sized.stereotype }),
      rows: sized.rows,
      badges: sized.badges,
      position: { x: valueOrDefault(elkNode?.x), y: valueOrDefault(elkNode?.y) },
      size: {
        width: valueOrDefault(elkNode?.width, sized.size.width),
        height: valueOrDefault(elkNode?.height, sized.size.height),
      },
    };
  });
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const elkEdges = new Map((graph.edges ?? []).map((edge) => [edge.id, edge]));
  const relations = input.relations.map((sized) => {
    const edge = elkEdges.get(sized.id);
    const sections = edge === undefined ? [] : sectionFromElk(edge);
    return {
      id: sized.id,
      kind: sized.kind,
      sourceNodeId: sized.sourceNodeId,
      targetNodeId: sized.targetNodeId,
      ...(sized.sourceEnd === undefined ? {} : { sourceEnd: sized.sourceEnd }),
      ...(sized.targetEnd === undefined ? {} : { targetEnd: sized.targetEnd }),
      semanticIds: sized.semanticIds,
      sections: sections.length === 0 ? [fallbackSection(sized, nodeById)] : sections,
    };
  });
  return {
    nodes,
    relations,
    bounds: {
      x: valueOrDefault(graph.x),
      y: valueOrDefault(graph.y),
      width: Math.max(0, valueOrDefault(graph.width)),
      height: Math.max(0, valueOrDefault(graph.height)),
    },
    profileId: profile.id,
  };
}

export async function layoutSizedDiagram(
  input: SizedDiagram,
  profile: LayoutProfile,
  engine: ElkLayoutEngine = new ELK(),
): Promise<LayoutModel> {
  const graph = await engine.layout(toElkGraph(input, profile));
  const result = convertLayout(input, graph, profile);
  const diagnostics = validateLayoutModel(result, input);
  if (diagnostics.length > 0) {
    throw new Error(diagnostics.map((diagnostic) => diagnostic.message).join(' '));
  }
  return result;
}
