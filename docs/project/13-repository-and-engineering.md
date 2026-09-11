# 13 — Repository and Engineering Structure

## 1. Suggested repository tree

```text
.
├─ docs/
│  ├─ project/
│  └─ agent/
├─ public/
├─ src/
│  ├─ app/
│  │  ├─ App.tsx
│  │  ├─ routes-or-shell/
│  │  └─ store/
│  ├─ ecore/
│  │  ├─ model/
│  │  ├─ raw/
│  │  ├─ parser/
│  │  ├─ resolver/
│  │  ├─ validation/
│  │  └─ builtins/
│  ├─ diagram/
│  │  ├─ model/
│  │  ├─ mapper/
│  │  ├─ filters/
│  │  ├─ search/
│  │  └─ sizing/
│  ├─ layout/
│  │  ├─ elk/
│  │  ├─ worker/
│  │  └─ profiles/
│  ├─ renderer/
│  │  ├─ canvas/
│  │  ├─ nodes/
│  │  ├─ edges/
│  │  └─ theme/
│  ├─ features/
│  │  ├─ file-open/
│  │  ├─ explorer/
│  │  ├─ inspector/
│  │  ├─ search/
│  │  ├─ focus/
│  │  ├─ filters/
│  │  └─ export/
│  ├─ export/
│  │  ├─ svg/
│  │  └─ png/
│  └─ shared/
│     ├─ errors/
│     ├─ utils/
│     └─ ui/
├─ tests/
│  ├─ fixtures/ecore/
│  ├─ integration/
│  └─ e2e/
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
└─ playwright.config.ts
```

Adjust exact folders to the actual repository as it evolves, but preserve responsibility boundaries.

## 2. File-size guideline

Prefer focused modules that can be understood independently.

A file growing beyond roughly 250–350 lines deserves a responsibility review; this is a signal, not an automatic rule. Split when the file contains multiple conceptual jobs, not merely to satisfy a line count.

## 3. TypeScript rules

- `strict: true`.
- Avoid `any` in domain/application code.
- `unknown` is preferred at untrusted boundaries, followed by validation/narrowing.
- Use discriminated unions for semantic variants.
- Avoid non-null assertions unless an invariant is immediately proven and documented.
- Pure transformation functions should be the default for parser/resolver/mapper logic.
- Domain IDs are strings but should be named types/helpers where confusion is likely.

## 4. React rules

- Components render; domain transformations live outside components.
- Avoid `useEffect` for computations that can be pure derived data.
- Keep React Flow adapter code separate from DiagramModel mapping.
- Subscribe to the smallest practical store slice.
- Avoid passing entire EcoreModel objects through deeply nested props.
- Accessible labels are part of component acceptance, not later polish.

## 5. Dependency rules

Core approved categories:

- React/Vite/TypeScript;
- `@xyflow/react`;
- `elkjs`;
- small state library such as Zustand if adopted;
- Vitest;
- Playwright;
- `@axe-core/playwright`;
- styling/icon dependencies selected deliberately.

A task adding a new runtime dependency must state why browser APIs/current dependencies are insufficient.

## 6. Formatting and naming

- Type/interface/component: PascalCase.
- function/variable: camelCase.
- constants: UPPER_SNAKE_CASE only for true constants/config symbols.
- files: use consistent kebab-case or repository-established convention; do not mix casually.
- semantic diagnostic codes: UPPER_SNAKE_CASE.
- tests describe behavior, not implementation details.

## 7. Pure transformation signatures

Prefer explicit boundaries such as:

```ts
parseRawEcore(xml: XMLDocument, sourceName: string): RawEcoreDocument
resolveEcore(raw: RawEcoreDocument): EcoreModel
buildDiagram(model: EcoreModel, options: DiagramOptions): DiagramModel
sizeDiagram(diagram: DiagramModel, metrics: DiagramMetrics): SizedDiagram
layoutDiagram(input: SizedDiagram, profile: LayoutProfile): Promise<LayoutModel>
serializeSvg(diagram: DiagramModel, layout: LayoutModel, options: SvgExportOptions): string
```

Exact names may evolve through implementation, but changes must remain coherent across docs/tests/tasks.

## 8. Git model

This is a personal project using one branch:

```text
main
```

No routine feature branches are required. After each completed task:

1. tests/typecheck/lint required by the task pass;
2. commit only the task's coherent changes;
3. `git pull --ff-only` before push if remote may have changed;
4. push directly to `main`.

Do not rewrite published `main` history.

## 9. Commit style

Use concise conventional-style commits:

```text
feat: parse ecore reference opposites
fix: preserve multiplicity on merged associations
test: add positional xmi reference fixtures
refactor: isolate elk layout adapter
docs: clarify ecore containment notation
```

One task may need more than one commit during development, but finish with a clean, understandable history and push after the task passes its acceptance criteria.

## 10. Documentation maintenance

When implementation intentionally changes a documented contract, update the relevant project doc in the same task.

Do not duplicate the same detailed rule across many docs unless a short summary/reference is necessary.
