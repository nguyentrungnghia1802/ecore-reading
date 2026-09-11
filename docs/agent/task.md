# Ecore Visualizer — Implementation Tasks

> Execute tasks in order unless a task explicitly states that it is independent. Follow `docs/agent/agent.md` for every task.

## Global execution contract

- Work on `main` only.
- Do not read all project docs for each task; use the task's **Read first** list.
- Use focused repository search before broad exploration.
- New semantic behavior follows TDD.
- Each task ends with its own verification, commit, and push to `main`.
- Do not start Phase 2 merely because UI work feels easier; Phase 1 exists to remove the highest semantic/layout/export risks first.

## Standard commands

The repository should expose these scripts once bootstrap is complete:

```bash
npm run dev
npm run build
npm run typecheck
npm run lint
npm test -- --run
npm run test:e2e
```

Focused Vitest example:

```bash
npm test -- --run src/ecore/resolver/resolve-uri.test.ts
```

If actual script names differ after bootstrap, keep this document synchronized in the same task.

---

# Phase 1 — High-difficulty / high-accuracy tasks

Phase 1 contains the tasks where mistakes would corrupt the meaning of the diagram, destabilize the architecture, or create hard-to-fix layout/export debt. Use the strongest model/reasoning capacity here.

## P1-01 — Establish strict project foundation, domain contracts, and canonical fixture corpus

**Difficulty:** High  
**Why early:** Every later task depends on stable semantic IDs, domain interfaces, test fixtures, and build/test gates.

### Read first

- `docs/project/03-ecore-semantic-spec.md`
- `docs/project/04-internal-data-model.md`
- `docs/project/10-testing-and-quality.md`
- `docs/project/13-repository-and-engineering.md`

### Goal

Create a strict React/TypeScript/Vite project foundation and define project-owned Ecore/diagram/layout types before any UI-driven shortcuts appear.

### Expected areas

```text
package.json
vite.config.ts
tsconfig*.json
src/ecore/model/
src/diagram/model/
src/layout/model/
tests/fixtures/ecore/
```

### Checklist

- [x] Initialize/normalize Vite + React + TypeScript project with TypeScript strict mode enabled.
- [x] Add runtime dependencies needed by the architecture: React, React DOM, `@xyflow/react`, `elkjs`; add Zustand only if state implementation starts in this task.
- [x] Add test/dev tooling: Vitest, jsdom/happy-dom only where required, ESLint, Playwright, and `@axe-core/playwright`.
- [x] Add scripts for `build`, `typecheck`, `lint`, unit tests, and E2E tests.
- [x] Define stable `Diagnostic`, `Multiplicity`, classifier-reference, generic-type, Ecore entity, DiagramModel, and LayoutModel interfaces described in project docs.
- [x] Implement deterministic semantic-ID helpers; IDs must never depend on random UUIDs.
- [x] Define one central source-metadata interface retaining raw attributes/path without holding live DOM nodes.
- [x] Add fixture manifest describing the semantic purpose of each test fixture.
- [x] Add at least these small fixtures: minimal package, all-features, multiple inheritance, valid opposite, containment, self-reference, nested packages, external reference, generics, malformed XML.
- [x] Include at least one XMI-wrapped fixture and one direct EPackage-root fixture.
- [x] Write tests for semantic-ID determinism and multiplicity representation.
- [x] Ensure package scripts run cleanly on a fresh install.

### Interface produced

At minimum, later tasks must be able to import stable equivalents of:

```ts
Diagnostic
Multiplicity
ResolvedClassifierRef
GenericTypeRef
EcoreModel
EcorePackage
EcoreClassifier
EcoreClass
EcoreAttribute
EcoreReference
EcoreOperation
EcoreParameter
DiagramModel
DiagramNode
DiagramRelation
LayoutModel
```

### Acceptance

- [x] `npm run typecheck` passes.
- [x] `npm run lint` passes.
- [x] `npm test -- --run` passes.
- [x] Fixture files are valid for their intended positive/negative cases.
- [x] No UI component contains parser/resolver logic.
- [x] No semantic model imports React Flow types.

Completion note (2026-09-11): `npm ci`, `npm run typecheck`, `npm run lint`, `npm test -- --run` (23 tests), and `npm run build` passed.

### Commit

```text
feat: establish ecore visualizer domain foundation
```

---

## P1-02 — Build namespace-aware XML/XMI raw Ecore parser

**Difficulty:** Very High  
**Depends on:** P1-01

### Read first

- `docs/project/03-ecore-semantic-spec.md`
- `docs/project/06-parser-and-resolution.md`
- `docs/project/11-performance-security-privacy.md`

### Goal

Parse untrusted `.ecore` XML/XMI into a faithful unresolved raw AST without prematurely guessing Ecore references or losing source metadata.

### Expected areas

```text
src/ecore/raw/
src/ecore/parser/
src/ecore/parser/xml-safety.ts
src/ecore/parser/parse-raw-ecore.ts
src/ecore/parser/*.test.ts
```

### Checklist

