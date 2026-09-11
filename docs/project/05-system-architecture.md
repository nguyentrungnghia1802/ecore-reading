# 05 — System Architecture

## 1. High-level architecture

```text
┌──────────────────────────────────────────────────────────────┐
│ Browser                                                       │
│                                                               │
│  File Input                                                   │
│     │                                                         │
│     ▼                                                         │
│  XML/XMI Reader                                               │
│     │                                                         │
│     ▼                                                         │
│  Raw Ecore Parser                                             │
│     │                                                         │
│     ▼                                                         │
│  Resolver + Semantic Validator                                │
│     │                                                         │
│     ▼                                                         │
│  Canonical EcoreModel                                         │
│     │                                                         │
│     ├────────────► Inspector/Search Index                     │
│     │                                                         │
│     ▼                                                         │
│  Diagram Mapper + Semantic Filters                            │
│     │                                                         │
│     ▼                                                         │
│  Deterministic Node Sizing                                    │
│     │                                                         │
│     ▼                                                         │
│  ELK Layout Worker                                            │
│     │                                                         │
│     ▼                                                         │
│  LayoutModel                                                  │
│     ├────────────► Vector Exporter                            │
│     ▼                                                         │
│  React Flow Adapter                                           │
│     ▼                                                         │
│  Interactive Canvas                                           │
└──────────────────────────────────────────────────────────────┘
```

## 2. Architectural layers

### 2.1 Ingestion

Responsibilities:

- read `File` bytes/text;
- enforce basic size/safety rules;
- reject dangerous/unsupported document constructs as defined in security docs;
- produce XML document or parse diagnostic.

Must not understand UML or React.

### 2.2 Raw Ecore parsing

Responsibilities:

- walk XML/XMI;
- preserve namespaces, element names, raw attributes, structural paths;
- recognize candidate Ecore constructs;
- create an unresolved raw AST.

Must not guess missing targets.

### 2.3 Resolution and semantic validation

Responsibilities:

- assign deterministic semantic IDs;
- build symbol tables;
- normalize bounds/defaults;
- resolve local fragments and built-in types;
- pair valid opposites;
- record external/unresolved references;
- detect semantic inconsistencies needed by the viewer.

Output: immutable-ish `EcoreModel` plus diagnostics.

### 2.4 Diagram mapping

Responsibilities:

- convert Ecore concepts to presentation semantics;
- merge valid eOpposite pairs for default UML view;
- preserve raw EReference ownership for Ecore view/inspector;
- choose node rows according to detail mode;
- apply semantic filters and neighborhood focus.

No screen coordinates.

### 2.5 Geometry and layout

Responsibilities:

- compute deterministic node sizes;
- create ELK graph with explicit ports where beneficial;
- execute layout off the main thread for non-trivial graphs;
- convert ELK coordinates/sections to `LayoutModel`;
- provide stable layout profiles such as `hierarchy-down`, `hierarchy-right`, and `compact`.

### 2.6 Rendering adapter

Responsibilities:

- map LayoutModel to React Flow node/edge props;
- render custom UML/Ecore nodes and semantic edges;
- synchronize selection and viewport;
- never mutate EcoreModel semantics.

### 2.7 Application state

Split state by lifetime:

**Document state**
- source file metadata;
- EcoreModel;
- parse/resolution diagnostics.

**Derived diagram state**
- detail mode;
- filters;
- search query;
- focused semantic ID;
- DiagramModel;
- LayoutModel.

**Ephemeral viewport state**
- zoom/pan;
- selection;
- manual node overrides.

**Persistent preferences**
- theme;
- default detail level;
- default layout direction/profile;
- relation visibility toggles.

Do not persist the loaded model content by default.

## 3. State-management recommendation

Use a small Zustand store or equivalently simple state layer. Avoid a monolithic global object.

Suggested slices:

- `documentSlice`
- `diagramSlice`
- `selectionSlice`
- `preferencesSlice`

Heavy derived data should be produced by pure functions and memoized, not hand-mutated in event handlers.

## 4. Concurrency

ELK layout can be expensive. `elkjs` supports Web Workers and should be run outside the main UI thread for meaningful graphs.

Use request IDs:

```text
layout request 41 starts
layout request 42 starts after user changes filter
request 41 completes → discard as stale
request 42 completes → apply
```

Never allow stale layout results to overwrite newer state.

## 5. Error boundaries

Use three error classes:

1. **Input/parse errors** — user-facing recoverable page state.
2. **Semantic diagnostics** — model can often still be explored; show warning/error counts.
3. **Unexpected application errors** — React error boundary with “open another file” recovery.

## 6. Dependency boundaries

Recommended dependency direction:

```text
ui → application → diagram → ecore
              ↘ layout
export → diagram + layout
```

Forbidden directions:

```text
ecore → ui
ecore → @xyflow/react
parser → elkjs
layout → React components
```

This keeps the parser testable in Node/Vitest without a browser canvas.

## 7. Why React Flow + ELK

React Flow provides the interactive viewport, custom nodes, controls, and minimap. ELK computes graph positions/edge routes and is explicitly not itself a rendering framework. This separation matches the architecture well.

Use React Flow as the **interaction/render host**, not as the source of semantic truth.

## 8. No backend in V1

Normal operation remains client-side:

```text
local file → local browser processing → local export
```

A future optional backend must be an additive capability and cannot become required merely to open a file.
