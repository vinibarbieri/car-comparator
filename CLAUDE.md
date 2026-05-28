# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Simulador de Garagem** (Garage Financial Simulator) is a single-page dashboard that helps users evaluate financial scenarios regarding vehicle ownership. It models the impact of keeping, selling, or replacing vehicles over 1-5 years, factoring in depreciation, taxes (IPVA), insurance, maintenance, and fuel costs.

The MVP implements Modules 1-3 (Current Garage Management, New Purchases, Calculation Engine) for a single scenario with browser-only persistence. Module 4 (multi-scenario comparison) is deferred.

## Technology Stack

- **Language & Frameworks:** TypeScript 5.5, React 18, Vite 5.4
- **Styling:** Tailwind CSS 3.4 + shadcn/ui components
- **State Management:** Zustand 4.5 (with localStorage persistence)
- **Data Fetching & Caching:** TanStack Query 5.56
- **Charting:** Recharts 2.12
- **Testing:** Vitest 2.1 (unit tests only; UI is manually tested)
- **UI Icons:** Lucide React 0.447

## Build & Development Commands

```bash
yarn                     # Install dependencies
yarn dev                 # Start Vite dev server (http://localhost:5173)
yarn build               # Production build (TypeScript + Vite)
yarn preview             # Preview production build locally
yarn test                # Run unit tests (calc engine tests only)
yarn test:watch          # Watch mode for tests
```

## Project Structure

```
src/
  main.tsx                      # React entry point; QueryClient setup (24h staleTime for FIPE)
  App.tsx                       # Main layout: garage section, purchases section
  index.css                     # Tailwind directives + CSS variables
  
  store/
    scenarioStore.ts           # Zustand store with localStorage persistence
    types.ts                   # Core data types: OwnedVehicle, NewPurchase, Scenario
  
  components/
    ui/                        # shadcn primitives (12 components)
    garage/
      CurrentVehicleCard.tsx   # Card for owned vehicle: keep/sell toggle, cost inputs
      AddVehicleDialog.tsx     # Dialog: cascading FIPE dropdowns + cost defaults
    purchases/
      NewPurchaseCard.tsx      # Card for new purchase: condition, cost, and fuel inputs
      AddPurchaseDialog.tsx    # Dialog: cascading FIPE dropdowns + acquisition cost
  
  lib/
    fipe/
      client.ts                # Typed API wrapper for FIPE (4 functions: getMakes, getModels, getYears, getVehicle)
      types.ts                 # FIPE API response types
    utils.ts                   # Helpers: formatCurrency, parseFipeValue, cn()

Vite & TypeScript configs:
  vite.config.ts               # Vitest jsdom env, @ alias
  tsconfig.json, tsconfig.app.json, tsconfig.node.json
  tailwind.config.js
  components.json              # shadcn/ui config (path aliases, CSS variables)
  postcss.config.js
```

## Architecture & Data Flow

### State Management (Zustand)

The single source of truth is `useScenarioStore()` (persisted to localStorage as `garage-scenario`):