- [x] Write failing tests for direct `EPackage` root and `xmi:XMI` wrapper before implementation.
- [x] Add pre-parse checks for empty file, configured max size, and `<!DOCTYPE` rejection.
- [x] Parse using browser XML APIs while detecting XML parser failures reliably.
- [x] Discover Ecore elements by namespace URI/local name rather than hardcoding only the literal `ecore` prefix.
- [x] Preserve package nesting and original classifier/feature order.
- [x] Parse classifier kinds from `xsi:type`/semantic type metadata; do not assume every `eClassifiers` is EClass.
- [x] Extract raw EClass, EAttribute, EReference, EOperation, EParameter, EEnum, EEnumLiteral, EDataType, ETypeParameter, EGenericType, EAnnotation structures.
- [x] Preserve unknown attributes and annotation data through `SourceMetadata`/raw metadata.
- [x] Preserve raw `eType`, `eSuperTypes`, `eOpposite`, exception, generic, and annotation references as strings/structured raw nodes.
- [x] Do not perform URI resolution in parser code.
- [x] Add parser diagnostics for unknown classifier/feature kinds while preserving inspectable source metadata.
- [x] Test namespace-prefix variation, missing optional attributes, malformed numeric/boolean strings, and nested packages.
- [x] Test that parser code has no imports from renderer/layout layers.

### Acceptance

- [x] Positive fixtures produce a deterministic RawEcoreDocument.
- [x] Malformed XML produces `XML_PARSE_ERROR` without throwing through the app boundary.
- [x] `DOCTYPE` fixture is rejected by the safety pre-check.
- [x] Unknown Ecore constructs produce diagnostics rather than silent disappearance.
- [x] Focused parser test suite passes.
- [x] Full typecheck/lint/unit suite passes.

Completion note (2026-09-11): focused parser suite (12 tests), full unit suite (35 tests), typecheck, and lint passed; parser/raw imports contain no renderer, layout, or diagram dependency.

### Commit

```text
feat: parse raw ecore xmi documents
```

---

## P1-03 — Implement Ecore URI normalization, local fragment resolution, and complete builtin datatype registry

**Difficulty:** Very High  
**Depends on:** P1-02

### Read first

- `docs/project/03-ecore-semantic-spec.md`
- `docs/project/06-parser-and-resolution.md`

### Goal

Resolve the reference forms encountered in Ecore/XMI without hardcoding one demo serialization style.

### Expected areas

```text
src/ecore/resolver/parse-ecore-uri-ref.ts
src/ecore/resolver/resolve-local-ref.ts
src/ecore/builtins/ecore-builtins.ts
src/ecore/resolver/*.test.ts
```

### Checklist

- [x] Write table-driven failing tests for `#//Agent`, `#//Agent/beliefs`, positional `#/0/Member`, positional feature fragments, builtin Ecore URI, and arbitrary external URI.
- [x] Implement `ParsedEcoreUriRef` normalization retaining the exact raw input.
- [x] Handle serialized type strings that contain a kind hint plus URI, e.g. `ecore:EDataType <uri>#//EString`.
- [x] Build local indexes by package/classifier/feature structural paths.
- [x] Resolve name-based local fragments.
- [x] Resolve positional XMI fragments against original structural order; do not reinterpret positions after filtering.
- [x] Implement a central registry covering standard Ecore builtin datatypes rather than only EString/EInt.
- [x] Distinguish `{kind:'local'}`, `{kind:'builtin'}`, and `{kind:'external', resolution:'unresolved'}`.
- [x] Never perform network fetches.
- [x] Emit stable diagnostics for unresolved local and external references with raw reference attached.
- [x] Add ambiguity tests for malformed duplicate names.
- [x] Add tests demonstrating that same-named classifiers in different packages resolve distinctly.

### Acceptance

- [x] Resolver output is deterministic.
- [x] All URI normalization fixtures pass.
- [x] Builtin datatypes do not become unresolved external nodes.
- [x] Unknown external types remain explicit and do not crash later mapping.
- [x] Full typecheck/lint/unit suite passes.

Completion note (2026-09-11): resolver suite (25 tests), full unit suite (60 tests), typecheck, and lint passed. Builtin names were cross-checked against Eclipse EMF EcorePackage documentation.

### Commit

```text
feat: resolve ecore uri references and builtins
```

---

## P1-04 — Construct canonical EcoreModel with exact defaults, ownership, inheritance, and diagnostics

**Difficulty:** Very High  
**Depends on:** P1-03

### Read first

- `docs/project/03-ecore-semantic-spec.md`
- `docs/project/04-internal-data-model.md`
- `docs/project/06-parser-and-resolution.md`

### Goal

Convert the raw AST into the canonical semantic model used by every later feature.

### Checklist

- [x] Write failing tests for Ecore default values: bounds, booleans, ordered/unique, containment, resolveProxies, structural-feature flags.
- [x] Assign deterministic semantic IDs to packages, classifiers, features, operations, parameters, literals, and type parameters.
- [x] Build package/classifier/feature indexes once and expose read-only lookup helpers.
- [x] Resolve EAttribute datatypes and EReference targets using P1-03 resolver.
- [x] Resolve all `eSuperTypes`, including multiple inheritance.
- [x] Preserve unresolved external supertypes explicitly.
- [x] Normalize multiplicity `-1` to semantic `'unbounded'` while retaining raw source value.
- [x] Detect invalid finite bounds (`lower > upper`) and invalid negative values other than Ecore's unbounded convention.
- [x] Detect inheritance cycles and emit involved semantic IDs.
- [x] Preserve annotation/source metadata on semantic entities.
- [x] Ensure each child knows its owner ID and each owner lists child IDs in source order.
- [x] Define lookup helpers that return explicit result types rather than throwing for normal unresolved conditions.
- [x] Add integration test: fixture text → raw parser → resolver → EcoreModel.

### Acceptance

- [x] No coordinate/render fields exist in EcoreModel.
- [x] Every semantic entity has a stable unique ID.
- [x] Multiple inheritance fixture resolves all supertypes.
- [x] Invalid cycle produces diagnostic but does not crash model construction.
- [x] Default-value tests match official Ecore behavior represented by project docs.
- [x] Full typecheck/lint/unit suite passes.

