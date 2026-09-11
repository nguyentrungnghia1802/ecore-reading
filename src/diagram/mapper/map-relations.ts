import type {
  EcoreModel,
  EcoreReference,
  ResolvedClassifierRef,
} from '../../ecore/model';
import { collectValidatedOppositePairs } from '../../ecore/validation';
import type { DiagramNode, DiagramRelation, DiagramRelationKind } from '../model';
import type { DiagramOptions } from './options';

interface RelationMapping {
  relations: DiagramRelation[];
  externalNodes: DiagramNode[];
}

function nodeId(semanticId: string): string {
  return `node:${semanticId}`;
}

function relationEnabled(kind: DiagramRelationKind, options: DiagramOptions): boolean {
  return options.visibleRelationKinds?.has(kind) ?? true;
}

function externalIdentity(reference: Extract<ResolvedClassifierRef, { kind: 'external' }>): string {
  return `${reference.rawUri}#${reference.fragment ?? ''}`;
}

function externalTitle(reference: Extract<ResolvedClassifierRef, { kind: 'external' }>): string {
  return reference.fragment?.split('/').filter(Boolean).at(-1) ?? reference.rawUri;
}

function associationFor(reference: EcoreReference): DiagramRelation | null {
  if (reference.target?.kind !== 'local') return null;
  return {
    id: `relation:reference:${reference.id}`,
    kind: reference.containment ? 'composition' : 'association',
    sourceNodeId: nodeId(reference.ownerClassId),
    targetNodeId: nodeId(reference.target.classifierId),
    sourceEnd: { classifierId: reference.ownerClassId, navigable: false },
    targetEnd: {
      classifierId: reference.target.classifierId,
      roleName: reference.name,
      multiplicity: reference.multiplicity,
      navigable: true,
      sourceReferenceId: reference.id,
    },
    semanticIds: [reference.id],
  };
}

function oppositeAssociation(
  first: EcoreReference,
  second: EcoreReference,
): DiagramRelation | null {
  const containment = first.containment ? first : second.containment ? second : null;
  const sourceReference = containment ?? first;
  const inverse = sourceReference === first ? second : first;
  if (sourceReference.target?.kind !== 'local' || inverse.target?.kind !== 'local') return null;
  return {
    id: `relation:opposite:${[first.id, second.id].sort().join('|')}`,
    kind: containment === null ? 'association' : 'composition',
    sourceNodeId: nodeId(sourceReference.ownerClassId),
    targetNodeId: nodeId(sourceReference.target.classifierId),
    sourceEnd: {
      classifierId: sourceReference.ownerClassId,
      roleName: inverse.name,
      multiplicity: inverse.multiplicity,
      navigable: true,
      sourceReferenceId: inverse.id,
    },
    targetEnd: {
      classifierId: sourceReference.target.classifierId,
      roleName: sourceReference.name,
      multiplicity: sourceReference.multiplicity,
      navigable: true,
      sourceReferenceId: sourceReference.id,
    },
    semanticIds:
      containment === null ? [first.id, second.id] : [sourceReference.id, inverse.id],
  };
}

function externalRelation(
  ownerId: string,
  semanticId: string,
  target: Extract<ResolvedClassifierRef, { kind: 'external' }>,
): { node: DiagramNode; relation: DiagramRelation } {
  const identity = externalIdentity(target);
  const externalSemanticId = `external:${encodeURIComponent(identity)}`;
  const targetNodeId = nodeId(externalSemanticId);
  return {
    node: {
      id: targetNodeId,
      semanticId: externalSemanticId,
      kind: 'external',
      title: externalTitle(target),
      stereotype: '«external unresolved»',
      rows: [],
      badges: [],
    },
    relation: {
      id: `relation:external:${semanticId}`,
      kind: 'external-reference',
      sourceNodeId: nodeId(ownerId),
      targetNodeId,
      sourceEnd: { classifierId: ownerId, navigable: false },
      targetEnd: {
        classifierId: externalSemanticId,
        navigable: true,
        sourceReferenceId: semanticId,
      },
      semanticIds: [semanticId],
    },
  };
}

export function mapRelations(
  model: EcoreModel,
  visibleClassifierIds: ReadonlySet<string>,
  options: DiagramOptions,
): RelationMapping {
  const relations: DiagramRelation[] = [];
  const externalById = new Map<string, DiagramNode>();

  for (const classifier of model.classifiers) {
    if (classifier.kind !== 'class' || !visibleClassifierIds.has(classifier.id)) continue;
    classifier.superTypeRefs.forEach((superType, index) => {
      if (superType.kind === 'local' && visibleClassifierIds.has(superType.classifierId)) {
        if (relationEnabled('generalization', options)) {
          relations.push({
            id: `relation:generalization:${classifier.id}:${superType.classifierId}:${index}`,
            kind: 'generalization',
            sourceNodeId: nodeId(classifier.id),
            targetNodeId: nodeId(superType.classifierId),
            semanticIds: [classifier.id, superType.classifierId],
          });
        }
      } else if (
        superType.kind === 'external' &&
        options.externalReferences === 'placeholder' &&
        relationEnabled('external-reference', options)
      ) {
        const mapped = externalRelation(classifier.id, `${classifier.id}:super:${index}`, superType);
        externalById.set(mapped.node.id, mapped.node);
        relations.push(mapped.relation);
      }
    });
  }

  const references = model.features.filter(
    (feature): feature is EcoreReference => feature.kind === 'reference',
  );
  const referenceById = new Map(references.map((reference) => [reference.id, reference]));
  const consumed = new Set<string>();
  for (const pair of collectValidatedOppositePairs(model)) {
    const first = referenceById.get(pair.referenceIds[0]);
    const second = referenceById.get(pair.referenceIds[1]);
    if (first === undefined || second === undefined) continue;
    const relation = oppositeAssociation(first, second);
    if (
      relation !== null &&
      relationEnabled(relation.kind, options) &&
      visibleClassifierIds.has(first.ownerClassId) &&
      visibleClassifierIds.has(second.ownerClassId)
    ) {
      relations.push(relation);
    }
    consumed.add(first.id);
    consumed.add(second.id);
  }

  for (const reference of references) {
    if (consumed.has(reference.id) || !visibleClassifierIds.has(reference.ownerClassId)) continue;
    if (reference.target?.kind === 'local') {
      const relation = associationFor(reference);
      if (
        relation !== null &&
        visibleClassifierIds.has(reference.target.classifierId) &&
        relationEnabled(relation.kind, options)
      ) {
        relations.push(relation);
      }
    } else if (
      reference.target?.kind === 'external' &&
      options.externalReferences === 'placeholder' &&
      relationEnabled('external-reference', options)
    ) {
      const mapped = externalRelation(reference.ownerClassId, reference.id, reference.target);
      externalById.set(mapped.node.id, mapped.node);
      relations.push(mapped.relation);
    }
  }
  return { relations, externalNodes: [...externalById.values()] };
}
