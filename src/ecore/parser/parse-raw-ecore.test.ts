import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ECORE_NAMESPACE_URI, parseRawEcore } from './parse-raw-ecore';

async function fixture(name: string): Promise<string> {
  return readFile(resolve(process.cwd(), 'tests/fixtures/ecore', name), 'utf8');
}

describe('parseRawEcore', () => {
  it('parses a direct EPackage root while preserving source order and raw metadata', async () => {
    const result = parseRawEcore(await fixture('all-features.ecore'), { sourceName: 'all-features.ecore' });

    expect(result.diagnostics).toEqual([]);
    expect(result.packages).toHaveLength(1);
    expect(result.packages[0]).toMatchObject({ name: 'features', nsURI: 'urn:features' });
    expect(result.packages[0]?.classifiers.map((classifier) => classifier.kind)).toEqual([
      'class',
      'enum',
      'datatype',
    ]);
    const entity = result.packages[0]?.classifiers[0];
    expect(entity?.kind).toBe('class');
    if (entity?.kind !== 'class') throw new Error('Expected class fixture');
    expect(entity.structuralFeatures.map((feature) => feature.kind)).toEqual(['attribute', 'reference']);
    expect(entity.structuralFeatures[0]?.rawType).toContain('#//EString');
    expect(entity.operations[0]?.parameters[0]?.name).toBe('prefix');
    expect(result.packages[0]?.annotations[0]?.details).toEqual({ summary: 'Feature corpus' });
    expect(result.packages[0]?.metadata.rawAttributes.name).toBe('features');
  });

  it('parses every EPackage directly contained by an xmi:XMI wrapper', () => {
    const xml = `<?xml version="1.0"?>
      <x:XMI xmlns:x="http://www.omg.org/XMI" xmlns:model="${ECORE_NAMESPACE_URI}"
        xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
        <model:EPackage name="one"><eClassifiers i:type="model:EClass" name="A"/></model:EPackage>
        <model:EPackage name="two"><eClassifiers i:type="model:EEnum" name="B"/></model:EPackage>
      </x:XMI>`;

    const result = parseRawEcore(xml, { sourceName: 'wrapped.ecore' });

    expect(result.packages.map((pkg) => pkg.name)).toEqual(['one', 'two']);
    expect(result.packages[1]?.classifiers[0]?.kind).toBe('enum');
  });

  it('discovers Ecore by namespace URI instead of a fixed prefix', () => {
    const xml = `<m:EPackage xmlns:m="${ECORE_NAMESPACE_URI}"
      xmlns:type="http://www.w3.org/2001/XMLSchema-instance" name="renamed">
      <eClassifiers type:type="m:EDataType" name="Token"/>
    </m:EPackage>`;

    const result = parseRawEcore(xml);

    expect(result.packages[0]?.classifiers[0]).toMatchObject({ kind: 'datatype', name: 'Token' });
  });

  it('preserves nested packages, raw references and recursive generic nodes', async () => {
    const nested = parseRawEcore(await fixture('nested-packages.ecore'));
    const generics = parseRawEcore(await fixture('generics.ecore'));

    expect(nested.packages[0]?.subpackages.map((pkg) => pkg.name)).toEqual(['left', 'right']);
    const genericClass = generics.packages[0]?.classifiers[0];
    expect(genericClass?.kind).toBe('class');
    if (genericClass?.kind !== 'class') throw new Error('Expected class fixture');
    expect(genericClass.typeParameters[0]?.name).toBe('T');
    expect(genericClass.structuralFeatures[0]?.genericType?.rawTypeParameter).toBe('#//Box/T');
  });

  it('preserves unknown classifier and feature kinds with diagnostics', () => {
    const xml = `<ecore:EPackage xmlns:ecore="${ECORE_NAMESPACE_URI}"
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" name="unknown">
      <eClassifiers xsi:type="ecore:EAlien" name="Alien" mystery="yes"/>
      <eClassifiers xsi:type="ecore:EClass" name="Known">
        <eStructuralFeatures xsi:type="ecore:ESomething" name="odd"/>
      </eClassifiers>
    </ecore:EPackage>`;

    const result = parseRawEcore(xml);

    expect(result.packages[0]?.classifiers[0]).toMatchObject({ kind: 'unknown', semanticType: 'EAlien' });
    expect(result.packages[0]?.classifiers[1]).toMatchObject({ kind: 'class' });
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      'ECORE_UNKNOWN_CLASSIFIER_KIND',
      'ECORE_UNKNOWN_FEATURE_KIND',
    ]);
  });

  it('keeps optional raw values absent and diagnoses malformed lexical values', () => {
    const xml = `<ecore:EPackage xmlns:ecore="${ECORE_NAMESPACE_URI}"
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" name="bad-values">
      <eClassifiers xsi:type="ecore:EClass" name="C" abstract="truthy">
        <eStructuralFeatures xsi:type="ecore:EAttribute" name="a" lowerBound="nope" unique="sometimes"/>
      </eClassifiers>
    </ecore:EPackage>`;

    const result = parseRawEcore(xml);
    const classifier = result.packages[0]?.classifiers[0];

    expect(classifier?.rawAttributes.interface).toBeUndefined();
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      'ECORE_INVALID_BOOLEAN',
      'ECORE_INVALID_INTEGER',
      'ECORE_INVALID_BOOLEAN',
    ]);
  });

  it.each([
    ['', 'ECORE_EMPTY_DOCUMENT'],
    ['   \n\t', 'ECORE_EMPTY_DOCUMENT'],
    ['<!DOCTYPE x [<!ENTITY y SYSTEM "file:///secret">]><x/>', 'XML_DOCTYPE_FORBIDDEN'],
  ])('rejects unsafe input before parsing', (xml, code) => {
    const result = parseRawEcore(xml);

    expect(result.packages).toEqual([]);
    expect(result.diagnostics[0]?.code).toBe(code);
  });

  it('enforces a configurable UTF-8 byte limit', () => {
    const result = parseRawEcore('<EPackage>é</EPackage>', { maxBytes: 10 });

    expect(result.diagnostics[0]?.code).toBe('ECORE_FILE_TOO_LARGE');
  });

  it('returns XML_PARSE_ERROR instead of throwing malformed XML across the boundary', async () => {
    const result = parseRawEcore(await fixture('malformed.xml'));

    expect(result.packages).toEqual([]);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.code).toBe('XML_PARSE_ERROR');
  });

  it('is deterministic for the same document', async () => {
    const xml = await fixture('all-features.ecore');

    expect(parseRawEcore(xml, { sourceName: 'same.ecore' })).toEqual(
      parseRawEcore(xml, { sourceName: 'same.ecore' }),
    );
  });
});
