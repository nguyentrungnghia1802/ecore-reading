import type { Diagnostic } from '../model';
import {
  classifierId,
  featureId,
  operationId,
  packageId,
} from '../model';
import type { RawEClassifier, RawEcoreDocument, RawEClass, RawEPackage } from '../raw';
import { parseEcoreUriRef, type ParsedEcoreUriRef } from './parse-ecore-uri-ref';

export type LocalEcoreTargetKind = 'package' | 'classifier' | 'feature' | 'operation';

export interface LocalEcoreTarget {
  kind: LocalEcoreTargetKind;
  id: string;
  name: string;
  path: string;
}

export interface LocalEcoreIndex {
  byFragment: ReadonlyMap<string, readonly LocalEcoreTarget[]>;
}

export interface LocalResolutionResult {
  target: LocalEcoreTarget | null;
  diagnostics: Diagnostic[];
}

function fallbackName(kind: string, sourceOrder: number): string {
  return `@${kind}.${sourceOrder}`;
}

function add(
  map: Map<string, LocalEcoreTarget[]>,
  fragment: string,
  target: LocalEcoreTarget,
): void {
  const existing = map.get(fragment);
  if (existing === undefined) map.set(fragment, [target]);
  else existing.push(target);
}

function classifierTarget(
  classifier: RawEClassifier,
  ownerPackageId: string,
): LocalEcoreTarget {
  const name = classifier.name ?? fallbackName('classifier', classifier.sourceOrder);
  return {
    kind: 'classifier',
    id: classifierId(ownerPackageId, name, classifier.sourceOrder),
    name,
    path: classifier.path,
  };
}

function indexClassMembers(
  classifier: RawEClass,
  target: LocalEcoreTarget,
  nameFragment: string,
  positionalFragment: string,
  map: Map<string, LocalEcoreTarget[]>,
): void {
  for (const feature of classifier.structuralFeatures) {
    const name = feature.name ?? fallbackName('feature', feature.sourceOrder);
    const featureTarget: LocalEcoreTarget = {
      kind: 'feature',
      id: featureId(target.id, feature.kind === 'reference' ? 'reference' : 'attribute', name, feature.sourceOrder),
      name,
      path: feature.path,
    };
    add(map, `${nameFragment}/${name}`, featureTarget);
    add(map, `${positionalFragment}/${name}`, featureTarget);
    add(map, `${positionalFragment}/${feature.sourceOrder}`, featureTarget);
  }
  for (const operation of classifier.operations) {
    const name = operation.name ?? fallbackName('operation', operation.sourceOrder);
    const operationTarget: LocalEcoreTarget = {
      kind: 'operation',
      id: operationId(target.id, name, operation.sourceOrder),
      name,
      path: operation.path,
    };
    add(map, `${nameFragment}/${name}`, operationTarget);
    add(map, `${positionalFragment}/${name}`, operationTarget);
  }
}

function indexPackage(
  pkg: RawEPackage,
  ancestorNames: readonly string[],
  rootIndex: number,
  positionalPrefix: string,
  map: Map<string, LocalEcoreTarget[]>,
): void {
  const name = pkg.name ?? fallbackName('package', pkg.sourceOrder);
  const packageNames = [...ancestorNames, name];
  const semanticId = packageId(packageNames);
  const packageTarget: LocalEcoreTarget = {
    kind: 'package',
    id: semanticId,
    name,
    path: pkg.path,
  };
  add(map, positionalPrefix, packageTarget);
  if (ancestorNames.length > 0) add(map, `//${packageNames.slice(1).join('/')}`, packageTarget);

  for (const classifier of pkg.classifiers) {
    const target = classifierTarget(classifier, semanticId);
    const relativeNames = [...packageNames.slice(1), target.name];
    const nameFragment = `//${relativeNames.join('/')}`;
    const positionalFragment = `${positionalPrefix}/${target.name}`;
    add(map, nameFragment, target);
    add(map, positionalFragment, target);
    add(map, `${positionalPrefix}/${classifier.sourceOrder}`, target);
    if (classifier.kind === 'class') {
      indexClassMembers(classifier, target, nameFragment, positionalFragment, map);
    }
  }

  for (const subpackage of pkg.subpackages) {
    const subName = subpackage.name ?? fallbackName('package', subpackage.sourceOrder);
    indexPackage(
      subpackage,
      packageNames,
      rootIndex,
      `/${rootIndex}/${subName}`,
      map,
    );
  }
}

export function buildLocalEcoreIndex(document: RawEcoreDocument): LocalEcoreIndex {
  const byFragment = new Map<string, LocalEcoreTarget[]>();
  document.packages.forEach((pkg, rootIndex) =>
    indexPackage(pkg, [], rootIndex, `/${rootIndex}`, byFragment),
  );
  return { byFragment };
}

function unresolved(raw: string, code: string, message: string): LocalResolutionResult {
  return {
    target: null,
    diagnostics: [
      {
        id: `${code}:${raw}`,
        code,
        severity: 'error',
        message,
        rawReference: raw,
      },
    ],
  };
}

export function resolveLocalRef(
  reference: string | ParsedEcoreUriRef,
  index: LocalEcoreIndex,
): LocalResolutionResult {
  const parsed = typeof reference === 'string' ? parseEcoreUriRef(reference) : reference;
  if (parsed.resourcePart !== null || parsed.fragment === null) {
    return unresolved(
      parsed.raw,
      'ECORE_UNRESOLVED_LOCAL_REFERENCE',
      `Reference "${parsed.raw}" is not a local Ecore fragment.`,
    );
  }
  const candidates = index.byFragment.get(parsed.fragment) ?? [];
  if (candidates.length === 1) return { target: candidates[0] ?? null, diagnostics: [] };
  if (candidates.length > 1) {
    return unresolved(
      parsed.raw,
      'ECORE_AMBIGUOUS_LOCAL_REFERENCE',
      `Local reference "${parsed.raw}" matches ${candidates.length} source elements; no target was guessed.`,
    );
  }
  return unresolved(
    parsed.raw,
    'ECORE_UNRESOLVED_LOCAL_REFERENCE',
    `Local reference "${parsed.raw}" does not match an element in this document.`,
  );
}
