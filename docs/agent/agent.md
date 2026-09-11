# AI Agent Development Rules — Ecore Visualizer

## 1. Mission

Build and maintain **Ecore Visualizer** as a browser-first tool whose primary purpose is:

> Make `.ecore` metamodels exceptionally easy to read, inspect, navigate, and export visually.

Semantic correctness is more important than visual novelty. The application is an **Ecore-aware viewer/explorer**, not a full Ecore IDE.

## 2. Source of truth

Use documentation in this order:

1. this file: `docs/agent/agent.md`;
2. the active task in `docs/agent/task.md`;
3. project docs explicitly listed by that task;
4. existing code/tests/interfaces directly involved in the task;
5. official library/Ecore documentation when a fact remains uncertain.

If docs conflict, stop making assumptions and reconcile the higher-priority contract in the same task.

## 3. Context discipline — do not read the whole project by default

Token efficiency is a project requirement.

For each task:

1. read this file once;
2. read only the active task section;
3. read only the project docs named in `Read first` for that task;
4. inspect the target files and their direct imports/consumers;
5. search for exact symbols before opening broad directories;
6. expand context only when a dependency/integration issue requires it.

Do **not** recursively read the full repository, all docs, all tests, or all fixtures “just in case.”

Broad exploration is justified only when:

- the active task changes an architecture-wide interface;
- an integration failure cannot be explained from direct dependencies;
- a repository-wide rename/migration is explicitly part of the task;
- the task's acceptance criteria require whole-product verification.

## 4. Scope guardrails

Unless a task explicitly changes scope, do not add:

- Ecore editing/save-back;
- Java/EMF code generation;
- OCL execution;
- accounts/authentication;
- backend storage;
- real-time collaboration;
- automatic network fetching of external `.ecore` resources;
- unrelated diagram types;
- plugin systems.

Future ideas belong in docs, not opportunistic implementation.

## 5. Core architecture — mandatory boundaries

Preserve this pipeline:

```text
.ecore bytes
→ XML/XMI
→ RawEcoreDocument
→ EcoreModel
→ DiagramModel
→ LayoutModel
→ Canvas / Vector Export
```

Rules:

- parser/resolver code must not import React Flow;
- EcoreModel must contain no coordinates;
- DiagramModel must contain no React components/types;
- layout code must not parse Ecore XML;
- React components must not resolve Ecore URIs;
- SVG export consumes semantic/layout models, not a screenshot of the DOM;
- UI state must never mutate source semantics.

## 6. Semantic correctness rules

These are non-negotiable:

- EReference is owned/navigable from its owner to target.
- Valid `eOpposite` references are two EReference instances; default UML mapping may merge them into one bidirectional association while preserving both IDs.
- Invalid/inconsistent opposites must not be silently merged.
- `containment=true` maps to composition with ownership at the source/container end.
- An inverse container reference must not create a duplicate composition edge.
- `upperBound=-1` means unbounded (`*`).
- Missing lower/upper bounds use Ecore defaults.
- Multiple inheritance is supported.
- Built-in Ecore datatypes resolve through a central registry.
- Unresolved external references stay explicit; never invent a classifier.
- Same names in different packages/elements must remain distinct through stable semantic IDs.
- Unknown/unsupported constructs produce diagnostics or preserved raw metadata; no silent disappearance.

When uncertain about Ecore semantics, verify against official Eclipse/EMF documentation before coding.

## 7. Technology direction

Default stack:

- React
- TypeScript with `strict: true`
- Vite
- `@xyflow/react`
- `elkjs`
- lightweight state management such as Zustand if already adopted
- Vitest
- Playwright
- `@axe-core/playwright`

Do not replace a core library without an explicit task and documented reason.

## 8. TypeScript quality

- Avoid `any` in domain/application code.
- At untrusted boundaries, use `unknown` then narrow/validate.
- Prefer discriminated unions for semantic variants.
- Prefer pure functions for parser/resolver/mapper transformations.
- Avoid hidden mutation of shared models.
- Avoid non-null assertions unless the invariant is locally obvious and tested.
- Keep semantic IDs deterministic; never use random IDs for Ecore entities.
- Keep functions/modules focused and composable.

## 9. UI quality

- UI should feel like a modern diagram/design tool, not an Eclipse clone.
- Relationship semantics may use color but must not depend on color alone.
- Icon-only controls require accessible names/tooltips.
- Preserve the user's mental map; do not trigger layout on selection or sidebar toggles.
- Large operations such as ELK layout must not unnecessarily block the main UI thread.
- Progressive disclosure is preferred over printing every Ecore flag in each node.

## 10. Security/privacy

Treat `.ecore` as untrusted local XML.

