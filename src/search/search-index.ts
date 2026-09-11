import type { EcoreModel } from '../ecore/model';

export type SearchItemKind =
  | 'class'
  | 'enum'
  | 'datatype'
  | 'attribute'
  | 'reference'
  | 'operation'
  | 'literal'
  | 'package';

export interface SearchIndexItem {
  id: string;
  name: string;
  kind: SearchItemKind;
  contextText: string;
  ownerNodeId?: string | undefined;
  packageId?: string | undefined;
}

export interface SearchResult {
  item: SearchIndexItem;
  score: number;
}

export function buildSearchIndex(model: EcoreModel): SearchIndexItem[] {
  const items: SearchIndexItem[] = [];

  // Packages
  for (const pkg of model.packages) {
    items.push({
      id: pkg.id,
      name: pkg.name,
      kind: 'package',
      contextText: `EPackage • ${pkg.nsURI ?? pkg.name}`,
      packageId: pkg.id,
    });
  }

  // Classifiers
  for (const classifier of model.classifiers) {
    const pkg = model.packageById.get(classifier.packageId);
    const kindLabel =
      classifier.kind === 'class'
        ? 'EClass'
        : classifier.kind === 'enum'
          ? 'EEnum'
          : 'EDataType';

    items.push({
      id: classifier.id,
      name: classifier.name,
      kind: classifier.kind,
      contextText: `${kindLabel} • ${pkg?.name ?? ''}`,
      ownerNodeId: classifier.id,
      packageId: classifier.packageId,
    });

    if (classifier.kind === 'enum') {
      for (const literal of classifier.literals) {
        items.push({
          id: literal.id,
          name: literal.name,
          kind: 'literal',
          contextText: `EEnumLiteral • ${classifier.name}`,
          ownerNodeId: classifier.id,
          packageId: classifier.packageId,
        });
      }
    }
  }

  // Features (Attributes & References)
  for (const feature of model.features) {
    const owner = model.classifierById.get(feature.ownerClassId);
    const kindLabel = feature.kind === 'attribute' ? 'EAttribute' : 'EReference';

    items.push({
      id: feature.id,
      name: feature.name,
      kind: feature.kind,
      contextText: `${kindLabel} • ${owner?.name ?? ''}`,
      ownerNodeId: feature.ownerClassId,
      packageId: owner?.packageId,
    });
  }

  // Operations
  for (const operation of model.operations) {
    const owner = model.classifierById.get(operation.ownerClassId);

    items.push({
      id: operation.id,
      name: operation.name,
      kind: 'operation',
      contextText: `EOperation • ${owner?.name ?? ''}`,
      ownerNodeId: operation.ownerClassId,
      packageId: owner?.packageId,
    });
  }

  return items;
}

export function searchIndex(
  items: readonly SearchIndexItem[],
  query: string,
  limit = 50,
): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return [];

  const results: SearchResult[] = [];

  for (const item of items) {
    const nameLower = item.name.toLowerCase();
    const isClassifier =
      item.kind === 'class' || item.kind === 'enum' || item.kind === 'datatype';
    const isFeature =
      item.kind === 'attribute' ||
      item.kind === 'reference' ||
      item.kind === 'operation' ||
      item.kind === 'literal';

    let score = 0;

    if (nameLower === q) {
      score = isClassifier ? 1000 : isFeature ? 600 : 400;
    } else if (nameLower.startsWith(q)) {
      score = isClassifier ? 800 : isFeature ? 450 : 300;
    } else if (nameLower.includes(q)) {
      score = isClassifier ? 600 : isFeature ? 350 : 200;
    } else if (item.contextText.toLowerCase().includes(q)) {
      score = 100;
    }

    if (score > 0) {
      results.push({ item, score });
    }
  }

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.item.name.length !== b.item.name.length) {
      return a.item.name.length - b.item.name.length;
    }
    return a.item.name.localeCompare(b.item.name);
  });

  return results.slice(0, limit);
}
