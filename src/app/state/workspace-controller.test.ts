import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadEcoreDocument } from './workspace-controller';

const fixtureDir = resolve(process.cwd(), 'tests/fixtures/ecore');

describe('workspace-controller', () => {
  it('keeps a renderable semantic-error model ready for analysis', async () => {
    const xml = `<e:EPackage xmlns:e="http://www.eclipse.org/emf/2002/Ecore" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" name="p">
      <eClassifiers xsi:type="e:EClass" name="Auction">
        <eStructuralFeatures xsi:type="e:EReference" name="bidder" eType="#//BidderX"/>
      </eClassifiers>
    </e:EPackage>`;
    const result = await loadEcoreDocument(xml, 'invalid.ecore');
    expect(result.status).toBe('ready');
    if (result.status === 'ready') {
      expect(result.model.diagnostics[0]?.code).toBe('ECORE_UNRESOLVED_LOCAL_REFERENCE');
      expect(result.layout.nodes).toHaveLength(1);
    }
  });
  it('loads valid Ecore document and transitions to ready state', async () => {
    const xml = await readFile(resolve(fixtureDir, 'all-features.ecore'), 'utf8');
    const result = await loadEcoreDocument(xml, 'all-features.ecore');

    expect(result.status).toBe('ready');
    if (result.status === 'ready') {
      expect(result.sourceName).toBe('all-features.ecore');
      expect(result.model.packages.length).toBeGreaterThan(0);
      expect(result.diagram.nodes.length).toBeGreaterThan(0);
      expect(result.layout.nodes.length).toBeGreaterThan(0);
      expect(result.error).toBeNull();
    }
  });

  it('handles malformed XML with actionable diagnostics and error state', async () => {
    const xml = await readFile(resolve(fixtureDir, 'malformed.xml'), 'utf8');
    const result = await loadEcoreDocument(xml, 'malformed.xml');

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.sourceName).toBe('malformed.xml');
      expect(result.error.message.length).toBeGreaterThan(0);
      expect(result.error.diagnostics?.[0]?.code).toBe('XML_PARSE_ERROR');
    }
  });

  it('recovers from an invalid file to a valid file', async () => {
    const invalidXml = await readFile(resolve(fixtureDir, 'malformed.xml'), 'utf8');
    const invalidResult = await loadEcoreDocument(invalidXml, 'malformed.xml');
    expect(invalidResult.status).toBe('error');

    const validXml = await readFile(resolve(fixtureDir, 'opposite-valid.ecore'), 'utf8');
    const recoveredResult = await loadEcoreDocument(validXml, 'opposite-valid.ecore');
    expect(recoveredResult.status).toBe('ready');
    if (recoveredResult.status === 'ready') {
      expect(recoveredResult.sourceName).toBe('opposite-valid.ecore');
      expect(recoveredResult.layout.nodes.length).toBe(2);
    }
  });
});