Completion note (2026-09-11): semantic-model suite (9 tests), full unit suite (69 tests), typecheck, and lint passed.

### Commit

```text
feat: build canonical resolved ecore model
```

---

## P1-05 — Resolve and validate eOpposite, containment, inverse-container, and parallel-reference semantics

**Difficulty:** Extreme  
**Depends on:** P1-04

### Read first

- `docs/project/03-ecore-semantic-spec.md`
- `docs/project/06-parser-and-resolution.md`
- `docs/project/07-diagram-notation.md`

### Goal

Make relation semantics trustworthy enough that the viewer never shows a misleading association/composition.

### Checklist

- [x] Add fixtures/tests for a valid symmetric opposite pair.
- [x] Add test where only one side declares `eOpposite`; treat it as malformed, emit `ECORE_INVALID_OPPOSITE`, and do not merge the two references.
- [x] Add test for inconsistent reverse `eOpposite`.
- [x] Add test for opposite path resolving to a non-EReference.
- [x] Add test for containment reference paired with inverse container navigation.
- [x] Add test for two unrelated parallel references between the same EClasses.
- [x] Add self-containment/self-reference test.
- [x] Resolve `oppositeReferenceId` only after all references exist.
- [x] Validate endpoint compatibility before marking a pair as mergeable.
- [x] Keep raw EReference instances separate in EcoreModel even when a later UML view can merge them.
- [x] Emit `ECORE_INVALID_OPPOSITE` for inconsistent pairing.
- [x] Define a pure helper returning a validated opposite-pair descriptor used by DiagramMapper.
- [x] Ensure inverse container navigation cannot result in two overlapping composition relations in default mapping.

### Acceptance

- [x] Valid pairs are recognized deterministically.
- [x] Invalid pairs remain separate and carry diagnostics.
- [x] Parallel non-opposite references remain distinct.
- [x] Containment ownership direction is correct.
- [x] No semantic information is discarded during pairing.
- [x] Full typecheck/lint/unit suite passes.

Completion note (2026-09-11): eOpposite suite (7 tests), full unit suite (77 tests), typecheck, and lint passed.

### Commit

```text
feat: validate ecore opposite and containment semantics
```

---

## P1-06 — Implement generic types, ETypeParameters, exceptions, annotations, and remaining high-risk Ecore edge cases

**Difficulty:** Very High  
**Depends on:** P1-04, P1-05

### Read first

- `docs/project/03-ecore-semantic-spec.md`
- `docs/project/06-parser-and-resolution.md`

### Goal

Prevent “common simple files work, research-grade metamodels lose information” by preserving advanced Ecore constructs before UI code hardens assumptions.

### Checklist

- [x] Add recursive GenericTypeRef construction tests.
- [x] Resolve classifier-based generic types and type-parameter-based generic types distinctly.
- [x] Preserve upper/lower generic bounds and nested type arguments.
- [x] Parse/resolve EClass and EOperation type parameters.
- [x] Parse/resolve EOperation EExceptions where serialized.
- [x] Preserve EAnnotation `source`, detail key/value pairs, and parseable nested data.
- [x] Add formatter tests for representative generic signatures without flattening the semantic storage prematurely.
- [x] Test user-defined EDataType and EEnum metadata.
- [x] Test explicit enum literal `value`/`literal` values.
- [x] Verify unknown annotations remain inspectable and are never executed.
- [x] Add at least one real-world-like fixture combining generics, annotations, inheritance, and references.

### Acceptance

- [x] Advanced constructs survive parse → semantic model round trip without silent loss.
- [x] Generic formatter output is deterministic.
- [x] Annotation content is stored as data only.
- [x] Full typecheck/lint/unit suite passes.

Completion note (2026-09-11): advanced semantic suite (7 tests), full unit suite (85 tests), typecheck, and lint passed.

### Commit

```text
feat: preserve advanced ecore type semantics
```

---

## P1-07 — Build pure EcoreModel → DiagramModel semantic mapper

**Difficulty:** Extreme  
**Depends on:** P1-05, P1-06

### Read first

- `docs/project/04-internal-data-model.md`
- `docs/project/07-diagram-notation.md`
- `docs/project/02-product-requirements.md` sections 3–4

### Goal

Create the single authoritative mapping from Ecore semantics to visual semantics, independent of React Flow and screen geometry.

### Expected interface

```ts
buildDiagram(model: EcoreModel, options: DiagramOptions): DiagramModel
```

### Checklist

- [x] Define `DiagramOptions` for detail mode, visible relation kinds, external-placeholder policy, and focus subset input.
- [x] Add mapper tests directly from small semantic-model objects; do not require XML for every case.
- [x] Map each EClass/EEnum/user EDataType to the correct node kind/stereotype.
- [x] Map every local inheritance relation with subclass → superclass semantics.
- [x] Map one-way EReference with explicit navigability and target multiplicity.
- [x] Merge valid eOpposite pairs into one DiagramRelation while storing both EReference semantic IDs.
- [x] Map containment to composition with diamond metadata at the container/source end.
- [x] When a valid opposite pair contains exactly one containment reference, canonicalize relation orientation so the containing EClass is always `sourceNodeId` regardless of source declaration order.
- [x] Combine inverse container reference role/multiplicity on the same composition relation.
- [x] Keep parallel non-opposite references as unique relations.
- [x] Map self references without collapsing relation identity.
- [x] Create external/unresolved placeholder/relation only according to options and label it explicitly.
- [x] Implement Overview/Standard/Detailed/Ecore node-row builders as pure functions.
- [x] Ensure Ecore mode can expose owned references even when UML mode represents them primarily as edges.
- [x] Retain semantic IDs on every node, row, badge, and relation needed by inspector/selection.
- [x] Add mapper invariant checker used by tests/development.

