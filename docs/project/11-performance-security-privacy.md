# 11 — Performance, Security, and Privacy

## 1. Performance philosophy

The viewer should stay responsive even when automatic layout is expensive. Parsing and graph transformation should be predictable; layout work should be isolated from interactive UI work.

## 2. Initial performance budgets

These are product engineering targets, measured on a modern desktop browser in production mode with representative fixtures.

### Small model

Approximately ≤ 25 classifier nodes / ≤ 60 relations:

- parse + semantic resolution: target < 100 ms;
- diagram mapping/sizing: target < 50 ms;
- initial layout: target < 500 ms where practical;
- interaction after layout: visually immediate.

### Medium model

Approximately ≤ 100 classifier nodes / ≤ 250 relations:

- parse + resolution: target < 300 ms;
- mapping/sizing: target < 150 ms;
- layout: target < 3 s;
- main thread remains interactive during layout.

### Large model

Above the medium range:

- correctness remains mandatory;
- show non-blocking layout progress/state;
- allow filters/search while layout work is pending when architecture permits;
- consider progressive detail reduction/virtualization only after profiling.

Do not distort semantics to hit a performance target.

## 3. Profiling points

Instrument development builds around:

```text
file read
XML parse
raw extraction
symbol-table construction
reference resolution
semantic validation
diagram mapping
node sizing
ELK layout
React render commit
export
```

Performance logs should be opt-in/development-only, not noisy production console output.

## 4. Web Worker policy

ELK layout runs in a Web Worker for non-trivial graphs. The worker receives serializable graph data only.

Do not transfer:

- DOM nodes;
- React state objects;
- File objects unnecessarily;
- functions/classes requiring prototype reconstruction.

Use stale-request cancellation by request ID.

## 5. Rendering performance

Guidelines:

- memoize custom nodes/edges where appropriate;
- avoid global store subscriptions that rerender every node for unrelated state;
- derive per-node selection/focus flags efficiently;
- avoid recomputing semantic mapping on viewport pan/zoom;
- do not trigger auto-layout on selection or inspector toggles;
- apply zoom-based visual simplification only as a renderer concern.

## 6. File size guard

V1 should use a configurable conservative maximum input size. Recommended initial value: **10 MiB** for normal interactive opening, with a clear error explaining the limit.

The value may be raised later based on measured memory/layout behavior.

The security check belongs in one configuration module, not scattered through UI components.

## 7. XML safety

Treat `.ecore` as untrusted XML.

V1 rules:

- reject `<!DOCTYPE` input;
- no external entity expansion;
- no remote resource fetch during parse/resolution;
- do not inject raw XML into `innerHTML`;
- render names/documentation through normal escaped React text;
- sanitize any future rich annotation rendering explicitly.

## 8. URI safety

An external Ecore URI is data, not a navigation instruction.

- display it as text;
- do not automatically fetch it;
- do not automatically open it;
- if a later feature makes URLs clickable, use explicit safe-link handling and user action.

## 9. Export safety

SVG generation must escape all user-controlled text/attributes. Never concatenate raw model strings into executable SVG/HTML without escaping.

Do not embed scripts, event attributes, remote images, or external resources in exported SVG.

## 10. Privacy contract

Default product behavior:

```text
source file stays in browser memory
no model upload
no account required
no backend required
no source content persisted by default
```

Local storage may contain only viewer preferences unless a future explicit feature changes this contract.

## 11. Telemetry

V1 should not require telemetry.

If analytics are added later:

- never send source model content, classifier names, annotations, URIs, or file names without explicit user consent and a strong justification;
- prefer coarse product events such as “export used” over model-specific payloads;
- document exactly what is collected.

## 12. Dependency security

Keep dependencies focused. Before adding a package:

- confirm existing platform/library capabilities cannot reasonably solve the task;
- inspect maintenance/license footprint;
- avoid packages whose main purpose duplicates a tiny local utility;
- lock dependency versions through the package manager lockfile;
- keep security updates compatible with tests.
