export type { Diagnostic, DiagnosticSeverity } from './diagnostic';
export {
  classifierId,
  featureId,
  literalId,
  operationId,
  packageId,
  parameterId,
  typeParameterId,
} from './ids';
export type { SemanticId } from './ids';
export { formatMultiplicity, normalizeMultiplicity } from './multiplicity';
export type { Multiplicity, MultiplicityResult } from './multiplicity';
export type { SourceMetadata } from './source-metadata';
export type {
  EcoreAnnotation,
  EcoreAttribute,
  EcoreClass,
  EcoreClassifier,
  EcoreDataType,
  EcoreEnum,
  EcoreEnumLiteral,
  EcoreFeature,
  EcoreModel,
  EcoreOperation,
  EcorePackage,
  EcoreParameter,
  EcoreReference,
  EcoreTypeParameter,
  GenericTypeRef,
  ResolvedClassifierRef,
} from './types';
