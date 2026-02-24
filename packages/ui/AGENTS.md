# UI PACKAGE

**Parent:** `/packages/AGENTS.md`

## OVERVIEW

React 19 Design System with 40+ reusable components. Provides consistent UI across the application.

## STRUCTURE

```
packages/ui/
├── src/
│   ├── index.ts           # Exports
│   ├── components/       # UI components
│   │   ├── feedback/     # Toast, Modal, Skeleton
│   │   ├── nav/          # Nav, Sidebar, Header
│   │   ├── forms/        # Input, Select, Button
│   │   └── ...
│   ├── primitives/       # Base primitives
│   └── utils/            # Helpers
├── stories/              # Storybook stories
└── package.json
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Find component | `src/components/[category]/` | Organized by type |
| Add component | `src/components/[new]/` | Follow existing structure |
| Types | `src/index.ts` | Exported types |

## CONVENTIONS

- **Components**: Functional, TypeScript, strict types
- **Props**: Avoid `any`, use explicit interfaces
- **Styling**: Tailwind CSS tokens from `@maatwork/tokens`

## COMMANDS

```bash
pnpm -F @maatwork/ui build    # Build package
pnpm -F @maatwork/ui storybook # Run Storybook
```

## ANTI-PATTERNS

- Using inline styles → use Design System
- Using `any` for props → define explicit types
- Creating duplicate components → check existing first

## NOTES

- Requires build after changes: `pnpm -F @maatwork/ui build`
- 85% test coverage threshold
- Storybook available for visual testing
