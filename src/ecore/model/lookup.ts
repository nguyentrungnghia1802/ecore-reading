import type {
  EcoreClassifier,
  EcoreFeature,
  EcoreModel,
  EcoreOperation,
  EcorePackage,
  EcoreParameter,
} from './types';

export type LookupResult<T> = { kind: 'found'; value: T } | { kind: 'missing'; id: string };

function lookup<T>(map: ReadonlyMap<string, T>, id: string): LookupResult<T> {
  const value = map.get(id);
  return value === undefined ? { kind: 'missing', id } : { kind: 'found', value };
}

export function lookupPackage(model: EcoreModel, id: string): LookupResult<EcorePackage> {
  return lookup(model.packageById, id);
}

export function lookupClassifier(model: EcoreModel, id: string): LookupResult<EcoreClassifier> {
  return lookup(model.classifierById, id);
}

export function lookupFeature(model: EcoreModel, id: string): LookupResult<EcoreFeature> {
  return lookup(model.featureById, id);
}

export function lookupOperation(model: EcoreModel, id: string): LookupResult<EcoreOperation> {
  return lookup(model.operationById, id);
}

export function lookupParameter(model: EcoreModel, id: string): LookupResult<EcoreParameter> {
  return lookup(model.parameterById, id);
}