- reject `<!DOCTYPE` in V1;
- never fetch external resources automatically;
- never inject source strings through unsafe HTML;
- escape user-controlled content in SVG export;
- no scripts/remote resources in SVG;
- source model content remains local to browser by default;
- do not persist source content/model identifiers in local storage unless a future explicit requirement says so.

## 11. Testing workflow — default TDD

For behavior changes:

1. write or identify the failing test/fixture;
2. run it and confirm the expected failure;
3. make the smallest coherent implementation;
4. run the focused test until green;
5. run relevant neighboring tests;
6. run required type/lint/integration gates;
7. update docs when a contract intentionally changed.

Bug fixes require a regression test unless technically impossible; if impossible, document why in the task result.

Never weaken tests merely to get green CI.

## 12. Required validation

At minimum before a task is complete:

```bash
npm run typecheck
npm run lint
npm test -- --run
```

Run focused commands during development rather than the full suite after every edit.

If the task changes user-visible flows, renderer/export, accessibility, or layout snapshots, run the relevant Playwright/visual test command defined by the repository.

If a task changes only docs, code tests are unnecessary unless the task also changes generated/validated artifacts.

## 13. No false completion claims

Before saying a task is complete:

- run the required commands;
- inspect actual command exit status/output;
- confirm working tree contains only intended changes;
- verify each acceptance checkbox in the active task.

Do not claim “tests pass” based on expectation.

## 14. Dependency policy

Before adding a runtime dependency:

1. check whether browser APIs/current dependencies already solve the need;
2. confirm package maintenance/license suitability;
3. keep the dependency focused;
4. add tests around project-owned adapters so the dependency can be replaced later.

Do not add a package to avoid writing a small pure helper.

## 15. File/module discipline

Prefer files that each have one clear responsibility.

When a touched file becomes difficult to hold in context, split it only along a meaningful boundary related to the task. Do not perform unrelated repository refactors.

A large file is a signal to inspect responsibilities, not an automatic violation.

## 16. Error handling

User-facing failures should be diagnostic, not stack-trace driven.

Use stable diagnostic codes for semantic/parser issues.

Never hide an unexpected exception with an empty `catch`.

Unexpected internal errors may be logged in development and shown through a recoverable error boundary in production.

## 17. Performance discipline

- profile before complicated optimization;
- do not recompute parser/resolver/layout on pan/zoom;
- use ELK worker/request IDs for meaningful graphs;
- stale layout results must not overwrite newer requests;
- preserve deterministic sizing/layout inputs;
- optimize store subscriptions before introducing complex caching frameworks.

## 18. Git workflow — personal project

Use only the `main` branch for normal task execution.

At task start:

```bash
git status
git branch --show-current
```

Expected branch: `main`.

If remote may have changed and working tree is clean:

```bash
git pull --ff-only
```

Do not create routine feature branches/worktrees.

After each task passes acceptance:

```bash
git add <only intended files>
git commit -m "<type>: <concise task result>"
git pull --ff-only
git push origin main
```

If `git pull --ff-only` cannot fast-forward, do not force push. Inspect and reconcile safely.

Never use `git push --force` on `main`.
Never rewrite published `main` history.
Never use destructive cleanup (`reset --hard`, mass deletion, checkout overwrite) to hide unrelated changes.

## 19. Commit quality

Preferred prefixes:

- `feat:`
- `fix:`
- `test:`
- `refactor:`
- `docs:`
- `chore:`

Commit only coherent task changes. Do not include unrelated local files.

## 20. Task execution protocol

For every task in `task.md`:

1. mark/track the task checklist during work;
2. read only the task's named docs and direct code context;
3. identify exact interfaces produced/consumed;
4. create failing tests first for new semantics/bugs;
5. implement incrementally;
6. run focused tests after each meaningful change;
7. run task acceptance suite;
8. update relevant docs if behavior differs from written contract;
9. commit;
10. push `main`;
11. record a concise completion note with tests actually run.

Do not begin the next task while the current task has unresolved failures that affect its contract.

## 21. When blocked

Do not guess through a semantic ambiguity.

Try, in order:

1. active task + referenced project doc;
2. exact code/tests for the affected interface;
3. repository search for the relevant symbol/diagnostic;
4. official Ecore/library documentation;
5. minimal reproducible fixture/probe.

If the requirement itself is contradictory, document the contradiction and request/derive the safest explicit resolution rather than silently choosing one.

## 22. Definition of Done for an individual task

A task is done only when:

- its checklist/acceptance criteria are satisfied;
- required tests/typecheck/lint pass;
- no known semantic regression is introduced;
- no unrelated scope was added;
- docs/contracts are consistent with implementation;
- changes are committed and pushed to `main` when repository remote access is available.
