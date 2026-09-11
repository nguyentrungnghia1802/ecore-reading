# 03 — Ecore Semantic Specification

## 1. Why this document exists

This file defines the subset of Ecore semantics the visualizer promises to understand. The parser and visual mapper must implement these semantics consistently.

The authoritative runtime is EMF/Ecore, not UML. UML is a presentation layer used where it helps readability.

## 2. Core hierarchy

Conceptually, the viewer works with:

```text
EPackage
└─ EClassifier
   ├─ EClass
   │  ├─ EAttribute      (via EStructuralFeature)
   │  ├─ EReference      (via EStructuralFeature)
   │  └─ EOperation
   │     └─ EParameter
   └─ EDataType
      └─ EEnum
         └─ EEnumLiteral
```

ETypeParameter and EGenericType may appear on typed elements/operations/classes and must be preserved.

## 3. EPackage

Capture at minimum:

- `name`
- `nsURI`
- `nsPrefix`
- parent/subpackage relation
- contained classifiers
- EAnnotations

Identity is based on structural location plus namespace context, never only `name`.

## 4. EClass

Capture:

- `name`
- `abstract`
- `interface`
- `eSuperTypes`
- type parameters
- attributes
- references
- operations
- annotations

### 4.1 Inheritance

Ecore allows multiple EClass supertypes. The viewer must:

- resolve every in-file supertype;
- preserve declaration order in semantic data;
- reject or diagnose unresolved targets;
- never collapse multiple inheritance into one edge.

Cycles are invalid Ecore semantics. If encountered, emit a semantic diagnostic and still avoid an application crash.

## 5. EAttribute

Capture the ETypedElement/EStructuralFeature properties relevant to interpretation:

- `name`
- type reference
- lower/upper bounds
- `ordered`
- `unique`
- `changeable`
- `volatile`
- `transient`
- `derived`
- `unsettable`
- `defaultValueLiteral`
- ID flag where present
- generic type representation

EAttribute targets a datatype, not another EClass relationship.

## 6. EReference

An EReference is owned by one EClass and points to another EClass. In Ecore it is inherently navigable from owner to target. UML-style bidirectionality exists only when two EReferences are explicitly paired through `eOpposite`.

Capture:

- `name`
- owner EClass ID
- target type reference
- lower/upper bounds
- `containment`
- `eOpposite`
- `resolveProxies`
- `ordered`
- `unique`
- `changeable`
- `volatile`
- `transient`
- `derived`
- `unsettable`
- annotations

### 6.1 Containment

`containment=true` means the target object is compositionally contained by the source in the instance model.

Default visual mapping:

```text
Owner ◆──── Target
```

The filled diamond belongs at the **owner/source** end.

### 6.2 Container opposite

A non-containment EReference that is the `eOpposite` of a containment reference represents the inverse navigation to the container. Default UML mode should render one composition association with labels/multiplicities at both ends, not two overlapping edges.

### 6.3 eOpposite

If reference `A.r1` declares `eOpposite=B.r2`, validate that:

1. `B.r2` resolves to an EReference;
2. `B.r2` targets `A` or is semantically compatible with the owner;
3. the opposite explicitly points back to the original reference.

For the default UML mapping, a pair is mergeable only when the opposite relationship is symmetric and endpoint-compatible. A one-sided or inconsistent declaration is treated as malformed input: preserve both EReferences, emit `ECORE_INVALID_OPPOSITE`, and render them separately rather than guessing bidirectionality.

## 7. Multiplicity

For any ETypedElement:

```text
lowerBound default = 0
upperBound default = 1
upperBound = -1 means unbounded
```

Display rules:

| Bounds | Label |
|---|---|
| 0, 1 | `0..1` |
| 1, 1 | `1` |
| 0, -1 | `0..*` |
| 1, -1 | `1..*` |
| n, n | `n` |
| m, n | `m..n` |

Invalid bounds such as `lowerBound > upperBound` for finite upper bounds produce a diagnostic.

## 8. EOperation and EParameter

Capture:

- operation name
- return EType/generic type
- return multiplicity
- ordered/unique flags
- EParameters in declaration order
- EExceptions if represented
- type parameters
- annotations

Display signature example:

```text
+ evaluate(context : Context [1]) : EBoolean [1]
```

Visibility symbols are a presentation convention only; Ecore itself does not define UML visibility in the same way. The UI must not imply unsupported visibility semantics. The recommended default is to omit `+/-/#` entirely unless the source carries compatible annotation data.

## 9. EEnum and EEnumLiteral

Capture:

- enum name
- instance class/name metadata when present
- literal name
- literal `value`
- literal string `literal`
- annotations

Render enum as a classifier node with `«enumeration»` stereotype and literal rows.

## 10. EDataType

Capture the datatype even when it is not an enum. Detailed/Ecore mode may show:

- `instanceClassName`
- `instanceTypeName`
- `serializable`

Built-in Ecore types are represented using a canonical builtin registry.

## 11. Generic types

Do not flatten generic information into an arbitrary string too early.

Represent:

- classifier reference, if present;
- type parameter reference, if present;
- upper/lower bounds;
- type arguments recursively.

A separate formatter can later render strings such as `EList<T>`.

## 12. EAnnotations

Preserve annotation `source`, detail key/value pairs, and nested references/content where parseable.

V1 behavior:

- show annotations in the inspector;
- recognize documentation annotations when practical;
- do not execute OCL or annotation code;
- never discard unknown annotation sources.

## 13. Built-in Ecore datatype registry

The resolver must recognize canonical built-in Ecore URIs using `http://www.eclipse.org/emf/2002/Ecore#//...` and normalized equivalent type expressions found in XMI serialization.

At minimum include all standard Ecore datatypes exposed by Ecore itself rather than maintaining only a hand-picked subset.

## 14. External references

The single-file viewer does not fetch arbitrary external resources.

Represent an unresolved external symbol as:

```ts
{
  kind: 'external',
  rawUri: string,
  fragment: string | null,
  resolution: 'unresolved'
}
```

The diagram may use a lightweight external placeholder only when that improves readability, and it must be visually marked as external/unresolved.

## 15. Semantic invariants

The resolved model should satisfy these internal invariants before diagram mapping:

1. Every semantic element has a stable unique ID.
2. Every contained element knows its owning package/class/operation as applicable.
3. Every resolved local type reference points to an existing classifier ID.
4. Every merged opposite association retains IDs of both source EReferences.
5. Raw source values remain available for the inspector/diagnostics.
6. No renderer-specific coordinates exist in the semantic model.
