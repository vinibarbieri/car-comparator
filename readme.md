
## Stack

- **Vite + React 18 + TypeScript**
- **Tailwind CSS + shadcn/ui**
- **Zustand** (state, persisted to localStorage)
- **TanStack Query** (FIPE API caching)
- **Recharts** (charts)
- **Vitest** (calc engine tests)

## Getting started

```bash
npm install
npm run dev

Open http://localhost:5173.

Scripts

┌────────────────────┬──────────────────────────────┐
│      Command       │         Description          │
├────────────────────┼──────────────────────────────┤
│ npm run dev        │ Start dev server             │
├────────────────────┼──────────────────────────────┤
│ npm run build      │ Production build             │
├────────────────────┼──────────────────────────────┤
│ npm run preview    │ Preview production build     │
├────────────────────┼──────────────────────────────┤
│ npm run test       │ Run unit tests (calc engine) │
├────────────────────┼──────────────────────────────┤
│ npm run test:watch │ Run tests in watch mode      │
└────────────────────┴──────────────────────────────┘

Data source

Vehicle prices are fetched live from the FIPE API (https://deividfortuna.github.io/fipe/) — no API
key required. Results are cached for 24 hours via TanStack Query and persisted to localStorage
between sessions.
```
