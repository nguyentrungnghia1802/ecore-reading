# 01 — Vision and Scope

## 1. Product vision

Ecore Visualizer is a focused web application for people who need to **read and reason about Ecore metamodels**, especially researchers, students, model-driven engineering practitioners, and developers working with EMF-based languages.

The product should feel closer to a modern design/diagram tool than to an IDE. A user should be able to drag an `.ecore` file into the browser and immediately obtain a readable, semantically correct, navigable diagram.

### Product statement

> The best tool for visually reading and exploring `.ecore` files.

This statement is intentionally narrower than “the best Ecore tool.” Editing, code generation, EMF runtime integration, and project management are different products.

## 2. Primary user jobs

A user should be able to:

1. Open a local `.ecore` file without configuring Eclipse.
2. Understand the package/classifier hierarchy quickly.
3. Distinguish inheritance, ordinary references, containment, and opposite references.
4. See attributes, operations, parameters, enumerations, multiplicities, and important Ecore flags.
5. Move from overview to exact semantic detail without losing context.
6. Search for a classifier and jump directly to it.
7. Isolate a neighborhood of the metamodel to reduce visual noise.
8. Inspect the raw Ecore properties behind a visual element.
9. Rearrange the view temporarily without corrupting semantic data.
10. Export a publication-quality vector diagram.

## 3. Guiding principles

### 3.1 Semantic correctness before visual beauty

A beautiful diagram that misrepresents `containment`, `eOpposite`, multiplicity, or inheritance is a failed product.

### 3.2 Progressive disclosure

Large metamodels become unreadable when every property is shown simultaneously. The viewer uses detail levels and filters so information appears when needed.

### 3.3 Stable mental map

Re-layout should avoid needless movement. When the user changes only a filter or detail level, preserve positions where practical and avoid dramatic unexplained rearrangement.

### 3.4 Ecore-aware, not generic graph-aware

The product understands Ecore semantics. It does not merely render XML elements as boxes and attributes as strings.

### 3.5 Local-first privacy

Opening a model should not upload it anywhere. Parsing, resolving, layout, and normal export happen locally in the browser.

### 3.6 Fast path to understanding

The first useful diagram should require no project configuration, no workspace creation, and no EMF installation.

## 4. In scope for the first complete product

- `.ecore` file drag-and-drop and file picker.
- Direct `ecore:EPackage` root and `xmi:XMI` containing one or more EPackages.
- Nested EPackages in the same file.
- EClass, EAttribute, EReference, EOperation, EParameter, EEnum, EEnumLiteral, EDataType.
- ETypeParameter and EGenericType representation in detailed/Ecore views.
- Multiple inheritance.
- EReference containment, bidirectional opposites, multiplicities, ordering/uniqueness flags.
- Built-in Ecore primitive datatypes.
- Friendly diagnostics for invalid XML, invalid semantic references, and unsupported external references.
- Overview, Standard, Detailed, and Ecore semantic display modes.
- Automatic layout plus pan, zoom, fit view, minimap, and manual node movement.
- Search, focus, filtering, relation toggles, and neighborhood isolation.
- Inspector panel.
- SVG and PNG export.
- Light/dark/system theme.
- Keyboard navigation for major operations.
- Browser-local preference persistence.

## 5. Explicit non-goals

The first product does **not**:

- edit classes/references/attributes and serialize them back to `.ecore`;
- generate Java code;
- act as an EMF runtime;
- execute OCL;
- validate arbitrary domain constraints beyond structural Ecore consistency needed for visualization;
- resolve arbitrary remote URLs on the Internet;
- automatically fetch external `.ecore` dependencies;
- provide real-time collaboration;
- require user accounts;
- store uploaded models on a backend;
- replace Eclipse as a full modeling IDE.

These exclusions protect the viewer's quality and keep the architecture understandable.

## 6. Success criteria

The product is successful when a user can open a medium-to-large real-world metamodel and answer questions such as:

- “What subclasses does this abstract class have?”
- “Which object owns this contained element?”
- “Is this reference one-way or bidirectional?”
- “What is the multiplicity at each end?”
- “What operations does this EClass define?”
- “Where is this datatype or enum used?”
- “What is directly connected to this EClass within two hops?”
- “What exact Ecore flags back this edge?”

without returning to Eclipse for ordinary visual inspection.
