# Garage Financial Simulator — MVP Plan

## Context

A family needs to decide whether to keep, sell, or replace their current vehicles (Mercedes C200 2025, Volvo XC40 2020). The BRD in `brd.md` describes a single-page dashboard that models the financial impact of those decisions over 1–5 years, combining sale proceeds, depreciation, IPVA, insurance, maintenance, and fuel.

This MVP delivers **Modules 1–3 (Current Garage, New Purchases, Calculation Engine) for a single scenario**. Module 4 (multi-scenario comparison) is intentionally deferred — single-scenario must feel solid first. localStorage persistence only; no auth, no backend.

## Stack

- **Vite + React 18 + TypeScript** — fast dev loop, no SSR needed.
- **Tailwind CSS + shadcn/ui** — card-heavy dashboard fits shadcn well. Follow the official shadcn Vite setup (`components.json`, path aliases).
- **Zustand with `persist` middleware** — single store, auto-syncs to localStorage. Lets us swap storage later if cloud sync is ever wanted.
- **Recharts** — line chart for net-worth trajectory, bar chart for TCO breakdown.
- **TanStack Query** — caches FIPE API responses in memory, dedupes requests, handles loading/error states. Persist its cache to localStorage too so repeated lookups are instant across sessions.
- **Vitest** — unit tests for the calc engine only. UI gets manual testing.

## FIPE API

- Source: `https://parallelum.com.br/fipe/api/v1/carros/{marcas|modelos|anos|veiculo}` — free, no auth, well-known.
- Called directly from the browser (no proxy). Rate limits are loose enough for personal use.
- Wrap calls in `src/lib/fipe/client.ts` exposing typed `getMakes()`, `getModels(makeId)`, `getYears(makeId, modelId)`, `getVehicle(makeId, modelId, yearId)`. Keep the API surface narrow so swapping providers later is a one-file change.
- Cache via TanStack Query with a long `staleTime` (e.g. 24h). FIPE updates monthly, so this is safe.

## File layout

```
src/
  main.tsx, App.tsx
  components/
    ui/                      # shadcn primitives
    garage/CurrentVehicleCard.tsx
    garage/AddVehicleDialog.tsx        # multi-step dropdown FIPE search
    purchases/NewPurchaseCard.tsx
    dashboard/TimelineSlider.tsx
    dashboard/SummaryMetrics.tsx       # Cash, Equity, Total, TCO
    dashboard/NetWorthChart.tsx
    dashboard/TcoBreakdownChart.tsx
  lib/
    fipe/client.ts                     # API wrapper
    fipe/types.ts
    calc/depreciation.ts               # cross-year FIPE lookup
    calc/ipva.ts                       # rate * projected market value
    calc/fuel.ts                       # km/year * price / consumption
    calc/scenario.ts                   # top-level: scenario + year -> metrics
    calc/scenario.test.ts
  store/
    scenarioStore.ts                   # Zustand + persist
    types.ts                           # Vehicle, NewPurchase, Scenario
```

## Data model (sketch)

```ts
type OwnedVehicle = {
  id: string;
  fipe: { makeId; modelId; yearId; currentValue; fuelType };
  decision: 'keep' | 'sell';
  sale?: { price?: number; discountPct?: number };  // one of the two
  annualInsurance: number;
  annualMaintenance: number;
  annualKm: number;
  fuelPricePerLiter: number;     // or per kWh
  kmPerLiter: number;            // or kWh/100km for EV
};

type NewPurchase = {
  id: string;
  fipe: { ... };
  condition: 'new' | 'used';
  acquisitionCost: number;
  annualInsurance, annualMaintenance, annualKm, fuelPricePerLiter, kmPerLiter;
};

type Scenario = {
  ownedVehicles: OwnedVehicle[];
  newPurchases: NewPurchase[];
  timelineYears: 1 | 2 | 3 | 4 | 5;
  ipvaRatePct: number;           // default 2 (SC)
};
```

## Calculation engine

Pure functions, no React. The store holds inputs; the dashboard derives metrics with `useMemo`.

- **`projectVehicleValue(vehicle, yearsFromNow)`** — looks up the FIPE value of the same model `yearsFromNow` years older (e.g. 2025 model in 3 years ≈ today's 2022 model). For new cars: apply ~20% first-year haircut before falling into the lookup curve.
- **`computeAnnualCosts(vehicle, year)`** — IPVA (rate × projected value), insurance, maintenance, fuel = (annualKm / kmPerLiter) × pricePerLiter.
- **`computeScenario(scenario)`** — returns `{ cashInHand, assetEquityByYear[], tcoByYear[], totalPortfolioByYear[], freeCashFlowAtStart }`. This is what charts and summary cards consume.

Unit-test this layer with realistic fixtures. UI bugs are cheap; calc bugs erode trust.

## UI flow

1. **Garage section** — cards for each owned vehicle, toggle Keep/Sell, inline inputs for costs or sale price.
2. **Add Purchase section** — "+ Add vehicle" opens a dialog with cascading Make → Model → Year → Trim dropdowns (each step fetches from FIPE).
3. **Timeline slider** — sticky at top, 1–5 years, drives all downstream calcs.
4. **Summary row** — four big metric cards: Cash in Hand, Asset Equity, Total Portfolio, Cumulative TCO.
5. **Charts row** — net worth line chart (year 0 → year N) + TCO stacked bar (IPVA / insurance / maintenance / fuel).
6. **Reset / Clear scenario** button.

Defaults: IPVA 2% (SC), 15.000 km/year, R$6/L gasoline, R$5/L ethanol, R$6.50/L diesel, R$0.80/kWh EV. All overridable per vehicle.

## Out of scope for MVP (explicit)

- Multiple named scenarios + side-by-side comparison (Module 4).
- Auth, cloud sync, multi-user.
- Financing/loan modeling.
- Inflation adjustment on costs (assume nominal R$).
- PWA / offline support beyond what localStorage already gives.

## Verification

1. `npm run dev` — open the app, confirm:
   - FIPE dropdowns load makes, then models, then years.
   - Adding Mercedes C200 2025 and Volvo XC40 2020 returns plausible R$ values.
   - Toggling Keep/Sell updates Cash in Hand instantly.
   - Moving the timeline slider re-renders charts and metrics without lag.
   - Reloading the page restores the scenario from localStorage.
2. `npm run test` — calc engine tests pass. Cover: depreciation lookup, sale-with-discount, IPVA across years, fuel cost for gasoline vs EV, full `computeScenario` against a hand-computed fixture.
3. Manual sanity: a scenario of "sell both, buy nothing" should yield Total Portfolio ≈ sum of sale prices and TCO ≈ 0.
