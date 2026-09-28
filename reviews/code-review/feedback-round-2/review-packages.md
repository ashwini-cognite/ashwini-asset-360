## Package audit: Asset 360 Investigation Workspace

Commands: `npm outdated` was not required to fail the audit; `npm audit --json` reports zero vulnerabilities. Production packages that sit on an older major do so because Aura's peer range requires them.

Health: **Pass**. No critical, high, moderate, or low advisories. No unused production packages. No deprecated packages flagged.

### Dependencies

| Package | Used version | Latest | Deprecated | CVEs | Health |
| ------- | ------------ | ------ | ---------- | ---- | ------ |
| @cognite/app-sdk | ^0.10.0 | current | no | none | Pass |
| @cognite/aura | ^0.3.5 | current | no | none | Pass |
| @cognite/sdk | ^10.10.0 | current | no | none | Pass |
| @tabler/icons-react | ^3.35.0 | current | no | none | Pass |
| @tanstack/react-query | ^5.90.10 | current | no | none | Pass |
| @tanstack/react-table | ^8.21.3 | 9.x exists | no | none | Pass — imported for DataGrid columns; Aura peers `^8.7.4` |
| @tanstack/react-virtual | ^3.14.13 | current | no | none | Pass — peer of `@cognite/aura/data-grid` |
| react | ^18.3.1 | 19.x exists | no | none | Pass — Aura peer is React 18 |
| react-dom | ^18.3.1 | 19.x exists | no | none | Pass — kept with `react` |
| recharts | ^3.10.1 | current | no | none | Pass — time series chart |

`clsx` and `tailwind-merge` were removed with the unused `src/lib/utils.ts`.

Dev toolchain `vitest`, `@vitest/coverage-v8`, and `@vitest/ui` are `^4.1.11`, which is outside GHSA-82fw-gwwq-j7x9 (`2.1.0`–`4.1.10`).

### Security audit

| Severity | Count |
| -------- | ----- |
| Critical | 0 |
| High | 0 |
| Moderate | 0 |
| Low | 0 |

#### Vulnerabilities

None.
