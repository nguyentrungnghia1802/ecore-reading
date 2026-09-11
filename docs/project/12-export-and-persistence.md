# 12 — Export and Persistence

## 1. Export principles

Export is a first-class read/exploration outcome. A research user should be able to place a clean diagram into a thesis or paper without taking screenshots manually.

## 2. SVG export — canonical vector path

SVG should be generated from `DiagramModel + LayoutModel`, not from a browser screenshot.

Recommended architecture:

```text
LayoutModel
   ↓
project-owned SVG serializer
   ↓
<svg> with shapes/text/paths/markers
```

Benefits:

- true vector geometry;
- deterministic output;
- controlled fonts/spacing;
- clean arrowheads and composition diamonds;
- no dependency on browser `foreignObject` support;
- export can share semantic route geometry with the canvas.

## 3. SVG requirements

- valid standalone SVG;
- explicit viewBox covering the exported graph plus padding;
- no scripts;
- no remote resources;
- escaped user text;
- reusable marker definitions for generalization/reference arrowheads;
- filled diamond geometry for composition;
- visible relation role labels and multiplicities according to active detail/filter state;
- background option: transparent/light/dark;
- export “whole visible graph” as the default behavior.

## 4. SVG text strategy

Prefer actual SVG `<text>` rather than converting every label to paths. This keeps files searchable/editable.

Use a documented font stack of common system fonts; do not bundle proprietary font files.

Long text follows the same truncation/wrapping contract used by deterministic node sizing.

## 5. PNG export

PNG is a convenience format for slides/chat/documents.

Requirements:

- default scale at least 2× CSS pixel density for readable labels;
- option for transparent/background color consistent with theme;
- export whole visible graph rather than only current viewport unless user explicitly selects viewport export;
- no clipping of labels/markers.

PNG implementation may rasterize the project-owned SVG output, keeping one semantic export path.

## 6. Export filename

Recommended:

```text
<source-base-name>-ecore-diagram.svg
<source-base-name>-ecore-diagram.png
```

Sanitize the local download filename. Do not mutate the source file.

## 7. Export current semantic view

Export reflects:

- current detail mode;
- current node/relation filters;
- current focus neighborhood;
- current layout/manual positions if supported by export adapter;
- current node expansion state if that feature exists.

The export dialog should state what will be included.

## 8. Metadata

Optional SVG metadata may include:

- tool name/version;
- source file base name;
- generation timestamp;
- layout profile.

Do not embed the full source model or absolute local file path.

## 9. Preference persistence

Use browser local storage for small preferences only.

Suggested versioned key:

```text
ecore-visualizer.preferences.v1
```

Persist:

- theme: `system | light | dark`;
- detail mode;
- default layout profile/direction;
- relation visibility defaults;
- minimap visibility;
- sidebar default collapsed state if useful.

Do not persist:

- uploaded file text;
- model names/classifier lists extracted from source;
- search history containing model identifiers;
- raw annotations.

## 10. Preference schema migration

Parse local storage defensively.

```ts
interface PreferencesV1 {
  version: 1;
  theme: 'system' | 'light' | 'dark';
  detailMode: 'overview' | 'standard' | 'detailed' | 'ecore';
  layoutProfile: string;
  minimapVisible: boolean;
  relationVisibility: Record<string, boolean>;
}
```

Invalid/old preference values fall back to safe defaults instead of preventing app startup.
