# Ops Hub

A Docusaurus-powered operations hub that aggregates documentation, traceability manifests, and test results from multiple service repositories into a single static site.

## Overview

Ops Hub provides a **unified feature matrix** — a filterable, searchable view of every feature across all registered services, enriched with:

- 📄 Links to service documentation
- ✅ Live test pass/fail status from CI artifacts
- 🔗 Traceability from feature → implementation files → test cases
- 📊 Observability dashboard links (Grafana, Kibana)

The site is rebuilt nightly via GitHub Actions and published to GitHub Pages.

## Getting Started

### Prerequisites

- Node.js ≥ 20
- A GitHub App installation token (or PAT) with read access to all service repos

### Local Development

```bash
# 1. Install dependencies
npm install

# 2. Copy env file and set GITHUB_TOKEN
cp .env.example .env

# 3. Aggregate content from service repos
npm run aggregate

# 4. Fetch test results
npm run fetch-results

# 5. Generate Docusaurus plugin config
npm run gen-config

# 6. Start local dev server
npm start
```

### Full Build

```bash
npm run build
```

## Registering a Service

### Automatic (recommended)

In the service repository, trigger the `Register with Ops Hub` workflow (`register-with-hub.yml`). This opens a PR to `registry.yml` automatically.

### Manual

Add an entry to `registry.yml`:

```yaml
services:
  - id: my-service
    label: My Service
    repo: OWNER/my-service
    branch: main
    docs_path: docs/
    manifest_path: ops-hub/features.yml
    gha_workflow: ci.yml
    manifest_coverage:
      warn_threshold: 60
      fail_threshold: null
    observability:
      grafana_base: "https://grafana.example.com/d/"
      kibana_base: "https://kibana.example.com/app/discover#/?_a=(query:(match_phrase:(service:'my-service')))"
```

### Service Templates

Copy the files from `templates/service/` into your service repository:

| File | Purpose |
|------|---------|
| `.pre-commit-config.yaml` | Installs the manifest coverage pre-commit hook |
| `ops-hub/features.yml` | Feature manifest — lists features, implementation files, and test cases |
| `.github/workflows/register-with-hub.yml` | Workflow to register with the hub |
| `.github/workflows/manifest-check.yml` | CI check for manifest coverage on PRs |

## Repository Layout

```
ops-hub/
├── .env.example
├── .gitignore
├── .pre-commit-hooks.yaml
├── package.json
├── tsconfig.json
├── registry.yml                 ← list of registered services
├── docusaurus.config.ts
├── babel.config.js
│
├── scripts/
│   ├── aggregate.js             ← download docs + manifests via GH API
│   ├── fetch-test-results.js    ← download JUnit XML artifacts via GHA API
│   ├── generate-docusaurus-config.js
│   ├── onboard.js               ← opens PR to registry.yml
│   └── hooks/
│       └── check-manifest.js    ← pre-commit advisory hook
│
├── src/
│   ├── pages/index.tsx          ← unified feature matrix home page
│   ├── components/
│   │   ├── FeatureMatrix.tsx
│   │   ├── FeatureMatrix.module.css
│   │   ├── TraceabilityPanel.tsx
│   │   └── TestBadge.tsx
│   └── css/custom.css
│
├── templates/
│   └── service/                 ← files for service repos
│
├── content/                     ← gitignored; assembled at CI time
└── generated/                   ← gitignored; emitted pre-build
```

## CI/CD

The nightly workflow (`.github/workflows/nightly.yml`) runs at 02:00 UTC and:

1. Aggregates docs and feature manifests from all registered service repos
2. Fetches test result artifacts from the latest successful CI run of each service
3. Generates the Docusaurus plugin config
4. Builds the static site
5. Deploys to GitHub Pages

You can also trigger it manually via `workflow_dispatch`.

## Authentication

| Secret | Used for |
|--------|---------|
| `GITHUB_TOKEN` | Hub CI reading service repos (GitHub App installation token) |
| `HUB_REGISTRATION_TOKEN` | Service repos writing to hub `registry.yml` (fine-grained PAT, `contents: write`) |

## Implementation Notes

- **Docusaurus 3.x** with TypeScript config and the classic preset
- Scripts use **Node.js 20 ESM** (`"type": "module"`)
- GitHub API calls use **`@octokit/rest`** — no `git clone` required in CI
- YAML parsing uses **`js-yaml`**, XML parsing uses **`fast-xml-parser`**
- Docusaurus plugins are **multi-instance `@docusaurus/plugin-content-docs`**, one per service, generated from `registry.yml`
- The pre-commit hook uses the **`pre-commit` framework** — hook defined here, referenced by service repos
- `babel.config.js` uses `@babel/preset-env` + `@babel/preset-react` + `@babel/preset-typescript` (required by Docusaurus for Jest; Docusaurus installs these transitively)