# 09 — UI/UX Specification

## 1. Experience target

The application should feel like a focused modern diagram explorer: calm, fast, spatially understandable, and usable with large graphs.

Avoid IDE-style toolbar overload.

## 2. Main states

### 2.1 Empty state

Center panel:

- product name and one-line purpose;
- large drag-and-drop target;
- “Open .ecore file” button;
- privacy line: “Processed locally in your browser.”

No empty sidebars before a document is loaded.

### 2.2 Loaded workspace

```text
┌────────────────────────────────────────────────────────────────────┐
│ File / model title       Search       View/Layout      Export      │
├────────────────┬──────────────────────────────────────┬────────────┤
│ Model Explorer │                                      │ Inspector  │
│                │              Canvas                  │            │
│ packages       │                                      │ semantic   │
│ classifiers    │                                      │ details    │
│                │                                      │            │
│ diagnostics    │                                      │            │
├────────────────┴──────────────────────────────────────┴────────────┤
│ classes • references • enums • warnings • layout status           │
└────────────────────────────────────────────────────────────────────┘
```

Both sidebars are collapsible.

## 3. Top toolbar

Keep primary actions visible:

- source file name / Open another file;
- Search;
- Detail mode selector;
- Layout profile/direction;
- Auto Layout;
- Fit View;
- relation filter menu;
- Export;
- theme/settings.

Do not place raw ELK configuration in the primary toolbar.

## 4. Model Explorer

Tree hierarchy:

```text
Package
├─ Classes
│  ├─ Agent
│  ├─ Goal
│  └─ Plan
├─ Enums
└─ Datatypes
```

Behavior:

- single click selects and centers if offscreen;
- double click or explicit focus action opens neighborhood focus;
- icons and text distinguish classifier kinds;
- badges show diagnostics count;
- tree can filter to search results.

For very large lists, use virtualization if necessary.

## 5. Canvas interactions

Recommended desktop behavior:

- wheel/pinch: zoom according to React Flow interaction configuration;
- drag empty canvas: pan;
- drag node: manual position override;
- click node/edge: select;
- double click node: focus neighborhood or center/focus action;
- Fit View button: fit visible graph;
- minimap: pannable and zoomable.

Interaction settings should be tested against Figma-like expectations rather than copying Eclipse.

## 6. Zoom behavior

At very low zoom, avoid rendering tiny unreadable member text as visual noise.

Progressive zoom policy may suppress detail visually while preserving the selected detail mode:

- far zoom: node title + shape;
- normal zoom: requested mode;
- selected node: retain useful detail even when surroundings simplify.

This is a rendering optimization, not a semantic filter.

## 7. Detail-mode selector

Modes:

```text
Overview | Standard | Detailed | Ecore
```

Show a short tooltip explaining each mode. Preserve user's last mode locally.

## 8. Search

Keyboard shortcut: `Ctrl/Cmd + K`.

Search index fields:

- package name/URI;
- classifier name;
- attribute/reference/operation name;
- enum literal;
- optionally annotation documentation text at lower ranking.

Ranking preference:

1. exact classifier match;
2. classifier prefix;
3. classifier substring;
4. feature exact/prefix;
5. remaining metadata.

Result shows context:

```text
Agent                   EClass • core
beliefs                  EReference • Agent
AuctionStatus.open       EEnumLiteral • auction
```

Selecting result:

- clears incompatible focus filter only if required to reveal it;
- centers the target;
- selects/highlights it;
- opens inspector for features if appropriate.

## 9. Inspector

Inspector sections depend on selection.

### Class

- identity/path/package;
- abstract/interface;
- supertypes;
- attributes/references/operations counts;
- annotations;
- diagnostics;
- source metadata.

### EReference/association

- owner and target;
- role name;
- bounds;
- containment;
- eOpposite;
- resolveProxies;
- ordered/unique/changeable/volatile/transient/derived/unsettable;
- raw URI;
- both underlying references when merged.

### Operation

- return type/generic type;
- parameters;
- exceptions;
- type parameters;
- annotations.

Use collapsible sections for exhaustive flags.

## 10. Focus and neighborhood

Selecting a node only highlights.

“Focus” changes the visible graph:

```text
Depth 1 | Depth 2 | Depth 3 | All
```

Graph distance counts semantic relations currently enabled by filters. The UI must make active focus obvious, e.g. a removable chip:

```text
Focused: Agent • depth 2 ×
```

## 11. Filters

Relation menu:

- Inheritance
- Containment
- References
- External/unresolved
- Datatype nodes/use links where applicable

Node menu:

- Classes
- Enums
- Datatypes
- External placeholders

Never create a state with an invisible selected item without telling the user why.

## 12. Diagnostics UX

Status bar shows counts:

```text
2 warnings • 0 errors
```

Click opens diagnostic list. Selecting a diagnostic navigates to the affected semantic element when available.

Errors that prevent a valid semantic model use a dedicated load-error screen, not an empty diagram.

## 13. Keyboard shortcuts

Recommended defaults:

| Shortcut | Action |
|---|---|
| `Ctrl/Cmd+O` | Open file |
| `Ctrl/Cmd+K` | Search |
| `F` | Fit visible diagram when canvas focused |
| `1` | Overview |
| `2` | Standard |
| `3` | Detailed |
| `4` | Ecore |
| `Esc` | Clear selection / close transient overlay |
| `+` / `-` | Zoom in/out when canvas focused |

Do not hijack browser shortcuts such as refresh, tab navigation, or page zoom globally.

## 14. Responsive behavior

Primary target: desktop/laptop.

Minimum supported practical workspace width should allow center canvas use. On narrower screens:

- sidebars become overlays/drawers;
- toolbar groups collapse;
- canvas remains available;
- mobile is view-capable but not the primary optimization target for V1.

## 15. Theme

Support Light / Dark / System.

Theme variables must cover:

- canvas/background;
- nodes;
- compartments;
- text hierarchy;
- edges;
- selection;
- diagnostics;
- focus de-emphasis.

Do not hard-code semantic colors across components.

## 16. UX acceptance scenarios

A first-time user should be able to:

1. open an `.ecore` file;
2. find a named class;
3. understand whether a relation is inheritance/reference/containment;
4. inspect exact multiplicity and eOpposite;
5. focus on two-hop neighbors;
6. fit/re-layout the diagram;
7. export SVG;

without reading product documentation.
