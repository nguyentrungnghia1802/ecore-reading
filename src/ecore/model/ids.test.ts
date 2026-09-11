import { describe, expect, it } from 'vitest';
import {
  classifierId,
  featureId,
  literalId,
  operationId,
  packageId,
  parameterId,
  typeParameterId,
} from './ids';

describe('semantic IDs', () => {
  it('produces deterministic structural IDs with encoded path segments', () => {
    const pkg = packageId(['root package', 'sales/items']);
    const classifier = classifierId(pkg, 'Order Item', 0);

    expect(pkg).toBe('pkg:root%20package/sales%2Fitems');
    expect(classifier).toBe('classifier:root%20package/sales%2Fitems/Order%20Item/0');
    expect(featureId(classifier, 'reference', 'owner/account', 1)).toBe(
      'feature:classifier%3Aroot%2520package%2Fsales%252Fitems%2FOrder%2520Item%2F0/reference/owner%2Faccount/1',
    );
  });

  it('uses ordinals to keep duplicate declarations distinct', () => {
    const owner = classifierId(packageId(['p']), 'Duplicate', 0);

    expect(operationId(owner, 'find', 0)).not.toBe(operationId(owner, 'find', 1));
    expect(parameterId(operationId(owner, 'find', 0), 'value', 0)).not.toBe(
      parameterId(operationId(owner, 'find', 0), 'value', 1),
    );
    expect(literalId(owner, 'ACTIVE', 0)).not.toBe(literalId(owner, 'ACTIVE', 1));
    expect(typeParameterId(owner, 'T', 0)).not.toBe(typeParameterId(owner, 'T', 1));
  });
});
