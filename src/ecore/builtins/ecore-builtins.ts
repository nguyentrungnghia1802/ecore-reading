import type { ResolvedClassifierRef } from '../model';

export const ECORE_BUILTIN_URI = 'http://www.eclipse.org/emf/2002/Ecore';

export const ECORE_BUILTIN_NAMES = [
  'EBigDecimal',
  'EBigInteger',
  'EBoolean',
  'EBooleanObject',
  'EByte',
  'EByteArray',
  'EByteObject',
  'EChar',
  'ECharacterObject',
  'EDate',
  'EDiagnosticChain',
  'EDouble',
  'EDoubleObject',
  'EEList',
  'EEnumerator',
  'EFeatureMap',
  'EFeatureMapEntry',
  'EFloat',
  'EFloatObject',
  'EInt',
  'EIntegerObject',
  'EInvocationTargetException',
  'EJavaClass',
  'EJavaObject',
  'EJavaSerializable',
  'ELong',
  'ELongObject',
  'EMap',
  'EResource',
  'EResourceSet',
  'EShort',
  'EShortObject',
  'EString',
  'ETreeIterator',
] as const;

export type EcoreBuiltinName = (typeof ECORE_BUILTIN_NAMES)[number];

export interface EcoreBuiltinDatatype {
  id: string;
  name: EcoreBuiltinName;
  canonicalUri: string;
}

export const ECORE_BUILTINS: ReadonlyMap<EcoreBuiltinName, EcoreBuiltinDatatype> = new Map(
  ECORE_BUILTIN_NAMES.map((name) => [
    name,
    { id: `ecore:${name}`, name, canonicalUri: `${ECORE_BUILTIN_URI}#//${name}` },
  ]),
);

const ECORE_RESOURCE_ALIASES = new Set([
  ECORE_BUILTIN_URI,
  `${ECORE_BUILTIN_URI}/`,
  'platform:/plugin/org.eclipse.emf.ecore/model/Ecore.ecore',
]);

export function isEcoreBuiltinResource(resourcePart: string | null): boolean {
  return resourcePart !== null && ECORE_RESOURCE_ALIASES.has(resourcePart);
}

export function resolveEcoreBuiltin(
  resourcePart: string | null,
  name: string | undefined,
  raw: string,
): ResolvedClassifierRef | null {
  if (!isEcoreBuiltinResource(resourcePart) || name === undefined) return null;
  const builtin = ECORE_BUILTINS.get(name as EcoreBuiltinName);
  if (builtin === undefined) return null;
  return { kind: 'builtin', builtinId: builtin.id, displayName: builtin.name, raw };
}
