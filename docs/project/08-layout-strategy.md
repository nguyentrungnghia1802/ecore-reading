# 08 — Layout Strategy

## 1. Goal

Automatic layout is a core product feature. A semantically correct graph that becomes a “spaghetti diagram” does not meet the product vision.

Use `elkjs` as the primary layout engine and keep layout behind a project-owned adapter.

## 2. Default algorithm

Default profile: **ELK Layered**.

Reasons:

- metamodels contain meaningful direction, especially inheritance and ownership;
- layered layout is designed for directed node-link graphs;
- ELK supports ports and edge routing;
- layout is independent from React Flow rendering.

## 3. Initial profiles

### `hierarchy-down`

- algorithm: layered
- direction: DOWN
- orthogonal edge routing
- larger spacing between layers than within a layer
- optimize crossing minimization

Best for inheritance-heavy metamodels.

### `hierarchy-right`

Same as above with direction RIGHT.

Best for wide screens and long inheritance chains.

### `compact`

- layered or alternative supported ELK profile after evaluation;
- reduced spacing;
- intended for overview mode and very large models.

Do not expose dozens of raw ELK options in the normal UI.

## 4. Deterministic node sizing

ELK requires node dimensions. Avoid depending on an unstable render-measure-layout-render loop for basic correctness.

Recommended approach:

- use controlled node widths per detail mode with a bounded expansion rule for exceptionally long names;
- compute height from deterministic row/compartment metrics;
- truncate/wrap according to documented renderer rules;
- feed exact computed size to both ELK and renderer.

Example conceptual constants:

```ts
interface NodeMetrics {
  minWidth: number;
  maxWidth: number;
  headerHeight: number;
  rowHeight: number;
  compartmentPadding: number;
}
```

The renderer and layout sizing function share these metrics from one module.

## 5. Ports

Use semantically stable ports where they improve routing.

At minimum, the adapter should support side-aware ports:

```text
TOP
RIGHT
BOTTOM
LEFT
```

Do not expose ports as Ecore concepts; they are geometry aids.

For generalization in DOWN layout, prefer superclass-facing/top and subclass-facing/bottom routing consistent with hierarchy direction.

For associations, allow ELK to choose practical sides unless constraints measurably improve crossings.

## 6. Edge routing

Default to orthogonal routing for dense UML-like diagrams because it improves traceability and publication readability.

Store ELK bend points/sections in LayoutModel. The React Flow edge renderer and SVG exporter should consume the same route geometry where practical.

## 7. Multiple edges

Cases include:

- subclass with multiple supertypes;
- multiple different references between same pair of classes;
- reference plus inheritance between same nodes;
- self-reference.

The layout adapter must preserve unique relation IDs and route each relation distinguishably. Never deduplicate simply by `(source,target)`.

## 8. Self references

Self EReferences need an explicit loop route and label placement strategy. Include fixtures for:

```text
Category.categories : Category [0..*]
```

A self-reference cannot collapse to a zero-length edge.

## 9. Stable mental map

Use these rules:

- manual drag creates view-only position overrides;
- changing selection alone never triggers layout;
- opening/closing inspector never triggers layout;
- relation visibility/filter changes may trigger layout only when the visible graph changes;
- detail-level changes may trigger layout because node dimensions change;
- Auto Layout discards manual position overrides intentionally;
- preserve viewport center around selected node after re-layout where possible.

## 10. Layout worker

Run ELK in a Web Worker for non-trivial diagrams.

Application protocol:

```ts
interface LayoutRequest {
  requestId: number;
  diagram: SizedDiagram;
  profileId: LayoutProfileId;
}

type LayoutResponse =
  | { requestId: number; result: LayoutModel }
  | { requestId: number; error: string };
```

The main thread only applies the latest relevant request.

## 11. Layout progress UX

For small graphs, layout should feel immediate.

For larger graphs:

- retain previous diagram when possible;
- show a non-blocking “Laying out…” status;
- do not freeze toolbar/search;
- allow a new filter/detail action to supersede the pending request.

## 12. Quality evaluation corpus

Create representative layout fixtures:

1. inheritance tree;
2. multiple inheritance diamond;
3. dense bidirectional network;
4. containment tree + cross references;
5. many parallel relations;
6. self references;
7. nested packages;
8. 20-node real metamodel;
9. 50-node synthetic model;
10. 100+ node stress model.

Visual regression snapshots should verify that changes do not produce obviously worse crossings/overlaps.

## 13. Hard layout invariants

A layout result is invalid if:

- a node has non-finite coordinates or size;
- two semantic nodes share the same layout ID;
- an edge loses its relation ID;
- bend points contain non-finite values;
- a rendered endpoint no longer maps to its source/target semantic node.

Overlap minimization is a quality goal; semantic endpoint correctness is a hard invariant.
