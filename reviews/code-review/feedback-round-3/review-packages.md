## Package audit: Asset 360 Investigation Workspace

`npm outdated --json` and `npm audit --json` were run from the app root. Packages absent from `npm outdated` are current.

### Dependencies

| Package | Used version | Latest | Deprecated | CVEs | Health |
| ------- | ------------ | ------ | ---------- | ---- | ------ |
| @cognite/app-sdk | 0.10.0 | current | no | none | Pass |
| @cognite/aura | 0.3.5 | current | no | none | Pass |
| @cognite/sdk | 10.14.0 | current | no | none | Pass |
| @tabler/icons-react | 3.48.0 | current | no | none | Pass |
| @tanstack/react-query | 5.103.2 | current | no | none | Pass |
| @tanstack/react-table | 8.21.3 | 9.2.4 | no | none | Pass |
| @tanstack/react-virtual | 3.14.13 | current | no | none | Pass |
| react | 18.3.1 | 19.3.0 | no | none | Pass |
| react-dom | 18.3.1 | 19.3.0 | no | none | Pass |
| recharts | 3.10.1 | current | no | none | Pass |

React 18 and `@tanstack/react-table` 8 are one major behind the registry latest. Aura 0.3.5 peers are React `^18.3.1` and `@tanstack/react-table` `^8.7.4`. Those majors are not an available upgrade for this app. Dev tooling majors (Vitest 5, Vite 8, ESLint 10, TypeScript 7) are the same kind of optional jump and are not production dependencies.

### Security audit

| Severity | Count |
| -------- | ----- |
| Critical | 0 |
| High | 0 |
| Moderate | 0 |
| Low | 0 |

#### Vulnerabilities

| Package | Severity | Title | Patched in | Advisory |
| ------- | -------- | ----- | ---------- | -------- |
| — | — | none | — | — |
