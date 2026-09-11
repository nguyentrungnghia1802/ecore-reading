import { describe, expect, it } from 'vitest';
import type {
  EcoreAttribute,
  EcoreClass,
  EcoreClassifier,
  EcoreFeature,
  EcoreModel,
  EcoreReference,
  SourceMetadata,
} from '../../ecore/model';
import { buildDiagram, validateDiagramInvariants } from './build-diagram';

const source: SourceMetadata = {
  elementName: 'test',
  path: '/test',
  rawAttributes: {},
};

function eClass(id: string, overrides: Partial<EcoreClass> = {}): EcoreClass {
  return {
    kind: 'class',
    id,
    packageId: 'pkg:test',
    name: id.split(':').at(-1) ?? id,
    abstract: false,
    interface: false,
    superTypeRefs: [],
    attributeIds: [],
    referenceIds: [],
    operationIds: [],
    typeParameters: [],
    annotations: [],
    source,
    ...overrides,
  };
}

function reference(
  id: string,
  owner: EcoreClass,
  target: EcoreClass,
  overrides: Partial<EcoreReference> = {},
): EcoreReference {
  const targetRef = { kind: 'local' as const, classifierId: target.id, raw: `#//${target.name}` };
  return {
    kind: 'reference',
    id,
    ownerClassId: owner.id,
    name: id.split(':').at(-1) ?? id,
    type: targetRef,
    target: targetRef,
    multiplicity: { lower: 0, upper: 1 },
    containment: false,
    resolveProxies: true,
    ordered: true,
    unique: true,
    changeable: true,
    volatile: false,
    transient: false,
    derived: false,
    unsettable: false,
    annotations: [],
    source,
    ...overrides,
  };
}

function attribute(id: string, owner: EcoreClass): EcoreAttribute {
  return {
    kind: 'attribute',
    id,
    ownerClassId: owner.id,
    name: 'title',
    type: {
      kind: 'builtin',
      builtinId: 'ecore:EString',
      displayName: 'EString',
      raw: 'http://www.eclipse.org/emf/2002/Ecore#//EString',
    },
    multiplicity: { lower: 0, upper: 1 },
    ordered: true,
    unique: true,
    changeable: true,
    volatile: false,
    transient: false,
    derived: false,
    unsettable: false,
    idAttribute: false,
    annotations: [],
    source,
  };
}

function semanticModel(
  classifiers: EcoreClassifier[],
  features: EcoreFeature[] = [],
): EcoreModel {
  const classes = classifiers.filter((item): item is EcoreClass => item.kind === 'class');
  for (const classifier of classes) {
    classifier.attributeIds = features
      .filter((item) => item.kind === 'attribute' && item.ownerClassId === classifier.id)
      .map((item) => item.id);
    classifier.referenceIds = features
      .filter((item) => item.kind === 'reference' && item.ownerClassId === classifier.id)
      .map((item) => item.id);
  }
  const pkg = {
    id: 'pkg:test',
    name: 'test',
    classifierIds: classifiers.map((item) => item.id),
    subpackageIds: [],
    annotations: [],
    source,
  };
  return {
    sourceName: 'test.ecore',
    packages: [pkg],
    classifiers,
    features,
    operations: [],
    packageById: new Map([[pkg.id, pkg]]),
    classifierById: new Map(classifiers.map((item) => [item.id, item])),
    featureById: new Map(features.map((item) => [item.id, item])),
    operationById: new Map(),
    parameterById: new Map(),
    typeParameterById: new Map(),
    diagnostics: [],
  };
}

