# Ecore Visualizer — Project Documentation

## Purpose

This directory is the source of truth for **Ecore Visualizer**, a browser-based tool whose single primary job is:

> Open an `.ecore` file and make the metamodel easier to understand, inspect, navigate, and export than in a general-purpose IDE.

The product is an **Ecore-aware visual explorer**, not an Ecore editor and not a web clone of Eclipse.

## Documentation map

| File | Read when you need to understand |
|---|---|
| `01-vision-and-scope.md` | Product vision, users, non-goals, principles |
| `02-product-requirements.md` | Functional requirements and acceptance criteria |
| `03-ecore-semantic-spec.md` | Ecore concepts the parser/viewer must represent correctly |
| `04-internal-data-model.md` | Canonical TypeScript domain models and boundaries |
| `05-system-architecture.md` | End-to-end architecture and data flow |
| `06-parser-and-resolution.md` | XML/XMI parsing, URI resolution, diagnostics |
| `07-diagram-notation.md` | Exact mapping from Ecore semantics to visual UML/Ecore notation |
| `08-layout-strategy.md` | ELK layout, ports, routing, deterministic geometry |
| `09-ui-ux-spec.md` | Screen structure, interactions, navigation, detail levels |
| `10-testing-and-quality.md` | Test pyramid, fixture corpus, regression strategy |
| `11-performance-security-privacy.md` | Performance budgets, workers, file safety, local-only privacy |
| `12-export-and-persistence.md` | SVG/PNG export and local preference persistence |
| `13-repository-and-engineering.md` | Suggested repository structure and coding rules |
| `14-roadmap-and-release-criteria.md` | Release boundaries and Definition of Done |
| `15-glossary.md` | Shared vocabulary |

AI agents should **not read every file for every task**. Read `docs/agent/agent.md`, the active task in `docs/agent/task.md`, the project docs explicitly referenced by that task, and only the source files needed to make the change.

## Core technical choices

- React + TypeScript + Vite.
- `@xyflow/react` for the interactive canvas and viewport controls.
- `elkjs` for automatic graph layout; use a Web Worker for non-trivial layouts.
- Browser XML parsing followed by a custom Ecore semantic parser/resolver.
- Vitest for unit/integration tests.
- Playwright for end-to-end, accessibility, and visual-regression checks.
- Client-side only for the first product release; `.ecore` files are not uploaded to a server.

## Canonical pipeline

```text
.ecore bytes
   ↓
XML/XMI document
   ↓
Raw Ecore AST
   ↓
Resolved Ecore semantic model
   ↓
Diagram model
   ↓
Layout model
   ↓
Interactive renderer / vector exporter
```

Each boundary is intentional. UI components must never become the parser, and parser code must never know about React Flow.

## Official reference material

- Eclipse EcoreTools: https://eclipse.dev/ecoretools/doc/
- Eclipse/EMF Ecore concepts: https://help.eclipse.org/latest/topic/org.eclipse.xtext.doc/contents/308_emf_integration.html
- React Flow: https://reactflow.dev/
- elkjs: https://github.com/kieler/elkjs
- Playwright: https://playwright.dev/
- Vitest: https://vitest.dev/