### Acceptance

- [x] DiagramModel imports no React Flow/ELK types.
- [x] Same EcoreModel/options produce deep-equal DiagramModel.
- [x] All notation cases in `07-diagram-notation.md` have tests.
- [x] Multiplicity endpoint tests explicitly verify source vs target placement.
- [x] Full typecheck/lint/unit suite passes.

Completion note (2026-09-11): diagram mapper suite (9 tests), full unit suite (94 tests), typecheck, and lint passed.

### Commit

```text
feat: map ecore semantics to diagram model
```

---

## P1-08 — Implement deterministic node sizing, text contracts, and semantic layout ports

**Difficulty:** High  
**Depends on:** P1-07

### Read first

- `docs/project/08-layout-strategy.md`
- `docs/project/07-diagram-notation.md`

### Goal

Give layout deterministic dimensions that exactly match renderer/export contracts, avoiding a fragile DOM-measure loop.

### Expected interface

```ts
sizeDiagram(diagram: DiagramModel, metrics: DiagramMetrics): SizedDiagram
```

### Checklist

- [ ] Define shared `DiagramMetrics` for header/row/compartment padding and min/max widths.
- [ ] Define one text overflow/wrapping strategy used by canvas and SVG exporter.
- [ ] Add deterministic width calculation rule for long names/signatures within documented bounds.
- [ ] Calculate height from visible compartments/rows for each node kind/detail mode.
- [ ] Add tests for empty class, long class, many rows, enums, datatypes, each detail mode.
- [ ] Define side-aware layout port identifiers without leaking them into EcoreModel.
- [ ] Assign preferred generalization ports consistent with hierarchy direction.
- [ ] Keep association ports flexible unless explicit routing constraints improve readability.
- [ ] Ensure sizing output is serializable for Web Worker use.

### Acceptance

- [ ] Repeated sizing produces identical geometry.
- [ ] No positive node has zero/negative dimensions.
- [ ] Renderer/export can consume the same metric constants.
- [ ] Full typecheck/lint/unit suite passes.

### Commit

```text
feat: add deterministic diagram geometry sizing
```

---

## P1-09 — Build ELK layout adapter, routing profiles, Web Worker protocol, and stale-request protection

**Difficulty:** Extreme  
**Depends on:** P1-08

### Read first

- `docs/project/08-layout-strategy.md`
- `docs/project/05-system-architecture.md`
- `docs/project/11-performance-security-privacy.md`

### Goal

Turn a sized semantic graph into a reliable LayoutModel without blocking UI or losing relation identity.

### Checklist

- [ ] Create project-owned ELK adapter; application code outside layout layer must not depend on raw ELK JSON shape.
- [ ] Implement `hierarchy-down`, `hierarchy-right`, and `compact` layout profiles.
- [ ] Default to layered layout and orthogonal routing for hierarchy profiles.
- [ ] Convert all nodes with deterministic width/height and stable IDs.
- [ ] Preserve each relation as a unique ELK edge even for same source/target pair.
- [ ] Support self-reference routing and multiple edges.
- [ ] Convert ELK sections/bend points to LayoutRelation sections.
- [ ] Validate finite node coordinates, positive sizes, finite route points, and endpoint identity.
- [ ] Implement worker request/response types with `requestId`.
- [ ] Implement main-thread coordinator that ignores stale responses.
- [ ] Add failure path returning a recoverable layout error without destroying semantic data.
- [ ] Add integration tests on dense, multiple-inheritance, containment, parallel-edge, and self-reference graphs.
- [ ] Add deterministic normalized-layout regression fixtures where stable enough.

### Acceptance

- [ ] Layout work for medium fixtures can execute in worker mode.
- [ ] Stale layout result test proves older request cannot overwrite newer request.
- [ ] Every input relation ID survives layout.
- [ ] No NaN/Infinity geometry in test corpus.
- [ ] Full typecheck/lint/unit/integration suite passes.

### Commit

```text
feat: add elk worker layout pipeline
```

---

## P1-10 — Implement semantically exact React Flow node/edge renderer and selection adapter

**Difficulty:** Very High  
**Depends on:** P1-09

### Read first

- `docs/project/07-diagram-notation.md`
- `docs/project/09-ui-ux-spec.md` sections 5–6
- `docs/project/05-system-architecture.md`

### Goal

Render LayoutModel interactively without allowing React Flow state to become semantic truth.

### Checklist

- [ ] Create a thin adapter from LayoutModel to React Flow nodes/edges.
- [ ] Implement custom EClass, EEnum, EDataType, and external-placeholder nodes.
- [ ] Render class compartments according to precomputed sizing metrics.
- [ ] Implement generalization edge with hollow triangle at supertype end.
- [ ] Implement composition edge with filled diamond at container/source end.
- [ ] Implement ordinary navigable reference edge and bidirectional association representation.
- [ ] Place role labels/multiplicities using DiagramRelation end metadata rather than recomputing Ecore semantics in edge components.
- [ ] Render parallel/self-reference routes without semantic deduplication.
- [ ] Preserve `semanticId` selection mapping for nodes, rows, and edges.
- [ ] Add selection/highlight/de-emphasis states that remain understandable without color alone.
- [ ] Add component/unit tests for arrowhead/diamond direction and accessible labels where practical.
- [ ] Add initial Playwright visual snapshots for core relation fixtures.

