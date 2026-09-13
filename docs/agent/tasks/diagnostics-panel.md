# F01 — Diagnostics Panel & Ecore Analyzer

## Goal
Turn the current Ecore Viewer into an **Ecore Analyzer** by exposing semantic diagnostics in the UI and linking each diagnostic back to the affected diagram element.

Reuse the existing parser/resolver/semantic diagnostics pipeline wherever possible. Do **not** duplicate semantic validation logic inside the UI.

## Scope
Implement end-to-end diagnostics support for at least:
- unresolved reference
- malformed or mismatched `eOpposite`
- invalid multiplicity
- duplicate classifier
- unknown / unresolved `EDataType`
- unknown / unresolved classifier
- existing parser/resolver diagnostics already produced by the current codebase

Also implement:
- Diagnostics Panel
- severity summary
- severity filtering
- diagnostic details
- click diagnostic → select/focus/highlight corresponding diagram element
- graceful handling when the affected element cannot be rendered

Out of scope:
- automatic repair of `.ecore`
- editing the `.ecore`
- permanent diagnostic suppression
- remote schema lookup
- speculative resolution of unresolved references

## Required Architecture
```text
.ecore
  ↓
Parser / Resolver / Validation
  ↓
Ecore diagnostics
  ↓
Presentation mapping
  ↓
Diagnostics Panel
  ↓
Selection / Focus / Highlight
```

Rules:
- UI must not reimplement semantic validation.
- `EcoreModel` must not be mutated for UI interaction.
- Diagnostic presentation state must remain separate from semantic state.
- A diagnostic should link to stable element IDs whenever possible.
- Unresolved targets must never be guessed.
- One malformed semantic condition must not crash the diagram.

## Diagnostic Contract
Review the existing diagnostic type first and extend it only if necessary.

The effective contract should support equivalent information to:
```ts
type DiagnosticSeverity = "error" | "warning" | "info";

interface Diagnostic {
  id: string;
  code: string;
  severity: DiagnosticSeverity;
  message: string;
  sourceElementId?: string;
  relatedElementIds?: string[];
  rawReference?: string;
  details?: Record<string, unknown>;
}
```

Do not introduce duplicate diagnostic representations if an equivalent existing type already exists.

## Validation Rules

### 1. Unresolved reference
Example:
```text
Auction::bidder → #//BidderX
```
Requirements:
- preserve raw unresolved URI/reference
- link to source classifier/reference when possible
- never invent a target

### 2. eOpposite mismatch
Examples:
- only one side points to the other
- target reference does not point back
- incompatible endpoints
- malformed opposite URI

Requirements:
- include both involved elements when known
- do not silently merge malformed opposites
- clicking the diagnostic should highlight both ends when both exist

### 3. Invalid multiplicity
Example:
```text
lowerBound = 2
upperBound = 1
```
Requirements:
- include lower/upper values in details
- link to affected feature

### 4. Duplicate classifier
Example:
```text
EClass Agent
EClass Agent
```
Requirements:
- identify all conflicting classifier IDs if possible
- avoid non-deterministic winner selection in UI

### 5. Unknown / unresolved datatype or classifier
Example:
```text
xyz.ecore#//Money
```
Requirements:
- preserve raw URI
- identify feature using the type
- distinguish unresolved external type from malformed local type when existing semantics support that distinction

## Diagnostics Panel UI
Suggested layout:
```text
Diagnostics
────────────────────────────────
2 Errors · 3 Warnings

[All] [Errors] [Warnings] [Info]

❌ Unresolved reference
   Auction::bidder → #//BidderX

⚠ eOpposite mismatch
   Auction::bids ↔ Bid::auction
```

Requirements:
- total counts by severity
- filter by severity
- empty state when there are no diagnostics
- deterministic ordering
- readable message
- diagnostic code available in details
- raw reference/details available when useful
- keyboard accessible
- works in light and dark theme

Ordering:
1. error
2. warning
3. info

## Diagram Navigation
Clicking a diagnostic must:
1. select the affected element if rendered
2. pan/focus viewport to it
3. visibly highlight it
4. preserve enough context to understand the problem

For relationship diagnostics:
- highlight edge when it exists
- otherwise highlight source/related nodes

For multiple related elements:
- highlight all relevant elements
- focus viewport so all relevant rendered elements are visible when practical

If the affected element is not rendered:
- do not crash
- keep diagnostic selected
- show semantic/source details
- optionally focus nearest valid source element

Do not mutate semantic model data during navigation.

