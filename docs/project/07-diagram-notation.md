# 07 — Diagram Notation Specification

## 1. Goal

Use familiar UML class-diagram conventions where they faithfully communicate Ecore, and use explicit Ecore notation where UML would hide important semantics.

## 2. Node types

### 2.1 EClass

Default class node:

```text
┌──────────────────────────────┐
│          «abstract»          │  optional stereotype/status
│            Agent             │
├──────────────────────────────┤
│ name : EString               │
│ enabled : EBoolean           │
├──────────────────────────────┤
│ execute(action : Action)     │
│ perceive() : Belief          │
└──────────────────────────────┘
```

Rules:

- abstract class: show `«abstract»` or equivalent non-color marker;
- interface: show `«interface»`;
- class name never truncates without accessible full text/tooltip;
- attributes and operations occupy separate compartments in Standard/Detailed modes;
- EReferences are primarily edges in UML modes, not duplicated as ordinary attribute rows.

### 2.2 EEnum

```text
┌───────────────────┐
│  «enumeration»    │
│   AuctionStatus   │
├───────────────────┤
│ draft             │
│ open              │
│ closed            │
└───────────────────┘
```

Detailed mode may show explicit literal values when they differ from ordinal defaults.

### 2.3 EDataType

Use a compact datatype node when the datatype is user-defined and relevant:

```text
┌───────────────────┐
│   «datatype»      │
│      Money        │
└───────────────────┘
```

Built-in Ecore datatypes are hidden as nodes by default and shown in feature signatures.

### 2.4 External unresolved target

Optional placeholder:

```text
┌──────────────────────────┐
│ «external unresolved»    │
│ ExternalClass            │
└──────────────────────────┘
```

It must never look identical to a locally resolved EClass.

## 3. Generalization

Ecore `eSuperTypes` maps to UML generalization:

```text
Subclass ─────────▷ Superclass
```

Use a hollow triangular arrowhead at the supertype end. Direction must remain semantically correct regardless of ELK layout direction.

## 4. Ordinary unidirectional EReference

Because an EReference is owned and navigable from owner to target:

```text
Owner ────────────> Target
       roleName
       multiplicity at Target end
```

The exact arrowhead may be visually subtle, but direction must remain discoverable by shape and inspector text.

Example:

```text
Agent ────────────> Role
       roles        0..*
```

## 5. Bidirectional eOpposite pair

Two valid opposite EReferences map to one association:

```text
A  0..1 ───────────── 0..*  B
   ownerRole          itemsRole
```

Both roles are navigable because both EReferences exist. Store both semantic IDs on the relation.

Do not draw two overlapping edges.

## 6. Containment

A containment reference maps to composition with filled diamond at the containing/owner class:

```text
Container ◆──────── Contained
           children 0..*
```

If an inverse container reference exists as `eOpposite`, include its role/multiplicity on the same association rather than drawing a second line.

## 7. Multiplicity placement

Multiplicity is attached to the end representing the **target reached by that reference**.

For `A.bs : B [0..*]`:

```text
A ───────── B
          0..*
```

For a bidirectional pair, show both ends using each EReference's multiplicity.

## 8. Detail modes

### 8.1 Overview

EClass:

- stereotype/status;
- class name;
- no feature compartments unless selected.

EEnum:

- name only or limited literal count indicator.

Edges:

- relation kind;
- multiplicities may remain visible because they are structurally important.

### 8.2 Standard

EClass:

- name;
- attributes with type and compact multiplicity when non-default/important;
- operation signatures;
- relation edges with role and multiplicity.

### 8.3 Detailed

Add:

- defaults;
- generic signatures;
- selected semantic markers such as `{derived}`, `{readonly/changeable=false}`;
- parameter multiplicities;
- enum literal explicit values;
- annotations indicator.

Avoid printing every boolean flag in the box. The inspector exists for exhaustive properties.

### 8.4 Ecore mode

Use Ecore-native row labels:

```text
R beliefs : Belief [0..*]
  containment=true
  eOpposite=Belief.owner
```

Recommended row prefixes:

- `A` — EAttribute
- `R` — EReference
- `O` — EOperation
- `P` — EParameter where shown contextually

The prefix is redundant with icon/structure, not a color-only code.

## 9. Edge label collision policy

Priority from highest to lowest:

1. multiplicity;
2. role name;
3. stereotype/status;
4. secondary diagnostics badge.

Never hide multiplicity merely because a role label is long. Use constrained labels plus tooltip/inspector.

## 10. Selection semantics

Selecting a node:

- selected node: strongest visual emphasis;
- first-hop semantic neighbors: secondary emphasis;
- unrelated visible graph: de-emphasized, not removed;
- related edges: emphasized.

Selecting an edge:

- emphasize edge and its endpoints;
- inspector shows all underlying EReference IDs and exact Ecore properties.

## 11. Diagnostics on diagram

Use small warning/error badges on affected nodes/edges. The diagram should not become covered in error text.

Clicking a badge opens the relevant diagnostic in the inspector.

## 12. Non-color requirement

Every semantic relationship must be distinguishable in monochrome export:

- generalization → hollow triangle;
- composition → filled diamond;
- ordinary reference → navigability arrow/role;
- unresolved external → distinct dash pattern and explicit marker;
- selection is allowed to use color but must also use stroke/opacity/shape emphasis.
