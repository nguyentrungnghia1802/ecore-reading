# 10 — Testing and Quality Strategy

## 1. Quality order

Prioritize:

1. semantic correctness;
2. deterministic transformation;
3. layout endpoint correctness;
4. interaction reliability;
5. visual polish;
6. micro-optimizations.

## 2. Test pyramid

```text
          Playwright E2E / visual / a11y
                    ▲
             integration tests
                    ▲
        parser/resolver/mapper/layout unit tests
```

Most semantic bugs should be caught below the UI layer.

## 3. Unit tests — parser

Test raw extraction and default handling independently.

Examples:

- absent `upperBound` becomes raw absence then semantic `1`;
- `upperBound="-1"` normalizes to `unbounded`;
- namespace prefix variations still locate Ecore elements;
- `xsi:type=ecore:EReference` is not treated as EAttribute;
- malformed boolean/integer emits diagnostic instead of NaN propagation.

## 4. Unit tests — URI resolver

Table-driven cases must include:

```text
#//Agent
#//Agent/beliefs
#/0/Member
#/0/Member/familyFather
http://www.eclipse.org/emf/2002/Ecore#//EString
external.ecore#//Remote
```

Assert exact resolution kind and semantic ID.

## 5. Unit tests — semantic validation

Cover:

- multiple inheritance;
- inheritance cycle;
- invalid bounds;
- valid eOpposite pair;
- asymmetric opposite declaration;
- incompatible opposite;
- containment + inverse container;
- duplicate malformed names;
- unresolved local/external targets.

## 6. Unit tests — diagram mapper

Use small EcoreModel objects directly; parser is not required for every mapper test.

Assert:

- generalization direction;
- composition diamond/source end metadata;
- opposite pair becomes one association;
- non-opposite parallel references remain distinct;
- multiplicity ends are correct;
- semantic IDs are retained;
- overview/standard/detailed/Ecore rows differ as specified.

## 7. Unit tests — node sizing

Node sizing must be deterministic.

Test:

- empty class;
- class with long name;
- class with N attributes/operations;
- enum with literals;
- each detail mode;
- maximum width/truncation contract.

## 8. Layout adapter tests

Do not snapshot every coordinate from ELK as the only assertion.

Assert invariants:

- every input node appears once;
- every relation appears once;
- all coordinates finite;
- all sizes positive;
- endpoint IDs preserved;
- routes finite;
- same input/profile produces stable normalized output within the supported deterministic contract.

Use a few golden layout snapshots for regression, not as a substitute for semantic checks.

## 9. Fixture corpus

Repository structure:

```text
tests/fixtures/ecore/
├─ minimal.ecore
├─ all-features.ecore
├─ inheritance-multiple.ecore
├─ opposite-valid.ecore
├─ opposite-invalid.ecore
├─ containment.ecore
├─ self-reference.ecore
├─ generics.ecore
├─ nested-packages.ecore
├─ xmi-wrapper.ecore
├─ external-reference.ecore
├─ malformed.xml
└─ real-world/
```

Every fixture needs a short README/manifest entry explaining which behavior it protects.

Prefer small fixtures for unit tests and a smaller number of real-world files for integration tests.

## 10. Integration tests

Pipeline test:

```text
fixture text
→ parse
→ resolve
→ map
→ size
→ layout
→ verify semantic/layout invariants
```

This catches boundary mismatches between independently correct modules.

## 11. Playwright E2E

Critical workflows:

1. load a fixture via test file input;
2. diagram appears;
3. search `Agent`;
4. select result and verify inspector;
5. change detail mode;
6. toggle relation filter;
7. focus depth 2;
8. Fit View;
9. export SVG/PNG;
10. open a malformed file and recover by opening a valid one.

## 12. Visual regression

Maintain screenshots for representative diagrams at fixed viewport/font/environment.

Protect:

- node compartment layout;
- arrowheads/diamonds;
- labels/multiplicities;
- dark/light theme;
- focus/highlight state;
- inspector layout;
- dense graph routing.

Visual snapshots should be reviewed deliberately when changed; never update snapshots merely to make CI green.

## 13. Accessibility testing

Use Playwright with `@axe-core/playwright` for automated checks plus manual keyboard testing.

Automated checks should include:

- labeled icon controls;
- contrast failures detectable by axe;
- invalid ARIA;
- duplicated IDs.

Manual checks:

- toolbar fully keyboard reachable;
- search usable without mouse;
- focus visible;
- inspector close/reopen flow;
- relation meaning understandable without color.

## 14. Type and lint gates

Every task must pass:

```text
TypeScript typecheck
ESLint
unit/integration tests relevant to task
```

Before push for a task that affects user flows, also run the relevant Playwright project.

## 15. Regression rule

When a bug is fixed:

1. add a failing test/fixture reproducing it;
2. confirm failure;
3. implement fix;
4. confirm pass;
5. keep test permanently unless the feature is intentionally removed.

## 16. No test weakening

Do not:

- delete a failing test without explaining a changed requirement;
- increase broad screenshot thresholds to hide visual changes;
- replace exact semantic assertions with `toBeTruthy()`;
- mock the parser in an end-to-end pipeline test;
- skip difficult real-world fixtures merely because they expose a bug.
