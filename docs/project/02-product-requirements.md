# 02 — Product Requirements

## 1. Requirement priority

- **P0** — necessary for semantic correctness or basic usability.
- **P1** — necessary for the intended “best visual explorer” experience.
- **P2** — polish that improves expert use but is not required for the first release candidate.

## 2. File ingestion

### PR-001 — Open local `.ecore` file — P0

The app must accept a single local `.ecore` file via drag-and-drop and native file picker.

**Acceptance**

- Valid file produces a model and diagram.
- Original file is never uploaded by the application.
- Unsupported extension can still be attempted if the content is valid XML/Ecore after an explicit warning; content determines validity.

### PR-002 — Safe parse failure — P0

Invalid XML must not crash the app.

**Acceptance**

- Show a concise human-readable error state.
- Preserve the ability to open another file without refreshing the page.
- Never render a partially trusted semantic model as if it were valid.

### PR-003 — EPackage discovery — P0

Support both:

- `ecore:EPackage` as the document root;
- `xmi:XMI` containing one or more EPackages.

Nested subpackages must be represented.

## 3. Semantic extraction

### PR-010 — Classifier support — P0

Represent EClass, EEnum, and EDataType classifiers.

### PR-011 — Structural features — P0

Represent EAttribute and EReference including type, lower/upper bounds, default values where present, and relevant Ecore flags.

### PR-012 — Behavioral features — P0

Represent EOperation and EParameter, including return type, parameter multiplicity, and generic type information when present.

### PR-013 — Inheritance — P0

Resolve all in-file `eSuperTypes`. Multiple inheritance must render as multiple generalization edges.

### PR-014 — Opposite references — P0

Two EReferences linked by `eOpposite` must be recognized as one bidirectional semantic association for the default UML view. The Ecore inspector must still expose both owned EReference instances.

### PR-015 — Containment — P0

Containment must be visually distinct from a non-containment cross-reference. If an opposite container reference exists, it must not cause a duplicate association.

### PR-016 — Multiplicity — P0

Map Ecore cardinality correctly:

- default `lowerBound` → `0`;
- default `upperBound` → `1`;
- `upperBound=-1` → `*`;
- examples: `0..1`, `1`, `0..*`, `1..*`, exact `n`, and general `m..n`.

### PR-017 — Built-in Ecore datatypes — P0

Common Ecore datatypes such as `EString`, `EInt`, `EBoolean`, `EDouble`, `EFloat`, `ELong`, `EDate`, and related built-ins must resolve to known datatype symbols instead of appearing as broken external references.

### PR-018 — External references — P0

An external non-built-in reference that cannot be resolved from the loaded file must remain explicit and unresolved.

**Never** fabricate a target classifier.

## 4. Diagram views

### PR-020 — Overview mode — P1

Show classifier identity and relationships while minimizing member detail.

### PR-021 — Standard mode — P0

Show class name, main attributes, operations, and relationships with multiplicities.

### PR-022 — Detailed mode — P1

Expose richer feature signatures and semantic badges/flags while keeping the diagram readable.

### PR-023 — Ecore mode — P1

Expose Ecore-native concepts rather than only UML-like notation: owned references, raw bounds, containment, derived/transient/volatile/changeable/resolveProxies, eOpposite, generic information, and stable semantic paths.

## 5. Navigation and exploration

### PR-030 — Pan, zoom, fit — P0

The canvas must support smooth pan/zoom and a one-action Fit View.

### PR-031 — Minimap — P1

Provide an interactive minimap for large diagrams.

### PR-032 — Search and jump — P1

Search classifiers and features. Selecting a result centers and highlights the corresponding node or member.

### PR-033 — Selection focus — P1

Selecting a classifier highlights first-order semantic neighbors and de-emphasizes unrelated elements without hiding them by default.

### PR-034 — Neighborhood isolation — P1

Allow depth 1, 2, 3, or All around a selected classifier. The filter must operate on semantic graph relationships, not screen distance.

### PR-035 — Relation filters — P1

Allow toggling inheritance, containment, ordinary references, external/unresolved references, and optionally datatype-use relations.

### PR-036 — Manual movement — P1

Users may drag nodes after layout. Manual movement changes view state only, never semantic state.

### PR-037 — Re-layout — P0

A clear Auto Layout action must restore computed positions.

## 6. Inspector

### PR-040 — Semantic inspector — P1

Selecting a classifier, feature, or relation opens an inspector with exact Ecore information.

### PR-041 — Stable identity — P0

Inspector and selection must use semantic IDs/paths, not display names alone. Two same-named elements in different packages must remain distinct.

## 7. Export

### PR-050 — SVG export — P1

Export a vector representation derived from the diagram/layout model, not a raster screenshot disguised as SVG.

### PR-051 — PNG export — P1

Export a high-resolution PNG of the current visible graph or whole diagram.

### PR-052 — Export metadata — P2

Optionally include source file name and generation timestamp in metadata, not visibly on the diagram unless the user enables a caption.

## 8. Preferences

### PR-060 — Theme — P1

Support light, dark, and system theme.

### PR-061 — Persist viewer preferences — P1

Persist theme, last chosen detail mode, layout direction, and visibility toggles in local browser storage. Do not persist source `.ecore` content by default.

## 9. Accessibility

### PR-070 — Keyboard access — P1

All toolbar and side-panel controls must be keyboard reachable. Search, Fit View, detail mode change, and inspector close must have keyboard-friendly flows.

### PR-071 — Non-color semantics — P0

Relationship meaning cannot depend only on color. Use arrowheads, diamonds, line styles, labels, and textual inspector descriptions.

### PR-072 — Accessible control labels — P1

Icon-only controls require accessible names and tooltips.

## 10. Reliability

### PR-080 — Deterministic semantic output — P0

The same input file must produce the same semantic model and stable IDs independent of UI state.

### PR-081 — Deterministic default layout — P1

Given the same semantic graph, detail mode, filter set, layout profile, and app version, the layout should be deterministic enough for regression testing.

### PR-082 — No silent data loss — P0

Unsupported constructs should generate diagnostics or be retained in raw metadata; they must not simply disappear without trace.