describe('buildDiagram', () => {
  it('maps EClass, EEnum and user EDataType to semantic node kinds and stereotypes', () => {
    const abstract = eClass('class:Abstract', { abstract: true });
    const enumeration: EcoreClassifier = {
      kind: 'enum', id: 'enum:State', packageId: 'pkg:test', name: 'State',
      serializable: true, literals: [], typeParameters: [], annotations: [], source,
    };
    const datatype: EcoreClassifier = {
      kind: 'datatype', id: 'datatype:Money', packageId: 'pkg:test', name: 'Money',
      serializable: true, typeParameters: [], annotations: [], source,
    };

    const diagram = buildDiagram(semanticModel([abstract, enumeration, datatype]), {
      detailMode: 'standard',
      externalReferences: 'omit',
    });

    expect(diagram.nodes.map((node) => [node.kind, node.stereotype])).toEqual([
      ['class', '«abstract»'],
      ['enum', '«enumeration»'],
      ['datatype', '«datatype»'],
    ]);
  });

  it('maps every local supertype from subclass to superclass', () => {
    const left = eClass('class:Left');
    const right = eClass('class:Right');
    const child = eClass('class:Child', {
      superTypeRefs: [
        { kind: 'local', classifierId: left.id, raw: '#//Left' },
        { kind: 'local', classifierId: right.id, raw: '#//Right' },
      ],
    });
    const diagram = buildDiagram(semanticModel([left, right, child]), {
      detailMode: 'overview', externalReferences: 'omit',
    });

    expect(diagram.relations).toEqual([
      expect.objectContaining({ kind: 'generalization', sourceNodeId: `node:${child.id}`, targetNodeId: `node:${left.id}` }),
      expect.objectContaining({ kind: 'generalization', sourceNodeId: `node:${child.id}`, targetNodeId: `node:${right.id}` }),
    ]);
  });

  it('places a one-way reference role and multiplicity at the navigable target end', () => {
    const owner = eClass('class:Owner');
    const target = eClass('class:Target');
    const relation = reference('ref:roles', owner, target, {
      name: 'roles',
      multiplicity: { lower: 0, upper: 'unbounded' },
    });
    const diagram = buildDiagram(semanticModel([owner, target], [relation]), {
      detailMode: 'standard', externalReferences: 'omit',
    });

    expect(diagram.relations[0]).toMatchObject({
      kind: 'association',
      sourceNodeId: `node:${owner.id}`,
      targetNodeId: `node:${target.id}`,
      sourceEnd: { classifierId: owner.id, navigable: false },
      targetEnd: {
        classifierId: target.id,
        roleName: 'roles',
        multiplicity: { lower: 0, upper: 'unbounded' },
        navigable: true,
        sourceReferenceId: relation.id,
      },
      semanticIds: [relation.id],
    });
  });

  it('merges a valid opposite pair into one bidirectional association retaining both IDs', () => {
    const a = eClass('class:A');
    const b = eClass('class:B');
    const ab = reference('ref:A.bs', a, b, { name: 'bs', oppositeReferenceId: 'ref:B.a' });
    const ba = reference('ref:B.a', b, a, { name: 'a', oppositeReferenceId: ab.id });
    const diagram = buildDiagram(semanticModel([a, b], [ab, ba]), {
      detailMode: 'standard', externalReferences: 'omit',
    });

    expect(diagram.relations).toHaveLength(1);
    expect(diagram.relations[0]).toMatchObject({
      kind: 'association',
      semanticIds: [ab.id, ba.id],
      sourceEnd: { roleName: 'a', navigable: true, sourceReferenceId: ba.id },
      targetEnd: { roleName: 'bs', navigable: true, sourceReferenceId: ab.id },
    });
  });

  it('canonicalizes containment to the container source even when declared second', () => {
    const folder = eClass('class:Folder');
    const document = eClass('class:Document');
    const inverse = reference('ref:Document.folder', document, folder, {
      name: 'folder', oppositeReferenceId: 'ref:Folder.documents',
    });
    const containment = reference('ref:Folder.documents', folder, document, {
      name: 'documents', containment: true, oppositeReferenceId: inverse.id,
      multiplicity: { lower: 0, upper: 'unbounded' },
    });
    const diagram = buildDiagram(semanticModel([folder, document], [inverse, containment]), {
      detailMode: 'standard', externalReferences: 'omit',
    });

    expect(diagram.relations).toHaveLength(1);
    expect(diagram.relations[0]).toMatchObject({
      kind: 'composition',
      sourceNodeId: `node:${folder.id}`,
      targetNodeId: `node:${document.id}`,
      semanticIds: [containment.id, inverse.id],
    });
    expect(diagram.relations[0]?.sourceEnd).toMatchObject({
      roleName: 'folder',
      sourceReferenceId: inverse.id,
    });
    expect(diagram.relations[0]?.targetEnd).toMatchObject({
      roleName: 'documents',
      sourceReferenceId: containment.id,
    });
  });

  it('keeps parallel and self references as unique relations', () => {
    const a = eClass('class:A');
    const b = eClass('class:B');
    const refs = [
      reference('ref:primary', a, b),
      reference('ref:secondary', a, b),
      reference('ref:self', a, a),
    ];
    const diagram = buildDiagram(semanticModel([a, b], refs), {
      detailMode: 'standard', externalReferences: 'omit',
    });

    expect(diagram.relations.map((relation) => relation.id)).toHaveLength(3);
    expect(new Set(diagram.relations.map((relation) => relation.id)).size).toBe(3);
    expect(diagram.relations.at(-1)).toMatchObject({
      sourceNodeId: `node:${a.id}`, targetNodeId: `node:${a.id}`,
    });
  });

  it('creates an explicitly unresolved placeholder only when requested', () => {
    const owner = eClass('class:Owner');
    const external = reference('ref:remote', owner, owner, {
      target: {
        kind: 'external', rawUri: 'remote.ecore', fragment: '//Remote',
        raw: 'remote.ecore#//Remote', resolution: 'unresolved',
      },
      type: {
        kind: 'external', rawUri: 'remote.ecore', fragment: '//Remote',
        raw: 'remote.ecore#//Remote', resolution: 'unresolved',
      },
    });
    const model = semanticModel([owner], [external]);

    expect(buildDiagram(model, { detailMode: 'standard', externalReferences: 'omit' }).relations).toEqual([]);
    const included = buildDiagram(model, { detailMode: 'standard', externalReferences: 'placeholder' });
    expect(included.nodes[1]).toMatchObject({ kind: 'external', title: 'Remote', stereotype: '«external unresolved»' });
    expect(included.relations[0]).toMatchObject({ kind: 'external-reference', semanticIds: [external.id] });
  });

  it('builds distinct deterministic rows for overview, standard, detailed and Ecore modes', () => {
    const owner = eClass('class:Owner');
    const title = attribute('attr:title', owner);
    const peer = reference('ref:peer', owner, owner, { derived: true, containment: true });
    const model = semanticModel([owner], [title, peer]);
    const rows = (detailMode: 'overview' | 'standard' | 'detailed' | 'ecore') =>
      buildDiagram(model, { detailMode, externalReferences: 'omit' }).nodes[0]?.rows ?? [];

    expect(rows('overview')).toEqual([]);
    expect(rows('standard').map((row) => row.kind)).toEqual(['attribute']);
    expect(rows('detailed')[0]?.primaryText).toContain('title : EString');
    expect(rows('ecore').map((row) => row.primaryText.at(0))).toEqual(['A', 'R']);
    expect(rows('ecore')[1]?.secondaryText).toContain('containment=true');
  });

  it('is deep-deterministic and satisfies mapper invariants', () => {
    const a = eClass('class:A');
    const b = eClass('class:B');
    const model = semanticModel([a, b], [reference('ref:a-b', a, b)]);
    const options = { detailMode: 'standard' as const, externalReferences: 'omit' as const };
    const first = buildDiagram(model, options);

    expect(first).toEqual(buildDiagram(model, options));
    expect(validateDiagramInvariants(first)).toEqual([]);
    expect(first.sourceSemanticIds).toEqual(new Set([a.id, b.id, 'ref:a-b']));
  });
});
