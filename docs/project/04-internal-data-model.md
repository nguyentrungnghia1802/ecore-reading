# 04 — Internal Data Model

## 1. Boundary rule

Use four intentionally different models:

```text
RawEcoreDocument
      ↓ resolve/validate
EcoreModel
      ↓ semantic mapping/filtering
DiagramModel
      ↓ layout
LayoutModel
```

Do not reuse React Flow `Node`/`Edge` types as domain types.

## 2. ID strategy

IDs must be deterministic for the same document structure.

Recommended canonical form:

```text
pkg:<package-path>
classifier:<package-path>/<classifier-name>
feature:<classifier-id>/<feature-kind>/<feature-name>/<ordinal>
operation:<classifier-id>/operation/<name>/<ordinal>
parameter:<operation-id>/parameter/<name>/<ordinal>
literal:<enum-id>/literal/<name>/<ordinal>
```

`ordinal` disambiguates legal or malformed duplicate names without pretending they are the same element.

Do not use random UUIDs for semantic identities.

## 3. Diagnostics

```ts
export type DiagnosticSeverity = 'info' | 'warning' | 'error';

export interface Diagnostic {
  id: string;
  code: string;
  severity: DiagnosticSeverity;
  message: string;
  semanticId?: string;
  rawReference?: string;
  path?: string;
}
```

Diagnostic codes are stable API-like identifiers, for example:

- `XML_PARSE_ERROR`
- `ECORE_PACKAGE_NOT_FOUND`
- `ECORE_UNKNOWN_CLASSIFIER_KIND`
- `ECORE_UNRESOLVED_LOCAL_REFERENCE`
- `ECORE_UNRESOLVED_EXTERNAL_REFERENCE`
- `ECORE_INVALID_BOUNDS`
- `ECORE_INVALID_OPPOSITE`
- `ECORE_INHERITANCE_CYCLE`

## 4. Reference types

```ts
export type ResolvedClassifierRef =
  | { kind: 'local'; classifierId: string; raw: string }
  | { kind: 'builtin'; builtinId: string; displayName: string; raw: string }
  | {
      kind: 'external';
      rawUri: string;
      fragment: string | null;
      raw: string;
      resolution: 'unresolved';
    };
```

A reference must never become `string | undefined` after semantic resolution. Unresolved is a valid explicit state.

## 5. Multiplicity

```ts
export interface Multiplicity {
  lower: number;
  upper: number | 'unbounded';
}
```

Normalize `-1` to `'unbounded'` at the semantic boundary while retaining the raw integer in source metadata.

## 6. Generic type

```ts
export interface GenericTypeRef {
  classifier?: ResolvedClassifierRef;
  typeParameterId?: string;
  upperBound?: GenericTypeRef;
  lowerBound?: GenericTypeRef;
  typeArguments: GenericTypeRef[];
  raw?: string;
}
```

## 7. Ecore semantic entities

```ts
export interface EcoreModel {
  sourceName: string;
  packages: EcorePackage[];
  classifierById: ReadonlyMap<string, EcoreClassifier>;
  featureById: ReadonlyMap<string, EcoreFeature>;
  diagnostics: Diagnostic[];
}

export interface EcorePackage {
  id: string;
  name: string;
  nsURI?: string;
  nsPrefix?: string;
  parentPackageId?: string;
  classifierIds: string[];
  subpackageIds: string[];
  annotations: EcoreAnnotation[];
  source: SourceMetadata;
}

export type EcoreClassifier = EcoreClass | EcoreEnum | EcoreDataType;

export interface EcoreClass {
  kind: 'class';
  id: string;
  packageId: string;
  name: string;
  abstract: boolean;
  interface: boolean;
  superTypeRefs: ResolvedClassifierRef[];
  attributeIds: string[];
  referenceIds: string[];
  operationIds: string[];
  typeParameters: EcoreTypeParameter[];
  annotations: EcoreAnnotation[];
  source: SourceMetadata;
}
```

Define similarly focused interfaces for enum, datatype, attribute, reference, operation, parameter, annotation, and type parameter. Keep each entity serializable; construct Maps in indexes, not inside individual entities.

## 8. EReference semantic shape

```ts
export interface EcoreReference {
  kind: 'reference';
  id: string;
  ownerClassId: string;
  name: string;
  target: ResolvedClassifierRef;
  multiplicity: Multiplicity;
  containment: boolean;
  oppositeReferenceId?: string;
  resolveProxies: boolean;
  ordered: boolean;
  unique: boolean;
  changeable: boolean;
  volatile: boolean;
  transient: boolean;
  derived: boolean;
  unsettable: boolean;
  annotations: EcoreAnnotation[];
  source: SourceMetadata;
}
```

## 9. Diagram model

DiagramModel contains **presentation semantics**, not coordinates.

```ts
export type DiagramNodeKind = 'class' | 'enum' | 'datatype' | 'external';
export type DiagramRelationKind =
  | 'generalization'
  | 'association'
  | 'composition'
  | 'external-reference';

export interface DiagramModel {
  nodes: DiagramNode[];
  relations: DiagramRelation[];
  sourceSemanticIds: Set<string>;
  diagnostics: Diagnostic[];
}

export interface DiagramNode {
  id: string;
  semanticId: string;
  kind: DiagramNodeKind;
  title: string;
  stereotype?: string;
  rows: DiagramRow[];
  badges: DiagramBadge[];
}
```

## 10. Association end model

Use explicit ends so labels and multiplicities do not become ambiguous:

```ts
export interface AssociationEnd {
  classifierId: string;
  roleName?: string;
  multiplicity?: Multiplicity;
  navigable: boolean;
  sourceReferenceId?: string;
}

export interface DiagramRelation {
  id: string;
  kind: DiagramRelationKind;
  sourceNodeId: string;
  targetNodeId: string;
  sourceEnd?: AssociationEnd;
  targetEnd?: AssociationEnd;
  semanticIds: string[];
}
```

For an opposite pair, `semanticIds` contains both EReference IDs.

## 11. Layout model

```ts
export interface Point { x: number; y: number }
export interface Size { width: number; height: number }

export interface LayoutNode extends DiagramNode {
  position: Point;
  size: Size;
}

export interface LayoutRelation extends DiagramRelation {
  sections: Array<{
    start: Point;
    bendPoints: Point[];
    end: Point;
  }>;
}

export interface LayoutModel {
  nodes: LayoutNode[];
  relations: LayoutRelation[];
  bounds: { x: number; y: number; width: number; height: number };
  profileId: string;
}
```

## 12. Source metadata

Retain enough source data to explain what the parser saw without binding the entire application to DOM nodes.

```ts
export interface SourceMetadata {
  elementName: string;
  xmiId?: string;
  path: string;
  rawAttributes: Readonly<Record<string, string>>;
}
```

Avoid storing live `Element` DOM references in long-lived application state.
