import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import manifest from './ecore/manifest.json';

const fixtureDirectory = resolve(process.cwd(), 'tests/fixtures/ecore');
const negativeFixtures = new Set(['malformed.xml', 'doctype.xml']);
const positiveFixtures = Object.keys(manifest).filter((name) => !negativeFixtures.has(name));

describe('canonical Ecore fixture corpus', () => {
  it.each(positiveFixtures)('%s is well-formed XML with a documented semantic purpose', async (name) => {
    const xml = await readFile(resolve(fixtureDirectory, name), 'utf8');
    const document = new DOMParser().parseFromString(xml, 'application/xml');

    expect(manifest[name as keyof typeof manifest].length).toBeGreaterThan(10);
    expect(document.querySelector('parsererror')).toBeNull();
  });

  it('keeps malformed.xml intentionally invalid', async () => {
    const xml = await readFile(resolve(fixtureDirectory, 'malformed.xml'), 'utf8');
    const document = new DOMParser().parseFromString(xml, 'application/xml');

    expect(document.querySelector('parsererror')).not.toBeNull();
  });
});
