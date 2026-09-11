import { describe, expect, it } from 'vitest';
import { parseEcoreUriRef } from './parse-ecore-uri-ref';

describe('parseEcoreUriRef', () => {
  it.each([
    ['#//Agent', { resourcePart: null, fragment: '//Agent', tokens: ['Agent'] }],
    ['#//Agent/beliefs', { resourcePart: null, fragment: '//Agent/beliefs', tokens: ['Agent', 'beliefs'] }],
    ['#/0/Member', { resourcePart: null, fragment: '/0/Member', tokens: ['0', 'Member'] }],
    ['#/0/Member/familyFather', { resourcePart: null, fragment: '/0/Member/familyFather', tokens: ['0', 'Member', 'familyFather'] }],
    [
      'http://www.eclipse.org/emf/2002/Ecore#//EString',
      {
        resourcePart: 'http://www.eclipse.org/emf/2002/Ecore',
        fragment: '//EString',
        tokens: ['EString'],
      },
    ],
    [
      'external.ecore#//Remote',
      { resourcePart: 'external.ecore', fragment: '//Remote', tokens: ['Remote'] },
    ],
  ])('normalizes %s without losing raw input', (raw, expected) => {
    expect(parseEcoreUriRef(raw)).toEqual({ raw, ...expected });
  });

  it('extracts a serialized kind hint before the URI', () => {
    const raw = 'ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#//EString';
    expect(parseEcoreUriRef(raw)).toEqual({
      raw,
      hintedKind: 'ecore:EDataType',
      resourcePart: 'http://www.eclipse.org/emf/2002/Ecore',
      fragment: '//EString',
      tokens: ['EString'],
    });
  });
});
