import { describe, expect, it } from 'vitest';
import { buildEcoreModel } from '../ecore/model';
import { parseRawEcore } from '../ecore/parser';
import { buildSearchIndex, searchIndex } from './search-index';

describe('Search Index and Ranking', () => {
  const sampleEcore = `
    <ecore:EPackage xmlns:xmi="http://www.omg.org/XMI" xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore" name="workflow">
      <eClassifiers xsi:type="ecore:EClass" name="Agent" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
        <eStructuralFeatures xsi:type="ecore:EAttribute" name="name" eType="ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#//EString" />
        <eStructuralFeatures xsi:type="ecore:EReference" name="beliefs" eType="#//Agent" />
        <eOperations name="execute" />
      </eClassifiers>
      <eClassifiers xsi:type="ecore:EClass" name="AgentManager" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
        <eStructuralFeatures xsi:type="ecore:EReference" name="managedAgents" eType="#//Agent" />
      </eClassifiers>
      <eClassifiers xsi:type="ecore:EEnum" name="Status" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
        <eLiterals name="ACTIVE" />
        <eLiterals name="SUSPENDED" />
      </eClassifiers>
    </ecore:EPackage>
  `;

  it('indexes all packages, classifiers, features, operations, and enum literals', () => {
    const raw = parseRawEcore(sampleEcore, { sourceName: 'test.ecore' });
    const model = buildEcoreModel(raw);
    const index = buildSearchIndex(model);

    expect(index.length).toBeGreaterThanOrEqual(8);
    expect(index.some((i) => i.name === 'workflow' && i.kind === 'package')).toBe(true);
    expect(index.some((i) => i.name === 'Agent' && i.kind === 'class')).toBe(true);
    expect(index.some((i) => i.name === 'beliefs' && i.kind === 'reference')).toBe(true);
    expect(index.some((i) => i.name === 'execute' && i.kind === 'operation')).toBe(true);
    expect(index.some((i) => i.name === 'Status' && i.kind === 'enum')).toBe(true);
    expect(index.some((i) => i.name === 'ACTIVE' && i.kind === 'literal')).toBe(true);
  });

  it('ranks exact classifier match highest, then prefix, then substring, then features', () => {
    const raw = parseRawEcore(sampleEcore, { sourceName: 'test.ecore' });
    const model = buildEcoreModel(raw);
    const index = buildSearchIndex(model);

    // Query "agent" matches:
    // 1. "Agent" (exact class match)
    // 2. "AgentManager" (prefix class match)
    // 3. "managedAgents" (feature substring match)
    const results = searchIndex(index, 'agent');

    expect(results.length).toBeGreaterThanOrEqual(3);
    expect(results[0]?.item.name).toBe('Agent');
    expect(results[0]?.item.kind).toBe('class');
    expect(results[1]?.item.name).toBe('AgentManager');
    expect(results[1]?.item.kind).toBe('class');
    expect(results[2]?.item.name).toBe('managedAgents');
  });

  it('handles case-insensitivity cleanly', () => {
    const raw = parseRawEcore(sampleEcore, { sourceName: 'test.ecore' });
    const model = buildEcoreModel(raw);
    const index = buildSearchIndex(model);

    const results = searchIndex(index, 'STATUS');
    expect(results[0]?.item.name).toBe('Status');
    expect(results[0]?.item.kind).toBe('enum');
  });

  it('preserves unique semantic IDs and context for duplicate names in different packages', () => {
    const nestedEcore = `
      <ecore:EPackage xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore" name="root">
        <eSubpackages name="pkgA"><eClassifiers xsi:type="ecore:EClass" name="Node"/></eSubpackages>
        <eSubpackages name="pkgB"><eClassifiers xsi:type="ecore:EClass" name="Node"/></eSubpackages>
      </ecore:EPackage>
    `;
    const raw = parseRawEcore(nestedEcore, { sourceName: 'nested.ecore' });
    const model = buildEcoreModel(raw);
    const index = buildSearchIndex(model);

    const results = searchIndex(index, 'Node');
    expect(results).toHaveLength(2);
    expect(results[0]?.item.id).not.toEqual(results[1]?.item.id);
    expect(results[0]?.item.contextText).toMatch(/pkgA|pkgB/);
    expect(results[1]?.item.contextText).toMatch(/pkgA|pkgB/);
  });
});
