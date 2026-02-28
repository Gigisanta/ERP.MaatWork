# WEB APPLICATION

**Parent:** `/AGENTS.md`

## OVERVIEW

Next.js 15 (App Router) web application running on port 3000. CRM frontend for financial advisors with dashboards, contact management, portfolios, and analytics.

## STRUCTURE

```
apps/web/
├── app/                  # Next.js App Router pages
│   ├── page.tsx         # Home/dashboard
│   ├── contacts/        # Contact management pages
│   ├── portfolios/      # Portfolio templates
│   └── components/      # Page-specific components
├── lib/
│   ├── api/             # API client functions
│   ├── api-client.ts    # Centralized HTTP client
│   └── api-hooks.ts     # SWR hooks
├── types/               # Frontend-specific types
└── __tests__/           # Integration tests
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add page | `app/[route]/page.tsx` | Server Component |
| Add client interactivity | `app/[route]/*Client.tsx` | Client Island pattern |
| API call | `lib/api/[domain].ts` | Use apiClient |
| UI component | `packages/ui/src/components/` | Design system |
| Types | `types/[domain].ts` | Request/response types |

## CONVENTIONS

- **Data fetching**: Server Components → `api-server.ts`, Client → `apiClient`
- **Interactivity**: Client Islands (`"use client"`) for hooks/state
- **Client Islands pattern**: Server Component passes initial data to Client Component
- **Forms**: Client components with proper error handling

## ANTI-PATTERNS

- Direct `fetch` in components → use `apiClient`
- `window.location` → use `useRouter`
- `alert()`/`confirm()` → use Toast/Modal
- Server Components with React hooks
- Inline styles → use Design System

## NOTES

- Port: 3000
- Routing: App Router (not Pages Router)
- State: SWR for client data, Server Components for initial data
- Test: vitest, 70% coverage threshold
- Start: `pnpm dev:web`