### Acceptance

- [ ] Renderer code contains no Ecore URI resolution logic.
- [ ] Relation direction matches mapper tests visually and semantically.
- [ ] Selection reports exact semantic IDs.
- [ ] Core fixtures render without overlapping node internals or clipped headers.
- [ ] Relevant unit + Playwright visual tests pass.

### Commit

```text
feat: render semantic ecore diagrams interactively
```

---

## P1-11 — Build true vector SVG exporter from DiagramModel + LayoutModel

**Difficulty:** Extreme  
**Depends on:** P1-08, P1-09, P1-10 notation contracts

### Read first

- `docs/project/12-export-and-persistence.md`
- `docs/project/07-diagram-notation.md`
- `docs/project/11-performance-security-privacy.md`

### Goal

Produce publication-quality standalone SVG without raster screenshots or React DOM `foreignObject` dependence.

### Expected interface

```ts
serializeSvg(
  diagram: DiagramModel,
  layout: LayoutModel,
  options: SvgExportOptions
): string
```

### Checklist

- [ ] Write tests for XML/SVG escaping of model-controlled names, annotation text, ampersands, angle brackets, and quotes.
- [ ] Create standalone `<svg>` with deterministic `viewBox` covering whole graph plus padding.
- [ ] Serialize node shapes, headers, compartments, row text, stereotypes, and diagnostics markers needed by current view.
- [ ] Serialize routed edge sections from LayoutModel.
- [ ] Define reusable SVG markers for reference arrows/generalization and explicit composition diamond geometry.
- [ ] Place role/multiplicity labels from DiagramRelation semantic ends.
- [ ] Use actual SVG text with documented system font stack.
- [ ] Exclude scripts, event handlers, remote resources, and raw unescaped markup.
- [ ] Support transparent/light/dark background option.
- [ ] Add XML parse-back test proving produced SVG is well-formed.
- [ ] Add semantic snapshot tests that inspect marker/diamond direction rather than only a large opaque string snapshot.
- [ ] Compare representative SVG output visually against canvas notation.

### Acceptance

- [ ] SVG remains vector when zoomed.
- [ ] No `foreignObject` is required for canonical export.
- [ ] Malicious-looking model text is escaped and non-executable.
- [ ] Whole diagram is inside viewBox with no clipped markers/labels in fixtures.
- [ ] Unit + export integration tests pass.

### Commit

```text
feat: export ecore diagrams as vector svg
```

---

## P1-12 — Harden the complete semantic → layout → render/export pipeline with real-world regression and performance tests

**Difficulty:** Very High  
**Depends on:** P1-01 through P1-11

### Read first

- `docs/project/10-testing-and-quality.md`
- `docs/project/11-performance-security-privacy.md`
- `docs/project/14-roadmap-and-release-criteria.md`

### Goal

Before moving to broad UI work, prove the hard core works end-to-end on representative models and record performance baselines.

### Checklist

- [ ] Add at least 2–3 legally usable representative real-world or realistic-complexity `.ecore` fixtures, with source/license note if copied externally.
- [ ] Add synthetic 50-node and 100+ node stress fixtures/generators with deterministic structure.
- [ ] Create pipeline integration tests: file text → parse → resolve → map → size → layout → SVG.
- [ ] Assert no lost classifier/relation IDs between stages.
- [ ] Assert all exported/layout geometry finite and bounded.
- [ ] Add performance measurement harness for parse, resolve, map, size, layout, export.
- [ ] Record baseline results in a test/dev artifact or project doc without turning variable wall-clock values into flaky hard CI assertions.
- [ ] Add visual regression for multiple inheritance, dense cross-reference, containment, parallel edges, self-reference.
- [ ] Test malformed input recovery at non-UI pipeline boundary.
- [ ] Fix semantic/layout regressions found by corpus rather than excluding fixtures.
- [ ] Review Phase 1 docs/interfaces for contradictions introduced during implementation and update them.

### Acceptance

- [ ] Semantic core milestone in `14-roadmap-and-release-criteria.md` is satisfied.
- [ ] Visual core milestone is technically satisfied even if workspace UI is not polished.
- [ ] No known test fixture displays the wrong relation kind/direction/multiplicity.
- [ ] Medium layout does not block main thread in worker-based application path.
- [ ] Full unit/integration/visual suite required by current repository passes.

### Commit

```text
chore: harden semantic and layout core
```

---

# Phase 2 — Easy to medium-high implementation tasks

Phase 2 turns the trustworthy core into the polished exploration product. These tasks still require care, but failures are generally easier to isolate than Phase 1 semantic/layout errors.

## P2-01 — Build polished file-open, empty, loading, and recoverable error workspace states

**Difficulty:** Medium  
**Depends on:** Phase 1 core

### Read first

- `docs/project/09-ui-ux-spec.md` sections 1–3, 12
- `docs/project/02-product-requirements.md` sections 2 and 10
- `docs/project/11-performance-security-privacy.md`

### Checklist

- [ ] Implement empty state with drag/drop and native file picker.
- [ ] Show local-processing privacy statement.
- [ ] Connect file ingestion to parser/resolver/layout pipeline without adding backend upload.
- [ ] Show parsing/layout progress states without freezing the entire shell.
- [ ] Implement invalid-file screen with actionable diagnostic and “Open another file.”
- [ ] Recover from invalid file to valid file without browser refresh.
- [ ] Display loaded source base filename safely.
- [ ] Add Playwright flow for valid file, invalid file, then valid recovery.

