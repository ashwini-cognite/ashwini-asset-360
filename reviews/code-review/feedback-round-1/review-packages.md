## Package audit: Asset 360 Investigation Workspace

Commands: `npm outdated --json`, `npm audit --json`. Spot-check of `deprecated` was not required; no flagged package is an unfamiliar name beyond the unused table packages.

Health: **Warn**. No high or critical CVEs. Two production dependencies are unused, and one of those is one major behind. Four moderate findings are all the Vitest dev toolchain (one advisory).

### Dependencies

| Package | Used version | Latest | Deprecated | CVEs | Health |
| ------- | ------------ | ------ | ---------- | ---- | ------ |
| @cognite/app-sdk | 0.10.0 | current | no | none | Pass |
| @cognite/aura | 0.3.5 | current | no | none | Pass |
| @cognite/sdk | ^10.10.0 | current | no | none | Pass |
| @tabler/icons-react | ^3.35.0 | current | no | none | Pass |
| @tanstack/react-query | ^5.90.10 | current | no | none | Pass |
| @tanstack/react-table | 8.21.3 | 9.2.4 | no | none | Warn — unused in `src/`, one major behind |
| @tanstack/react-virtual | 3.14.13 | current | no | none | Warn — unused in `src/` |
| clsx | ^2.1.1 | current | no | none | Warn — only imported by unused `src/lib/utils.ts` |
| react | 18.3.1 | 19.3.0 | no | none | Pass — Aura peer is React 18 |
| react-dom | 18.3.1 | 19.3.0 | no | none | Pass — keep aligned with `react` |
| recharts | ^3.10.1 | current | no | none | Pass — used by the time series chart |
| tailwind-merge | ^3.4.0 | current | no | none | Warn — only imported by unused `src/lib/utils.ts` |

Dev dependencies one major behind (not production): `@eslint/js`, `eslint`, `typescript`, `vite`, `vitest`, `@vitest/coverage-v8`, `@vitest/ui`, `@vitejs/plugin-react`, `@types/react`, `@types/react-dom`, `@testing-library/jest-dom`.

### Security audit

| Severity | Count |
| -------- | ----- |
| Critical | 0 |
| High | 0 |
| Moderate | 4 |
| Low | 0 |

The four moderate rows are `vitest`, `@vitest/mocker`, `@vitest/ui`, and `@vitest/coverage-v8` for a single advisory.

#### Vulnerabilities

| Package | Severity | Title | Patched in | Advisory |
| ------- | -------- | ----- | ---------- | -------- |
| vitest / @vitest/mocker | Moderate | Path traversal / arbitrary file read via redirect mock | newer than 4.1.10 (devDependency range `2.1.0 - 4.1.10`) | https://github.com/advisories/GHSA-82fw-gwwq-j7x9 |
