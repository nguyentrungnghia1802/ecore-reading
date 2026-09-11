import type { Diagnostic, SourceMetadata } from '../model';

export interface RawEcoreDocument {
  sourceName: string;
  packages: RawEPackage[];
  diagnostics: Diagnostic[];
}

interface RawElement {
  path: string;
  sourceOrder: number;
  rawAttributes: Readonly<Record<string, string>>;
  metadata: SourceMetadata;
}

interface RawNamedElement extends RawElement {
  name?: string;
  annotations: RawEAnnotation[];
}

export interface RawEAnnotation extends RawElement {
  source?: string;
  details: Readonly<Record<string, string>>;
  references: string[];
  contents: ReadonlyArray<Readonly<Record<string, string>>>;
  annotations: RawEAnnotation[];
}

export interface RawEGenericType extends RawElement {
  rawType?: string;
  rawTypeParameter?: string;
  upperBound?: RawEGenericType;
  lowerBound?: RawEGenericType;
  typeArguments: RawEGenericType[];
  annotations: RawEAnnotation[];
}

export interface RawETypeParameter extends RawNamedElement {
  bounds: RawEGenericType[];
}

interface RawTypedElement extends RawNamedElement {
  rawType?: string;
  rawLowerBound?: string;
  rawUpperBound?: string;
  genericType?: RawEGenericType;
}

export interface RawEAttribute extends RawTypedElement {
  kind: 'attribute';
}

export interface RawEReference extends RawTypedElement {
  kind: 'reference';
  rawOpposite?: string;
}

export interface RawUnknownFeature extends RawTypedElement {
  kind: 'unknown';
  semanticType: string | null;
}

export type RawEStructuralFeature = RawEAttribute | RawEReference | RawUnknownFeature;

export type RawEParameter = RawTypedElement;

export interface RawEOperation extends RawTypedElement {
  parameters: RawEParameter[];
  typeParameters: RawETypeParameter[];
  rawExceptions: string[];
}

interface RawEClassifierBase extends RawNamedElement {
  semanticType: string | null;
  typeParameters: RawETypeParameter[];
}

export interface RawEClass extends RawEClassifierBase {
  kind: 'class';
  rawSuperTypes: string[];
  structuralFeatures: RawEStructuralFeature[];
  operations: RawEOperation[];
}

export type RawEEnumLiteral = RawNamedElement;

export interface RawEEnum extends RawEClassifierBase {
  kind: 'enum';
  literals: RawEEnumLiteral[];
}

export interface RawEDataType extends RawEClassifierBase {
  kind: 'datatype';
}

export interface RawUnknownClassifier extends RawEClassifierBase {
  kind: 'unknown';
}

export type RawEClassifier = RawEClass | RawEEnum | RawEDataType | RawUnknownClassifier;

export interface RawEPackage extends RawNamedElement {
  nsURI?: string;
  nsPrefix?: string;
  classifiers: RawEClassifier[];
  subpackages: RawEPackage[];
}
