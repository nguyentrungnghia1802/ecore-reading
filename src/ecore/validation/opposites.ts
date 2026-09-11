import type { Diagnostic } from '../model/diagnostic';
import type { EcoreFeature, EcoreModel, EcoreReference } from '../model/types';
import { resolveLocalRef, type LocalEcoreIndex } from '../resolver/resolve-local-ref';

export interface ValidatedOppositePair {
  referenceIds: [string, string];
  containmentReferenceId?: string;
  inverseContainerReferenceId?: string;
}

function invalidOpposite(
  reference: EcoreReference,
  reason: string,
  diagnostics: Diagnostic[],
  reported: Set<string>,
): void {
  if (reported.has(reference.id)) return;
  reported.add(reference.id);
  diagnostics.push({
    id: `ECORE_INVALID_OPPOSITE:${reference.id}`,
    code: 'ECORE_INVALID_OPPOSITE',
    severity: 'error',
    message: `Reference ${reference.name} declares opposite "${reference.rawOpposite ?? ''}", but ${reason}. The references remain separate.`,
    semanticId: reference.id,
    ...(reference.rawOpposite === undefined ? {} : { rawReference: reference.rawOpposite }),
    path: reference.source.path,
  });
}

function isEndpointCompatible(
  reference: EcoreReference,
  candidate: EcoreReference,
): boolean {
  return (
    reference.target?.kind === 'local' &&
    candidate.target?.kind === 'local' &&
    reference.target.classifierId === candidate.ownerClassId &&
    candidate.target.classifierId === reference.ownerClassId
  );
}

export function resolveAndValidateOpposites(
  features: readonly EcoreFeature[],
  localIndex: LocalEcoreIndex,
  diagnostics: Diagnostic[],
): EcoreFeature[] {
  const featureById = new Map(features.map((feature) => [feature.id, feature]));
  const validOpposites = new Map<string, string>();
  const reported = new Set<string>();

  for (const feature of features) {
    if (feature.kind !== 'reference' || feature.rawOpposite === undefined) continue;
    const target = resolveLocalRef(feature.rawOpposite, localIndex).target;
    if (target === null) {
      invalidOpposite(feature, 'the target cannot be resolved locally', diagnostics, reported);
      continue;
    }
    const candidate = featureById.get(target.id);
    if (candidate?.kind !== 'reference') {
      invalidOpposite(feature, 'the target is not an EReference', diagnostics, reported);
      continue;
    }
    if (candidate.id === feature.id) {
      invalidOpposite(feature, 'an eOpposite must reference a distinct EReference', diagnostics, reported);
      continue;
    }
    if (!isEndpointCompatible(feature, candidate)) {
      invalidOpposite(feature, 'the owner and target endpoints are incompatible', diagnostics, reported);
      continue;
    }
    if (feature.containment && candidate.containment) {
      invalidOpposite(feature, 'both ends declare containment', diagnostics, reported);
      continue;
    }
    if (candidate.rawOpposite === undefined) {
      invalidOpposite(feature, 'the reverse EReference does not declare eOpposite', diagnostics, reported);
      continue;
    }
    const reverse = resolveLocalRef(candidate.rawOpposite, localIndex).target;
    if (reverse?.id !== feature.id) {
      invalidOpposite(feature, 'the reverse eOpposite does not point back to this reference', diagnostics, reported);
      continue;
    }
    validOpposites.set(feature.id, candidate.id);
  }

  return features.map((feature) => {
    if (feature.kind !== 'reference') return feature;
    const oppositeReferenceId = validOpposites.get(feature.id);
    return oppositeReferenceId === undefined ? feature : { ...feature, oppositeReferenceId };
  });
}

export function collectValidatedOppositePairs(model: EcoreModel): ValidatedOppositePair[] {
  const references = model.features.filter(
    (feature): feature is EcoreReference => feature.kind === 'reference',
  );
  const byId = new Map(references.map((reference) => [reference.id, reference]));
  const seen = new Set<string>();
  const pairs: ValidatedOppositePair[] = [];

  for (const reference of references) {
    const oppositeId = reference.oppositeReferenceId;
    if (oppositeId === undefined || seen.has(reference.id)) continue;
    const opposite = byId.get(oppositeId);
    if (opposite?.oppositeReferenceId !== reference.id) continue;
    seen.add(reference.id);
    seen.add(opposite.id);
    const base: ValidatedOppositePair = { referenceIds: [reference.id, opposite.id] };
    if (reference.containment) {
      pairs.push({
        ...base,
        containmentReferenceId: reference.id,
        inverseContainerReferenceId: opposite.id,
      });
    } else if (opposite.containment) {
      pairs.push({
        ...base,
        containmentReferenceId: opposite.id,
        inverseContainerReferenceId: reference.id,
      });
    } else {
      pairs.push(base);
    }
  }
  return pairs;
}
