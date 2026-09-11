# 06 — Parser and Resolution Specification

## 1. Goal

Convert XML/XMI serialization into a deterministic, semantically resolved EcoreModel while retaining enough raw metadata to explain every result.

## 2. Parsing stages

```text
File
 ↓
Safety pre-check
 ↓
DOMParser
 ↓
Root discovery
 ↓
Raw AST extraction
 ↓
ID assignment + symbol table
 ↓
Reference normalization
 ↓
Reference resolution
 ↓
Semantic validation
 ↓
EcoreModel + diagnostics
```

Keep each stage callable independently for tests.

## 3. Safety pre-check

Before XML parsing:

- enforce configured maximum file size;
- reject empty input with a dedicated diagnostic;
- reject documents containing a `<!DOCTYPE` declaration in V1;
- never evaluate scripts or HTML;
- never fetch external entities/resources.

The source is treated as untrusted data.

## 4. XML root discovery

Support these shapes:

```xml
<ecore:EPackage ... />
```

and:

```xml
<xmi:XMI ...>
  <ecore:EPackage ... />
  <ecore:EPackage ... />
</xmi:XMI>
```

Namespace prefixes are not semantically fixed. Prefer namespace URI plus local name where possible instead of assuming the literal prefix `ecore`.

## 5. Raw AST rule

The raw AST should retain strings as serialized. Do not normalize everything while walking the DOM.

Example raw EReference:

```ts
interface RawEReference {
  path: string;
  attributes: Record<string, string>;
  rawType?: string;
  rawOpposite?: string;
  childGenericType?: RawEGenericType;
  annotations: RawEAnnotation[];
}
```

Resolution belongs to a later stage.

## 6. Classifier-kind detection

Typical forms include:

```xml
<eClassifiers xsi:type="ecore:EClass" name="Agent" />
<eClassifiers xsi:type="ecore:EEnum" name="Status" />
<eClassifiers xsi:type="ecore:EDataType" name="Money" />
```

Do not infer `EClass` simply because an `eClassifiers` element exists. Read the `xsi:type` value or equivalent semantic type information.

Unknown classifier kinds generate a diagnostic and raw metadata remains inspectable.

## 7. Boolean/default normalization

Normalize Ecore defaults explicitly in semantic construction rather than relying on JavaScript truthiness.

Examples:

- absent `abstract` → `false`
- absent `interface` → `false`
- absent `containment` → `false`
- absent `resolveProxies` on EReference → `true`
- absent `ordered` → `true`
- absent `unique` → `true`
- absent `changeable` → `true`
- absent `volatile` → `false`
- absent `transient` → `false`
- absent `derived` → `false`
- absent `unsettable` → `false`
- absent `lowerBound` → `0`
- absent `upperBound` → `1`

Maintain a central default table with tests tied to Ecore expectations.

## 8. Reference normalization

A type/reference may be serialized in several forms. Normalize into a parsed URI-reference object before resolving:

```ts
interface ParsedEcoreUriRef {
  raw: string;
  resourcePart: string | null;
  fragment: string | null;
  tokens: string[];
  hintedKind?: string;
}
```

Examples the test suite must include:

```text
#//Agent
#//Agent/beliefs
#/0/Member
#/0/Member/familyFather
ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#//EString
http://example.org/other.ecore#//ExternalClass
```

The normalizer must not rely on one demo file's serialization style.

## 9. Local URI resolution

Resolution strategy:

1. Identify whether the resource part is empty/local.
2. Interpret the XMI fragment against the loaded document model.
3. Resolve classifier/feature by structural path.
4. Return an explicit diagnostic on failure.

Support name-based `#//Classifier` forms and positional fragments used by XMI examples where practical. Positional paths must resolve against the raw package/classifier ordering rather than guessed names.

## 10. Built-in Ecore registry

Create a registry keyed by canonical Ecore URI fragments.

The registry should be generated/declared in one module and unit-tested. Do not scatter checks such as `if (name === 'EString')` through parser code.

Built-ins are semantic datatypes; they do not require visible diagram nodes by default.

## 11. External URI handling

If `resourcePart` refers to another resource:

- recognize known Ecore built-ins;
- otherwise create `ResolvedClassifierRef.kind='external'`;
- issue `ECORE_UNRESOLVED_EXTERNAL_REFERENCE` at warning severity unless the construct makes the current model impossible to represent;
- never perform a network request.

## 12. eOpposite resolution

Resolve opposites only after all EClasses and EReferences exist in symbol tables.

Validation sequence:

```text
resolve reference A target
resolve A.eOpposite path → B
verify B is EReference
verify endpoint compatibility
if B has eOpposite, verify it points to A
record A.oppositeReferenceId = B.id
```

Do not merge associations in the EcoreModel. Pair/merge only in DiagramModel mapping.

## 13. Inheritance resolution

Build a directed graph `subclass → supertype` and detect cycles.

Requirements:

- multiple edges supported;
- duplicate declared supertypes diagnosed/deduplicated for diagram purposes while raw source remains preserved;
- unresolved external supertype represented explicitly;
- cycles reported with semantic IDs involved.

## 14. Generic-type resolution

Prefer child `<eGenericType>` / type-argument structures when present. Preserve recursive structure.

If both a direct `eType` and generic representation are present, follow Ecore serialization semantics and retain enough metadata to show the source rather than silently choosing contradictory data.

## 15. Diagnostic philosophy

Diagnostics must answer:

- **what** is wrong;
- **where** in semantic/source path;
- **what the viewer did** as a consequence.

Example:

```text
ECORE_INVALID_OPPOSITE
Reference Order.customer declares opposite Customer.orders, but the reverse reference points to another feature. The two references were rendered separately.
```

This is better than exposing an internal stack trace.

## 16. Parser test classes

Create fixtures for:

1. minimal valid package;
2. direct package root;
3. XMI wrapper with multiple packages;
4. nested subpackages;
5. all classifier kinds;
6. all structural-feature defaults;
7. all important primitive datatypes;
8. multiple inheritance;
9. valid bidirectional opposite;
10. invalid one-sided/mismatched opposite;
11. containment + inverse container reference;
12. local name fragment;
13. positional XMI fragment;
14. external reference;
15. generics;
16. annotations;
17. malformed XML;
18. unknown classifier kind;
19. inheritance cycle;
20. duplicate names/ambiguous malformed input.

Real-world `.ecore` fixtures should supplement synthetic unit fixtures.