## Highlight Behavior
Requirements:
- selected diagnostic remains visually identifiable
- affected node/edge receives diagnostic highlight state
- changing diagnostic selection clears previous diagnostic highlight
- clearing diagnostic selection restores normal diagram appearance
- unrelated elements may be visually de-emphasized if consistent with current UX

Do not hardcode semantic colors into core model types.

## State Management
Keep these concepts separate:
```text
semantic diagnostics
diagnostic filter
selected diagnostic
diagram selection
diagnostic highlight
viewport/focus state
```

Avoid storing presentation-only state in `EcoreModel` or `DiagramModel`.

## Tests

### Unit tests
Cover:
- unresolved reference diagnostic generation
- malformed `eOpposite`
- invalid multiplicity
- duplicate classifier
- unresolved datatype/classifier
- stable severity/code/message
- source/related element IDs
- no unintended duplicate diagnostics

### Component tests
Cover:
- panel renders diagnostics
- counts are correct
- filtering works
- empty state works
- details render correctly
- selecting a diagnostic updates selected state
- keyboard interaction works

### Integration / E2E
Required scenario:
```text
load invalid .ecore
→ parser/resolver generates diagnostics
→ Diagnostics Panel renders them
→ click diagnostic
→ corresponding node/edge is selected
→ viewport focuses it
→ diagnostic highlight is visible
```

Also test:
- multiple diagnostics on same element
- unresolved/non-rendered target
- `eOpposite` diagnostic involving two rendered elements
- model with zero diagnostics
- switching diagnostics
- severity filtering
- pan/zoom still works after navigation

## Regression Requirements
The feature must not break:
- `.ecore` parsing
- resolver behavior
- semantic correctness
- DiagramModel generation
- React Flow rendering
- node dragging
- edge synchronization
- auto-layout
- search
- explorer selection
- inspector
- zoom / pan / fitView
- SVG export
- production build

## Acceptance Criteria
- [x] Existing diagnostics pipeline audited before implementation.
- [x] UI does not duplicate semantic validation logic.
- [x] Diagnostic contract supports severity, code, message and element linkage.
- [x] Unresolved references are surfaced.
- [x] `eOpposite` mismatches are surfaced.
- [x] Invalid multiplicities are surfaced.
- [x] Duplicate classifiers are surfaced.
- [x] Unknown/unresolved datatypes or classifiers are surfaced.
- [x] Existing parser/resolver diagnostics appear in the panel.
- [x] Diagnostics Panel displays error/warning/info counts.
- [x] Severity filters work.
- [x] Zero-diagnostics empty state exists.
- [x] Clicking a diagnostic selects/focuses affected diagram element.
- [x] Related nodes/edges are highlighted when applicable.
- [x] Non-rendered/unresolved targets are handled gracefully.
- [x] Diagnostic selection does not mutate semantic data.
- [x] Unit tests pass.
- [x] Component tests pass.
- [x] E2E diagnostic-navigation tests pass.
- [x] Typecheck passes.
- [x] Lint passes.
- [x] Production build passes.
- [x] No new scoped `TODO` / `FIXME` / placeholder remains.
- [x] Checklist is updated accurately.
- [x] Changes are committed and pushed to `main`.

Completion note (2026-09-13): Feature F01 Diagnostics Panel & Ecore Analyzer completed end-to-end. Diagnostic model contract extended with stable element linkage (sourceElementId, relatedElementIds, rawReference, details) without mutating core semantic state or reimplementing validation in the UI. Responsive bottom Diagnostics Panel created with collapsible drawer, severity counts (error, warning, info), severity filters, clean highlight dismiss, keyboard accessibility, and dark/light mode parity. Canvas adapter, node renderer, and edge renderer enhanced with `diagnostic` selection state and glowing outline animations (.uml-node--diagnostic, .semantic-edge__path--diagnostic). Auto-focus centering and selection synchronization implemented across nodes and edges. Unit tests (240 passed), component tests, E2E tests (51 passed), typecheck, lint, and production build all 100% verified.

## Verification
Before completion run project-standard verification from `docs/agent/agent.md`.

At minimum verify:
```text
tests
typecheck
lint
E2E
production build
```

Manually verify with at least:
1. one valid `.ecore` with zero diagnostics
2. one unresolved reference
3. one `eOpposite` mismatch
4. one invalid multiplicity
5. one duplicate classifier/type problem

For each invalid case verify:
```text
diagnostic generated
→ panel visible
→ message useful
→ click works
→ diagram focus/highlight correct
→ no crash
```

## Completion
This task is complete only when Diagnostics works end-to-end as:
```text
semantic problem
→ diagnostic generated
→ visible in UI
→ user understands the problem
→ click navigates to the affected model element
```

Do not stop after implementing only the panel or only the validation layer.
