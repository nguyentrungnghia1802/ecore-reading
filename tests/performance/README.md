# Phase 1 performance baseline

Recorded on 2026-09-12 with:

- Windows 11 Home 10.0.26200
- Intel Core i5-12500H, 16 logical processors
- 15.7 GB RAM
- Node.js 22.19.0 and npm 10.9.3
- `npm run test:performance`
- three complete pipeline runs per case; values below are medians in milliseconds

| Case | Nodes | Relations | Parse | Resolve | Map | Size | ELK layout | SVG export | Total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| realistic-small | 5 | 1 | 1.71 | 0.47 | 0.11 | 0.09 | 21.56 | 0.60 | 24.51 |
| stress-50 | 50 | 149 | 12.34 | 1.52 | 0.38 | 0.09 | 142.26 | 2.54 | 158.97 |
| stress-120 | 120 | 359 | 33.26 | 7.25 | 1.97 | 0.21 | 1056.70 | 11.44 | 1111.17 |

These are development observations, not CI assertions. Wall-clock thresholds remain non-gating because host load, runtime warm-up, and platform affect results. Correctness assertions remain in the ordinary integration suite. The application path keeps ELK isolated behind the serializable worker protocol and stale-request coordinator established in P1-09.
