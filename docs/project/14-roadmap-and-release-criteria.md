# 14 — Roadmap and Release Criteria

## 1. Development strategy

Development tasks are intentionally ordered by **risk and semantic difficulty**, not by how visually impressive they are.

The hardest correctness problems should be solved while using the strongest reasoning capacity:

- Ecore/XMI parsing variants;
- URI/reference resolution;
- opposite/containment semantics;
- generic types;
- deterministic diagram mapping;
- automatic layout/routing;
- true vector export.

UI polish follows once the semantic foundation is trustworthy.

The executable task sequence is in `docs/agent/task.md`.

## 2. Internal milestone — Semantic Core

Complete when:

- fixture corpus exists;
- parser supports required roots/classifiers/features;
- URI resolver handles local, positional, builtin, and external cases;
- semantic diagnostics are stable;
- eOpposite, containment, inheritance, bounds, generics are represented correctly;
- pipeline tests pass without React.

## 3. Internal milestone — Visual Core

Complete when:

- DiagramModel maps semantic entities correctly;
- nodes have deterministic geometry;
- ELK layout worker produces valid routes;
- UML/Ecore custom nodes and semantic edges render correctly;
- selection retains exact semantic IDs;
- SVG exporter produces true vector output from layout data.

At this milestone, the product can be visually plain but must be technically trustworthy.

## 4. Beta milestone — Exploration UX

Complete when:

- drag/drop and file picker are polished;
- Model Explorer works;
- search/jump works;
- detail modes work;
- focus/neighborhood works;
- filters work;
- inspector exposes exact semantics;
- minimap/Fit View/re-layout/manual movement work;
- preferences/theme work;
- PNG export works.

## 5. Release candidate

All P0/P1 requirements in `02-product-requirements.md` must be satisfied.

Additional gates:

- semantic unit/integration suite green;
- representative real-world fixtures load without crashes;
- Playwright critical workflows green;
- accessibility automated scan has no known serious/critical violation in supported screens;
- manual keyboard pass completed;
- light/dark visual regressions reviewed;
- no known case where displayed relation semantics contradict EcoreModel semantics;
- production build succeeds;
- deployment smoke test succeeds.

## 6. Release Definition of Done

A release is done when a new user can:

1. open a valid `.ecore` file locally;
2. receive a readable automatic diagram;
3. distinguish inheritance/reference/composition without color dependence;
4. inspect exact Ecore properties;
5. search and focus on a relevant classifier;
6. control diagram detail/noise;
7. navigate a large diagram with pan/zoom/minimap/Fit View;
8. export clean SVG and PNG;
9. recover from invalid input without reloading the app;
10. trust that the source file was processed locally.

## 7. Future ideas deliberately outside first release

These may be considered only after the release criteria above are stable:

- multiple loaded `.ecore` resources and explicit dependency linking;
- compare/diff two metamodel versions;
- package-aware collapsing/grouping;
- OCL annotation visualization;
- OCL syntax checking/execution via separate capability;
- semantic impact analysis;
- PlantUML/Mermaid export;
- shareable serialized view settings without source model data;
- edit/save-back mode;
- plugin architecture.

Do not pull these into an active task unless the project scope is explicitly changed.
