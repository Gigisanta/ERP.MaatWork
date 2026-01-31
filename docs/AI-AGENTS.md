# AI Agent Guide: Repository Maintenance & Auditing

This guide is specifically designed for AI Coding Agents to understand how to maintain codebase consistency and cleanliness efficiently.

## 1. Automated Auditing Engine

We use a unified audit system that is cross-platform and extremely fast.

### Core Commands

- `pnpm audit:code`: Full scan (Dead code, Orphan deps, `any` types, Barrel exports).
- `pnpm audit:fix`: Automatic fix for Knip-detected issues.
- `pnpm audit:types`: Fast scan for technical debt (`any` types).
- `pnpm audit:barrels`: Scan for performance-killing barrel exports (`export *`).

## 2. Coding Rules for Agents

### Rule 1: No Dead Code

Always run `pnpm audit:code` before finalizing a task. If you introduce a new export, ensure it is used. If you remove usage, remove the export.

### Rule 2: Clean Dependencies

Do not add dependencies to `package.json` without verifying they are needed. Use `pnpm audit:code` to find orphaned dependencies after refactoring.

### Rule 3: Technical Debt (`any`)

The system tracks the number of `any` types. Adding new `any` types will lower the **Cleanliness Score**. Always prefer specific interfaces or `unknown` with type guards.

### Rule 4: Barrel Exports

Avoid `export * from './module'`. This creates hidden dependencies and hurts build performance. Use named exports.

### Rule 5: Logging

Do not use `console.log` or `console.error`. Use the structured `logger` provided by `@maatwork/logger` (or request context `req.log`). See `docs/CODING_STANDARDS.md` for details.

## 3. Pre-commit Workflow

The pre-commit hook runs an optimized version of Knip. If your changes are flagged, the commit will show warnings. Fix them immediately to maintain repo hygiene.

## 4. Documentation of Decisions

Always use the `AI_DECISION` pattern when making architectural changes or implementing complex logic:

```typescript
// AI_DECISION: [Summary of change]
// Justificación: [Reasoning for the change]
// Impacto: [Affected areas]
```

## 5. Environment Readiness

The system is built to be cross-platform (Windows/macOS/Linux). All maintenance scripts are Node.js-based (`tsx`) to avoid shell dependencies like `grep` or `wc`.
