import type { Diagnostic } from './diagnostic';
import type { Multiplicity } from './multiplicity';
import type { SourceMetadata } from './source-metadata';

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

export interface GenericTypeRef {
  classifier?: ResolvedClassifierRef;
  typeParameterId?: string;
  upperBound?: GenericTypeRef;
  lowerBound?: GenericTypeRef;
  typeArguments: GenericTypeRef[];
  raw?: string;
}

export interface EcoreAnnotation {
  source?: string;
  details: Readonly<Record<string, string>>;
  references: string[];
  contents: ReadonlyArray<Readonly<Record<string, string>>>;
  sourceMetadata: SourceMetadata;
}

export interface EcoreTypeParameter {
  id: string;
  ownerId: string;
  name: string;
  bounds: GenericTypeRef[];
  annotations: EcoreAnnotation[];
  source: SourceMetadata;
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

interface EcoreClassifierBase {
  id: string;
  packageId: string;
  name: string;
  annotations: EcoreAnnotation[];
  source: SourceMetadata;
}

export interface EcoreClass extends EcoreClassifierBase {
  kind: 'class';
  abstract: boolean;
  interface: boolean;
  superTypeRefs: ResolvedClassifierRef[];
  attributeIds: string[];
  referenceIds: string[];
  operationIds: string[];
  typeParameters: EcoreTypeParameter[];
}

export interface EcoreEnumLiteral {
  id: string;
  ownerEnumId: string;
  name: string;
  value: number;
  literal: string;
  annotations: EcoreAnnotation[];
  source: SourceMetadata;
}

export interface EcoreEnum extends EcoreClassifierBase {
  kind: 'enum';
  instanceClassName?: string;
  instanceTypeName?: string;
  serializable: boolean;
  literals: EcoreEnumLiteral[];
  typeParameters: EcoreTypeParameter[];
}

export interface EcoreDataType extends EcoreClassifierBase {
  kind: 'datatype';
  instanceClassName?: string;
  instanceTypeName?: string;
  serializable: boolean;
  typeParameters: EcoreTypeParameter[];
}

interface EcoreTypedElement {
  type: ResolvedClassifierRef | null;
  genericType?: GenericTypeRef;
  multiplicity: Multiplicity;
  ordered: boolean;
  unique: boolean;
}

interface EcoreStructuralFeatureBase extends EcoreTypedElement {
  id: string;
  ownerClassId: string;
  name: string;
  changeable: boolean;
  volatile: boolean;
  transient: boolean;
  derived: boolean;
  unsettable: boolean;
  defaultValueLiteral?: string;
  annotations: EcoreAnnotation[];
  source: SourceMetadata;
}

export interface EcoreAttribute extends EcoreStructuralFeatureBase {
  kind: 'attribute';
  idAttribute: boolean;
}

export interface EcoreReference extends EcoreStructuralFeatureBase {
  kind: 'reference';
  target: ResolvedClassifierRef | null;
  containment: boolean;
  oppositeReferenceId?: string;
  rawOpposite?: string;
  resolveProxies: boolean;
}

export type EcoreFeature = EcoreAttribute | EcoreReference;

export interface EcoreParameter extends EcoreTypedElement {
  id: string;
  ownerOperationId: string;
  name: string;
  annotations: EcoreAnnotation[];
  source: SourceMetadata;
}

export interface EcoreOperation extends EcoreTypedElement {
  id: string;
  ownerClassId: string;
  name: string;
  parameterIds: string[];
  parameters: EcoreParameter[];
  exceptionRefs: ResolvedClassifierRef[];
  typeParameters: EcoreTypeParameter[];
  annotations: EcoreAnnotation[];
  source: SourceMetadata;
}

export type EcoreClassifier = EcoreClass | EcoreEnum | EcoreDataType;

export interface EcoreModel {
  sourceName: string;
  packages: EcorePackage[];
  classifiers: EcoreClassifier[];
  features: EcoreFeature[];
  operations: EcoreOperation[];
  classifierById: ReadonlyMap<string, EcoreClassifier>;
  featureById: ReadonlyMap<string, EcoreFeature>;
  operationById: ReadonlyMap<string, EcoreOperation>;
  packageById: ReadonlyMap<string, EcorePackage>;
  parameterById: ReadonlyMap<string, EcoreParameter>;
  typeParameterById: ReadonlyMap<string, EcoreTypeParameter>;
  diagnostics: Diagnostic[];
}