### Acceptance

- [ ] First-time user can open a fixture with no configuration.
- [ ] Error state never presents partial invalid graph as trustworthy.
- [ ] File content is not persisted or uploaded.
- [ ] Relevant E2E tests pass.

### Commit

```text
feat: add local ecore file workspace flow
```

---

## P2-02 — Implement collapsible Model Explorer with package/classifier tree

**Difficulty:** Medium

### Read first

- `docs/project/09-ui-ux-spec.md` section 4
- `docs/project/03-ecore-semantic-spec.md` sections 2–3

### Checklist

- [ ] Build package → classifier-kind → classifier tree from EcoreModel indexes.
- [ ] Distinguish class/enum/datatype by icon + text, not color only.
- [ ] Support nested packages.
- [ ] Single click selects semantic ID and centers target when needed.
- [ ] Show diagnostic badge counts.
- [ ] Make sidebar collapsible and preserve canvas size correctly.
- [ ] Add virtualization only if profiling shows need on stress fixture.
- [ ] Add component/E2E tests for duplicate classifier names in different packages.

### Acceptance

- [ ] Same-name classifiers navigate to correct semantic IDs.
- [ ] Opening/closing explorer does not trigger auto-layout.
- [ ] Keyboard can reach tree items/actions.

### Commit

```text
feat: add ecore model explorer
```

---

## P2-03 — Implement indexed search, ranking, jump, and feature-level selection

**Difficulty:** Medium-High

### Read first

- `docs/project/09-ui-ux-spec.md` section 8
- `docs/project/04-internal-data-model.md` ID sections

### Checklist

- [ ] Build a pure search index from EcoreModel.
- [ ] Index package/classifier/attribute/reference/operation/enum-literal fields.
- [ ] Implement ranking: exact classifier > prefix classifier > classifier substring > feature match > metadata.
- [ ] Add `Ctrl/Cmd+K` search opening.
- [ ] Show result kind and semantic context.
- [ ] Selecting classifier centers/selects node.
- [ ] Selecting feature selects owner node and inspector feature target.
- [ ] Reveal a filtered-out target only through explicit predictable rule and indicate filter change if required.
- [ ] Add tests for duplicate names, case behavior, exact/prefix ranking, and feature navigation.

### Acceptance

- [ ] Search on stress model remains responsive.
- [ ] Result selection never relies on display name alone.
- [ ] Search interaction has keyboard-only Playwright coverage.

### Commit

```text
feat: add semantic ecore search and jump
```

---

## P2-04 — Complete Overview/Standard/Detailed/Ecore UI modes and zoom-aware visual level of detail

**Difficulty:** Medium-High

### Read first

- `docs/project/07-diagram-notation.md` section 8
- `docs/project/09-ui-ux-spec.md` sections 6–7

### Checklist

- [ ] Add visible mode selector for Overview, Standard, Detailed, Ecore.
- [ ] Wire mode to DiagramModel mapper and deterministic node sizing.
- [ ] Re-layout only when node geometry/visible graph genuinely changes.
- [ ] Implement optional low-zoom simplification that hides tiny row text without changing semantic mode.
- [ ] Keep selected node meaningfully inspectable at low zoom.
- [ ] Add shortcuts `1`–`4` when canvas context makes them safe.
- [ ] Add visual regression for all four modes on same fixture.
- [ ] Verify mode labels/tooltips explain semantic differences.

### Acceptance

- [ ] Mode switch cannot corrupt selection semantic ID.
- [ ] Standard and Ecore views visibly differ as documented.
- [ ] Low zoom does not create unreadable text noise.

### Commit

```text
feat: add progressive ecore detail modes
```

---

## P2-05 — Implement exhaustive semantic Inspector for nodes, features, relations, and diagnostics

**Difficulty:** Medium-High

### Read first

- `docs/project/09-ui-ux-spec.md` section 9
- `docs/project/03-ecore-semantic-spec.md`
- `docs/project/04-internal-data-model.md`

### Checklist

- [ ] Build inspector selection model keyed by semantic ID/sub-selection, not display name.
- [ ] Class inspector: package/path, abstract/interface, supertypes, member counts, annotations, diagnostics, source metadata.
- [ ] EReference inspector: owner, target, bounds, containment, opposite, resolveProxies, feature flags, raw URI.
- [ ] Merged association inspector shows both underlying EReferences clearly.
- [ ] Operation inspector: return type, multiplicity, parameters, exceptions, type parameters, annotations.
- [ ] Enum/datatype inspector includes relevant exact Ecore metadata.
- [ ] Diagnostic selection scrolls/opens the relevant inspector section.
- [ ] Use collapsible groups for exhaustive flags.
- [ ] Opening/closing inspector must not re-layout graph.
- [ ] Add accessibility labels and keyboard close behavior.

### Acceptance

- [ ] Every visible semantic relation can be traced back to exact source EReference ID(s).
- [ ] Unresolved external target is clearly described as unresolved, never guessed.
- [ ] Inspector tests cover containment/opposite/generic examples.

### Commit

```text
feat: add semantic ecore inspector
```

---

## P2-06 — Implement selection emphasis and semantic neighborhood focus depth 1/2/3/All

**Difficulty:** Medium-High

### Read first

- `docs/project/09-ui-ux-spec.md` sections 10–11
- `docs/project/07-diagram-notation.md` section 10

### Checklist

