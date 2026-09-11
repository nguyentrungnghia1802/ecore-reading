import type { Diagnostic, EcoreClassifier, EcoreModel } from '../../ecore/model';
import type { DiagramBadge, DiagramModel, DiagramNode } from '../model';
import { mapRelations } from './map-relations';
import { buildNodeRows } from './node-rows';
import type { DiagramOptions } from './options';

function stereotype(classifier: EcoreClassifier): string | undefined {
  if (classifier.kind === 'enum') return '«enumeration»';
  if (classifier.kind === 'datatype') return '«datatype»';
  if (classifier.interface) return '«interface»';
  if (classifier.abstract) return '«abstract»';
  return undefined;
}

function badges(model: EcoreModel, semanticId: string): DiagramBadge[] {
  return model.diagnostics
    .filter((diagnostic) => diagnostic.semanticId === semanticId)
    .map((diagnostic) => ({
      id: `badge:${diagnostic.id}`,
      semanticId,
      label: diagnostic.code,
      tone: diagnostic.severity,
    }));
}

function mapNode(
  classifier: EcoreClassifier,
  model: EcoreModel,
  options: DiagramOptions,
): DiagramNode {
  const classifierStereotype = stereotype(classifier);
  return {
    id: `node:${classifier.id}`,
    semanticId: classifier.id,
    kind: classifier.kind,
    title: classifier.name,
    ...(classifierStereotype === undefined ? {} : { stereotype: classifierStereotype }),
    rows: buildNodeRows(classifier, model, options.detailMode),
    badges: badges(model, classifier.id),
  };
}

export function validateDiagramInvariants(diagram: DiagramModel): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const nodeIds = new Set<string>();
  const relationIds = new Set<string>();
  for (const node of diagram.nodes) {
    if (nodeIds.has(node.id)) {
      diagnostics.push({
        id: `DIAGRAM_DUPLICATE_NODE_ID:${node.id}`,
        code: 'DIAGRAM_DUPLICATE_NODE_ID',
        severity: 'error',
        message: `Diagram node ID "${node.id}" is duplicated.`,
        semanticId: node.semanticId,
      });
    }
    nodeIds.add(node.id);
  }
  for (const relation of diagram.relations) {
    if (relationIds.has(relation.id)) {
      diagnostics.push({
        id: `DIAGRAM_DUPLICATE_RELATION_ID:${relation.id}`,
        code: 'DIAGRAM_DUPLICATE_RELATION_ID',
        severity: 'error',
        message: `Diagram relation ID "${relation.id}" is duplicated.`,
      });
    }
    relationIds.add(relation.id);
    if (!nodeIds.has(relation.sourceNodeId) || !nodeIds.has(relation.targetNodeId)) {
      diagnostics.push({
        id: `DIAGRAM_DANGLING_RELATION:${relation.id}`,
        code: 'DIAGRAM_DANGLING_RELATION',
        severity: 'error',
        message: `Diagram relation "${relation.id}" has a missing endpoint.`,
      });
    }
    if (relation.semanticIds.length === 0) {
      diagnostics.push({
        id: `DIAGRAM_MISSING_SEMANTIC_ID:${relation.id}`,
        code: 'DIAGRAM_MISSING_SEMANTIC_ID',
        severity: 'error',
        message: `Diagram relation "${relation.id}" has no source semantic identity.`,
      });
    }
  }
  return diagnostics;
}

export function buildDiagram(model: EcoreModel, options: DiagramOptions): DiagramModel {
  const visibleClassifierIds = new Set(
    model.classifiers
      .filter(
        (classifier) =>
          options.focusSemanticIds === undefined || options.focusSemanticIds.has(classifier.id),
      )
      .map((classifier) => classifier.id),
  );
  const localNodes = model.classifiers
    .filter((classifier) => visibleClassifierIds.has(classifier.id))
    .map((classifier) => mapNode(classifier, model, options));
  const mapping = mapRelations(model, visibleClassifierIds, options);
  const nodes = [...localNodes, ...mapping.externalNodes];
  const sourceSemanticIds = new Set<string>(localNodes.map((node) => node.semanticId));
  mapping.relations.forEach((relation) =>
    relation.semanticIds.forEach((semanticId) => sourceSemanticIds.add(semanticId)),
  );
  const diagram: DiagramModel = {
    nodes,
    relations: mapping.relations,
    sourceSemanticIds,
    diagnostics: [...model.diagnostics],
  };
  return {
    ...diagram,
    diagnostics: [...diagram.diagnostics, ...validateDiagramInvariants(diagram)],
  };
}

export type { DiagramOptions } from './options';