- **OwnedVehicles:** Each vehicle has a `decision` (keep/sell), optional sale price or discount, and annual costs (insurance, maintenance, fuel).
- **NewPurchases:** Each purchase has condition (new/used), acquisition cost, and annual costs.
- **Global Config:** `timelineYears` (1-5) and `ipvaRatePct` (default 2% for Brazil's Santa Catarina).

The store provides actions to add, update, or remove vehicles/purchases and reset the entire scenario.

### FIPE API Integration

The FIPE API (`parallelum.com.br/fipe/api/v1/carros`) provides live vehicle pricing in Brazil. TanStack Query caches responses with a 24-hour staleTime (FIPE updates monthly).

**Data flow:**
1. User opens AddVehicleDialog or AddPurchaseDialog.
2. Cascading selects fetch Makes → Models → Years.
3. On year selection, getVehicle() returns pricing and fuel type.
4. Fuel type triggers auto-fill of consumption defaults (gasoline 12 km/L, ethanol 10, diesel 10).
5. User confirms; vehicle is added to store.

### Component Patterns

- **Cards** (CurrentVehicleCard, NewPurchaseCard): Display vehicle, toggle decisions, edit inline.
- **Dialogs** (AddVehicleDialog, AddPurchaseDialog): Multi-step FIPE selection + cost inputs.
- **No Charts Yet:** The plan includes net-worth line chart and TCO breakdown bar chart, but they are not implemented in this MVP.

## Key Implementation Details

### Type System (`store/types.ts`)

```typescript
type FuelType = 'gasoline' | 'ethanol' | 'diesel' | 'flex' | 'electric' | 'hybrid'

type FipeRef = {
  makeId: string
  makeName: string
  modelId: number
  modelName: string
  yearId: string
  yearName: string
  currentValue: number        // in R$
  fuelType: FuelType
  fipeCode: string           // CodigoFipe from API
}

type OwnedVehicle = {
  id: string
  fipe: FipeRef
  decision: 'keep' | 'sell'
  salePrice?: number         // manual price or...
  discountPct?: number       // ...discount on FIPE value
  annualInsurance: number
  annualMaintenance: number
  annualKm: number
  fuelPricePerLiter: number  // or R$/kWh for electric
  kmPerLiter: number         // or kWh/100km for electric
}

type NewPurchase = {
  id: string
  fipe: FipeRef
  condition: 'new' | 'used'
  acquisitionCost: number    // negotiated purchase price
  annualInsurance: number
  annualMaintenance: number
  annualKm: number
  fuelPricePerLiter: number
  kmPerLiter: number
}

type Scenario = {
  ownedVehicles: OwnedVehicle[]
  newPurchases: NewPurchase[]
  timelineYears: 1 | 2 | 3 | 4 | 5
  ipvaRatePct: number        // default 2
}
```

### Fuel Type Detection

The FIPE API returns a `SiglaCombustivel` field:
- `G` → Gasoline (defaults: 6.0 R$/L, 12 km/L)
- `A` → Ethanol (defaults: 5.0 R$/L, 10 km/L)
- `D` → Diesel (defaults: 6.5 R$/L, 10 km/L)
- `E` → Electric (special handling for kWh/100km and R$/kWh)

UI adapts labels dynamically (e.g., "Consumo (km / L)" vs "Consumo (kWh / 100km)").

### Utilities

- `formatCurrency(value: number)` → `"R$ 1.234,56"` (pt-BR locale)
- `parseFipeValue(valor: string)` → Converts FIPE's `"R$ 280.064,00"` to `280064.00`
- `cn(...inputs)` → Combines clsx + tailwind-merge (standard shadcn pattern)

### Styling

- **CSS Variables (Tailwind):** Colors (primary, muted, destructive, etc.) are defined as CSS custom properties in `index.css` and consumed via `hsl(var(...))` in `tailwind.config.js`.
- **Dark Mode:** Configured but not actively used in current UI.
- **Max-width Container:** 4xl for main content (consistent across header and main).

## Future Work (Out of Scope for MVP)

As per `plan.md`:

- Module 4: Multi-scenario comparison (saved scenarios, side-by-side charts)
- Calculation Engine (`src/lib/calc/`): Pure functions for depreciation lookup, IPVA, fuel costs, and full scenario projection
- Charts: Recharts net-worth line chart and TCO stacked bar chart
- Auth, cloud sync, financing/loan modeling, inflation adjustment

When implementing the calc engine, structure it as:
- `depreciation.ts` → Cross-year FIPE lookup (e.g., 2025 model value 3 years from now ≈ today's 2022 price)
- `ipva.ts` → Annual tax calculation (rate × projected market value)
- `fuel.ts` → Annual fuel cost (km/year ÷ km/L × price/L)
- `scenario.ts` → Top-level function merging all calculations for a scenario

Unit test these functions thoroughly; chart bugs are cheap, calc bugs erode trust.

## Development Workflow

1. **Adding a Vehicle:** Implement in AddVehicleDialog (FIPE cascading selects + cost inputs) → store via `addOwnedVehicle()`.
2. **Editing Fields:** Use CurrentVehicleCard and NewPurchaseCard inline inputs → `updateOwnedVehicle()` or `updateNewPurchase()`.
3. **Testing:** Run `npm run test:watch` for calc engine. UI changes require manual browser testing (open http://localhost:5173 after `npm run dev`).
4. **Building:** `npm run build` runs `tsc -b && vite build`. Check for TypeScript errors and final bundle size.

## Common Issues

- **FIPE API timeouts:** The API is public and rate-limited loosely. If requests fail, check network; TanStack Query retries twice by default.
- **localStorage Persistence:** Zustand's persist middleware syncs to `garage-scenario` key automatically. Reload to verify.
- **Fuel Type Auto-fill:** Only triggered on vehicle select completion (when `vehicle?.SiglaCombustivel` changes). Manual edits after selection persist in inputs.

## Entry Points for New Features

- **Scenario Comparison UI:** Add a new route or modal, fetch multiple scenarios from localStorage by name, render side-by-side.
- **Charts:** Add `src/components/dashboard/` with Recharts components consuming store data.
- **IPVA Timeline:** Implement `src/lib/calc/scenario.ts` to compute year-by-year costs and equity; pass to charts.