- [ ] Implement pure graph-neighborhood traversal over enabled semantic relation kinds.
- [ ] Selecting node highlights first-hop neighbors without hiding unrelated nodes.
- [ ] Add Focus action with depth 1, 2, 3, All.
- [ ] Show active focus chip containing selected node and depth.
- [ ] Clear focus explicitly without losing ordinary selection.
- [ ] Decide/document how external placeholders count as hops and test it.
- [ ] Preserve focus center after re-layout where practical.
- [ ] Add tests for cycles and multiple paths; traversal must not loop infinitely.

### Acceptance

- [ ] Focus is based on semantic graph distance, not screen coordinates.
- [ ] Active focus state is always visible to user.
- [ ] Selection alone never triggers layout.

### Commit

```text
feat: add semantic neighborhood focus
```

---

## P2-07 — Implement node/relation filters with predictable selection/focus behavior

**Difficulty:** Medium

### Read first

- `docs/project/09-ui-ux-spec.md` section 11
- `docs/project/02-product-requirements.md` PR-035

### Checklist

- [ ] Add relation toggles: inheritance, containment, ordinary references, external/unresolved.
- [ ] Add node toggles for classes/enums/datatypes/external placeholders where meaningful.
- [ ] Apply filters at DiagramModel derivation boundary, not by arbitrary CSS hiding.
- [ ] Define behavior when current selection becomes filtered out: show explanation and clear/move selection deterministically.
- [ ] Define behavior when focus root is filtered out.
- [ ] Trigger new layout only when visible graph geometry changes.
- [ ] Add reset-to-default action.
- [ ] Add tests for filter combinations and merged opposite composition relations.

### Acceptance

- [ ] Filtered graph contains no dangling relation endpoints.
- [ ] User is never left with an invisible selected item without explanation.
- [ ] Filter state integrates with export.

### Commit

```text
feat: add semantic diagram filters
```

---

## P2-08 — Polish viewport interactions: Fit View, minimap, pan/zoom, manual moves, re-layout, viewport preservation

**Difficulty:** Medium-High

### Read first

- `docs/project/09-ui-ux-spec.md` sections 5–6
- `docs/project/08-layout-strategy.md` section 9

### Checklist

- [ ] Add React Flow Controls or project-owned equivalent for zoom in/out and Fit View.
- [ ] Add pannable/zoomable MiniMap for large graph orientation.
- [ ] Tune wheel/pan interaction for design-tool-like behavior and document chosen config.
- [ ] Implement manual node position overrides as view state only.
- [ ] Auto Layout clears/recomputes manual overrides intentionally.
- [ ] Selection/inspector toggles preserve viewport and node positions.
- [ ] Detail/filter re-layout attempts to keep selected node near previous viewport center.
- [ ] Add Fit View shortcut `F` scoped safely to canvas.
- [ ] Add E2E tests for manual move followed by re-layout and for minimap presence on loaded workspace.

### Acceptance

- [ ] No manual movement mutates EcoreModel/DiagramModel semantics.
- [ ] Fit View reliably frames visible graph.
- [ ] Sidebars toggling does not unexpectedly recompute layout.

### Commit

```text
feat: polish diagram viewport controls
```

---

## P2-09 — Add theme system and versioned local preference persistence

**Difficulty:** Easy-Medium

### Read first

- `docs/project/09-ui-ux-spec.md` section 15
- `docs/project/12-export-and-persistence.md` sections 9–10

### Checklist

- [ ] Define centralized CSS/theme variables for canvas, nodes, edges, selection, diagnostics, panels.
- [ ] Support system/light/dark.
- [ ] Add versioned preferences schema `ecore-visualizer.preferences.v1` or documented equivalent.
- [ ] Persist theme, detail mode, layout profile, relation defaults, minimap preference.
- [ ] Do not persist source model content, classifier names, annotations, or search history.
- [ ] Parse corrupted local storage defensively and fall back to defaults.
- [ ] Add unit tests for preference parse/migration/fallback.
- [ ] Add light/dark visual regression snapshots.

### Acceptance

- [ ] Theme works without semantic color dependence.
- [ ] Corrupt preference data cannot prevent startup.
- [ ] Browser storage inspection confirms no source model content is written.

### Commit

```text
feat: persist viewer preferences and themes
```

---

## P2-10 — Add export dialog and PNG export via canonical SVG path

**Difficulty:** Medium

### Read first

- `docs/project/12-export-and-persistence.md`

### Checklist

- [ ] Build export dialog showing current mode/filter/focus inclusion.
- [ ] Add SVG download using P1-11 serializer.
- [ ] Implement PNG by rasterizing canonical SVG output at high resolution rather than maintaining a second semantic renderer.
- [ ] Support transparent/light/dark export background.
- [ ] Sanitize filenames using source base name.
- [ ] Ensure whole visible graph export is default and labels/markers are not clipped.
- [ ] Add tests for filename, export options, and PNG dimensions.
- [ ] Add E2E test verifying download is produced.

### Acceptance

- [ ] SVG and PNG visually represent same current semantic view.
- [ ] PNG default is readable at 2×-class pixel density or equivalent documented scale.
- [ ] No local absolute path/source content is embedded as hidden metadata.

### Commit

```text
feat: add svg and png export workflow
```

---

## P2-11 — Complete keyboard navigation and accessibility quality gate

**Difficulty:** Medium-High

### Read first

- `docs/project/02-product-requirements.md` section 9
- `docs/project/09-ui-ux-spec.md` sections 13 and 15
- `docs/project/10-testing-and-quality.md` section 13

### Checklist

- [ ] Audit all icon-only controls for accessible names/tooltips.
- [ ] Ensure toolbar, explorer, search, inspector, export dialog, and settings are keyboard reachable.
- [ ] Implement/verify shortcuts: Open, Search, Fit, detail modes, Escape, zoom where appropriate.
- [ ] Ensure shortcuts do not fire while typing in text inputs except intended command behavior.
- [ ] Add visible focus indicators.
- [ ] Run axe checks on empty workspace, loaded workspace, inspector open, export dialog, dark theme.
- [ ] Add ARIA snapshot/role tests for critical controls where useful.
- [ ] Manually verify relation semantics remain understandable without relying on color.
- [ ] Fix serious/critical automated accessibility findings rather than suppressing them without reason.

### Acceptance

- [ ] Critical workflow can be performed without mouse.
- [ ] No known serious/critical automated accessibility violation in release screens.
- [ ] Focus state remains visible in light and dark theme.

### Commit

```text
fix: complete viewer accessibility and keyboard flows
```

---

## P2-12 — Final UX polish, large-model rendering optimization, and visual regression review

**Difficulty:** Medium-High

### Read first

- `docs/project/09-ui-ux-spec.md`
- `docs/project/11-performance-security-privacy.md`
- `docs/project/10-testing-and-quality.md`

### Checklist

- [ ] Profile 50-node and 100+ node scenarios in production build.
- [ ] Identify unnecessary rerenders/store subscriptions with evidence before optimization.
- [ ] Memoize node/edge components or selectors only where profiling shows benefit.
- [ ] Ensure pan/zoom does not rerun semantic mapping/layout.
- [ ] Refine spacing, typography, label hierarchy, panel density, loading states, tooltips, diagnostics badges.
- [ ] Review edge-label collisions on representative fixtures and improve without hiding multiplicity.
- [ ] Review empty/invalid/large/loading states for consistency.
- [ ] Review visual snapshots deliberately; do not mass-update without inspection.
- [ ] Verify no new UI polish introduced unsafe HTML or source-content persistence.
- [ ] Record updated performance baselines.

### Acceptance

- [ ] Medium/large diagrams remain interactable while worker layout runs.
- [ ] No known UI action causes full semantic pipeline rerun unnecessarily.
- [ ] Visual regression suite is reviewed and green.
- [ ] Product feels coherent in light/dark themes and 100%/typical high-DPI browser zoom.

### Commit

```text
perf: polish large ecore exploration experience
```

---

## P2-13 — Add CI, production deployment, release checklist, and final documentation synchronization

**Difficulty:** Medium

### Read first

- `docs/project/14-roadmap-and-release-criteria.md`
- `docs/project/13-repository-and-engineering.md`
- `docs/project/10-testing-and-quality.md`

### Checklist

- [ ] Add CI workflow for install, typecheck, lint, unit/integration tests, production build.
- [ ] Add Playwright job with deterministic browser/environment setup.
- [ ] Cache dependencies appropriately without hiding lockfile changes.
- [ ] Configure static hosting target compatible with client-side-only architecture.
- [ ] Add deployment smoke test or documented production check.
- [ ] Add user README with concise “open `.ecore` → explore → export” workflow and privacy statement.
- [ ] Review all P0/P1 requirements and link each to implementation/test coverage.
- [ ] Review `docs/project/` for stale interface names and synchronize intentionally changed contracts.
- [ ] Confirm no future-scope editor/backend/OCL execution accidentally entered release.
- [ ] Run complete release verification suite.
- [ ] Tag/release according to repository convention only after all release gates pass.

### Release verification

Run at minimum:

```bash
npm ci
npm run typecheck
npm run lint
npm test -- --run
npm run build
npm run test:e2e
```

### Acceptance

- [ ] Release candidate satisfies `docs/project/14-roadmap-and-release-criteria.md`.
- [ ] Static deployment loads and opens a fixture successfully.
- [ ] Source model processing remains local-only in production behavior.
- [ ] All docs reflect actual implementation rather than aspirational interfaces.

### Commit

```text
chore: prepare ecore visualizer release pipeline
```

---

# Phase completion checklists

## Phase 1 completion

Do not enter Phase 2 until all are true:

- [ ] Raw parser handles required XML/XMI shapes.
- [ ] URI resolver handles local/name/positional/builtin/external references.
- [ ] Canonical EcoreModel correctly represents defaults, inheritance, containment, eOpposite, generics, annotations.
- [ ] Diagram mapper has explicit tests for every relation kind and multiplicity end.
- [ ] Deterministic node sizing exists.
- [ ] ELK worker layout preserves every relation ID and ignores stale results.
- [ ] React Flow renderer visually preserves semantic direction/notation.
- [ ] True vector SVG export exists.
- [ ] Realistic/stress pipeline tests are green.
- [ ] No known semantic correctness issue is intentionally deferred to Phase 2.

## Phase 2 completion / release candidate

- [ ] File-open and error recovery UX complete.
- [ ] Explorer, search, inspector, focus, filters complete.
- [ ] Overview/Standard/Detailed/Ecore modes complete.
- [ ] Pan/zoom/Fit/minimap/manual movement/re-layout complete.
- [ ] Theme/preferences complete without persisting source content.
- [ ] SVG/PNG export workflow complete.
- [ ] Keyboard/accessibility gate complete.
- [ ] Large-model UX reviewed against performance baselines.
- [ ] CI/build/E2E/deployment smoke tests green.
- [ ] P0/P1 requirements and release Definition of Done satisfied.
