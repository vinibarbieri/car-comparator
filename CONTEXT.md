# Garage Financial Simulator — Full Project Context

> This document is the single source of truth for an AI assistant picking up this codebase. It covers every layer: business goal, stack, file layout, data model, calc engine, UI components, and known gotchas. Read this instead of grepping every file.

---

## 1. What This App Does

**Simulador de Garagem** is a single-page dashboard (React/Vite) that helps a Brazilian family decide what to do with their vehicles. Users add owned cars, toggle Keep/Sell, optionally add new purchases, and the app projects the financial outcome (depreciation, IPVA, insurance, maintenance, fuel) over a 1–5 year timeline.

The MVP covers three modules:
- **Module 1** — Current Garage: add owned vehicles, decide keep/sell, set sale price or FIPE discount.
- **Module 2** — New Purchases: search FIPE API (cascading selects), set acquisition cost and operating costs.
- **Module 3** ✅ — Calculation & Projection Engine: timeline slider, 4 summary metrics, net-worth line chart, TCO stacked bar chart.
- **Module 4** — Multi-scenario comparison (explicitly deferred, out of scope).

Persistence: Zustand `persist` middleware writes to `localStorage` key `garage-scenario`. No auth, no backend.

---

## 2. Technology Stack

| Layer | Choice | Notes |
|---|---|---|
| Language | TypeScript 5.5 | strict mode |
| Framework | React 18 + Vite 5.4 | SPA, no SSR |
| Styling | Tailwind CSS 3.4 + shadcn/ui | CSS variables via `hsl(var(...))` |
| State | Zustand 4.5 + `persist` | single store, localStorage |
| Data fetching | TanStack Query 5.56 | 24h staleTime, FIPE API |
| Charts | Recharts 2.12 | LineChart + BarChart |
| Testing | Vitest 2.1 | jsdom env, calc engine only |
| Icons | Lucide React 0.447 | |
| Package manager | Yarn 1.x | `yarn`, `yarn dev`, `yarn test` |

---

## 3. Commands

```bash
yarn             # install
yarn dev         # dev server → http://localhost:5173
yarn build       # tsc -b && vite build (checks TS errors + bundles)
yarn test        # vitest run (calc engine tests, 22 tests)
yarn test:watch  # watch mode
yarn preview     # serve production build locally
```

---

## 4. Complete File Tree

```
src/
├── main.tsx                         # Entry; wraps App in QueryClientProvider (staleTime 24h)
├── App.tsx                          # Root layout; computes scenario with useMemo; sticky slider + dashboard + garage + purchases sections
├── index.css                        # Tailwind directives + CSS custom properties (light/dark color vars)
│
├── store/
│   ├── types.ts                     # All domain types (FuelType, FipeRef, OwnedVehicle, NewPurchase, Scenario)
│   └── scenarioStore.ts             # Zustand store (persist → 'garage-scenario'); actions: add/update/remove vehicles & purchases, setTimelineYears, setIpvaRate, reset
│
├── lib/
│   ├── utils.ts                     # cn(), formatCurrency(), parseFipeValue()
│   ├── fipe/
│   │   ├── types.ts                 # FipeMake, FipeModel, FipeYear, FipeVehicle (raw API shapes)
│   │   └── client.ts                # getMakes(), getModels(makeId), getYears(makeId, modelId), getVehicle(makeId, modelId, yearId)
│   └── calc/
│       ├── depreciation.ts          # projectVehicleValue(fipeValue, yearsFromNow, isNew?)
│       ├── ipva.ts                  # computeAnnualIpva(vehicleValue, ratePct)
│       ├── fuel.ts                  # computeAnnualFuel(annualKm, kmPerLiter, fuelPricePerLiter, fuelType)
│       ├── scenario.ts              # computeScenario(scenario) → ScenarioResult; exports TcoBreakdown, YearlyMetrics, ScenarioResult types
│       └── scenario.test.ts         # 22 Vitest unit tests covering all calc functions + full fixture
│
└── components/
    ├── ui/                          # shadcn primitives: badge, button, card, dialog, input, label, select, separator, switch, tabs (12 files)
    ├── garage/
    │   ├── CurrentVehicleCard.tsx   # Displays owned vehicle; Keep/Sell tabs; keep→cost inputs; sell→price or discount input
    │   └── AddVehicleDialog.tsx     # Dialog with cascading Make→Model→Year FIPE selects + cost defaults; calls addOwnedVehicle()
    ├── purchases/
    │   ├── NewPurchaseCard.tsx      # Displays new purchase; inline cost editing; condition select; vs-FIPE label
    │   └── AddPurchaseDialog.tsx    # Dialog with cascading FIPE selects + acquisition cost + costs; calls addNewPurchase()
    └── dashboard/
        ├── TimelineSlider.tsx       # Sticky bar below header; range input 1–5 years; IPVA rate input; calls setTimelineYears/setIpvaRate
        ├── SummaryMetrics.tsx       # 4 metric cards: Cash in Hand, Patrimônio, Portfólio Total, Custo Total (from ScenarioResult)
        ├── NetWorthChart.tsx        # Recharts LineChart: totalPortfolio + assetEquity lines over years 0..N
        └── TcoBreakdownChart.tsx    # Recharts BarChart stacked: IPVA/seguro/manutenção/combustível per year 1..N
```

---

## 5. Data Model (`src/store/types.ts`)

```typescript
type FuelType = 'gasoline' | 'ethanol' | 'diesel' | 'flex' | 'electric' | 'hybrid'

type FipeRef = {
  makeId: string
  makeName: string
  modelId: number
  modelName: string
  yearId: string
  yearName: string
  currentValue: number        // R$, parsed from FIPE "Valor" string
  fuelType: FuelType          // derived from SiglaCombustivel
  fipeCode: string            // CodigoFipe from API
}

type OwnedVehicle = {
  id: string                  // uuid
  fipe: FipeRef
  decision: 'keep' | 'sell'
  salePrice?: number          // manual sale price (preferred over discountPct when set)
  discountPct?: number        // % discount applied to fipe.currentValue
  annualInsurance: number
  annualMaintenance: number
  annualKm: number
  fuelPricePerLiter: number   // R$/L or R$/kWh for electric
  kmPerLiter: number          // km/L or kWh/100km for electric
}

type NewPurchase = {
  id: string
  fipe: FipeRef
  condition: 'new' | 'used'
  acquisitionCost: number     // negotiated purchase price
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
  ipvaRatePct: number         // default 2 (Santa Catarina, Brazil)
}
```

---

## 6. Zustand Store (`src/store/scenarioStore.ts`)

```typescript
// Access in components:
const { ownedVehicles, newPurchases, timelineYears, ipvaRatePct } = useScenarioStore()
const { addOwnedVehicle, updateOwnedVehicle, removeOwnedVehicle } = useScenarioStore()
const { addNewPurchase, updateNewPurchase, removeNewPurchase } = useScenarioStore()
const { setTimelineYears, setIpvaRate, reset } = useScenarioStore()
```

Persisted to `localStorage` as key `'garage-scenario'`. Default: `timelineYears=3`, `ipvaRatePct=2`, empty arrays.

---

## 7. FIPE API (`src/lib/fipe/`)

Base URL: `https://parallelum.com.br/fipe/api/v1/carros`

| Function | Endpoint | Returns |
|---|---|---|
| `getMakes()` | `/marcas` | `FipeMake[]` — `{codigo, nome}` |
| `getModels(makeId)` | `/marcas/:id/modelos` | `{modelos: FipeModel[]}` — `{codigo, nome}` |
| `getYears(makeId, modelId)` | `/marcas/:id/modelos/:id/anos` | `FipeYear[]` — `{codigo, nome}` |
| `getVehicle(makeId, modelId, yearId)` | `/marcas/:id/modelos/:id/anos/:id` | `FipeVehicle` |

`FipeVehicle` shape (raw API):
```typescript
{
  TipoVeiculo: number
  Valor: string            // "R$ 280.064,00" — parse with parseFipeValue()
  Marca: string
  Modelo: string
  AnoModelo: number
  Combustivel: string
  CodigoFipe: string
  MesReferencia: string
  SiglaCombustivel: string  // "G"|"A"|"D"|"E"
}
```

**Fuel type mapping from SiglaCombustivel:**
- `"G"` → `gasoline` (defaults: 6.0 R$/L, 12 km/L)
- `"A"` → `ethanol` (defaults: 5.0 R$/L, 10 km/L)
- `"D"` → `diesel` (defaults: 6.5 R$/L, 10 km/L)
- `"E"` → `electric` (special formula: kWh/100km; default 0.80 R$/kWh, 20 kWh/100km)

TanStack Query is used in the Add dialogs with `queryKey: ['fipe', ...]` and `staleTime: 24 * 60 * 60 * 1000`.

---

## 8. Calculation Engine (`src/lib/calc/`)

All pure functions — no React, no side effects.

### `depreciation.ts`

```typescript
// Constants
FIRST_YEAR_RATE = 0.20   // new-car first-year value loss
ANNUAL_RATE = 0.10        // standard annual depreciation

// Projects market value N years from now.
// isNew=true: apply 20% in year 1 then 10%/year after.
// isNew=false (default): apply 10%/year flat.
projectVehicleValue(fipeValue: number, yearsFromNow: number, isNew = false): number
```

Examples:
- `projectVehicleValue(100_000, 3)` → `72_900` (used: 0.9³)
- `projectVehicleValue(100_000, 1, true)` → `80_000` (new: first year 20% haircut)
- `projectVehicleValue(100_000, 3, true)` → `64_800` (new: 80k × 0.81)

### `ipva.ts`

```typescript
computeAnnualIpva(vehicleValue: number, ratePct: number): number
// = vehicleValue * (ratePct / 100)
```

### `fuel.ts`

```typescript
computeAnnualFuel(annualKm, kmPerLiter, fuelPricePerLiter, fuelType: FuelType): number
// electric: (annualKm / 100) * kmPerLiter * fuelPricePerLiter
// all others: (annualKm / kmPerLiter) * fuelPricePerLiter
// returns 0 if km=0 or kmPerLiter=0
```

### `scenario.ts`

**Output types:**
```typescript
type TcoBreakdown = { ipva: number; insurance: number; maintenance: number; fuel: number }

type YearlyMetrics = {
  year: number           // 0..timelineYears
  assetEquity: number    // total market value of kept + purchased vehicles
  annualTco: number      // costs in this year (0 for year 0)
  cumulativeTco: number  // sum of all annualTco up to this year
  totalPortfolio: number // cashInHand + assetEquity
  tcoBreakdown: TcoBreakdown
}

type ScenarioResult = {
  cashInHand: number     // static: saleProceeds - purchaseCosts
  byYear: YearlyMetrics[]  // length = timelineYears + 1
}
```

**`computeScenario(scenario: Scenario): ScenarioResult`**

Logic summary:
1. Split `ownedVehicles` into `soldVehicles` and `keptVehicles`.
2. `cashInHand = Σ effectiveSalePrice(sold) − Σ acquisitionCost(purchases)`
   - `effectiveSalePrice`: uses `salePrice` if set, else `fipe.currentValue * (1 − discountPct/100)`
3. For each `year` in `0..timelineYears`:
   - `assetEquity`: sum of projected values for keptVehicles + newPurchases
     - Kept: `projectVehicleValue(fipe.currentValue, year)` (used curve)
     - New purchase year 0: `acquisitionCost`
     - New purchase year >0: `projectVehicleValue(fipe.currentValue, year, condition === 'new')`
   - `tcoBreakdown` (only for year ≥ 1):
     - IPVA: `computeAnnualIpva(vehicleValue(year), ipvaRatePct)` per active vehicle
     - Insurance, maintenance: direct annual cost fields
     - Fuel: `computeAnnualFuel(...)` per active vehicle
   - Active vehicles for TCO = keptVehicles + newPurchases (sold vehicles have no ongoing costs)
4. `totalPortfolio = cashInHand + assetEquity`

**Sanity check:** "Sell both, buy nothing" → `assetEquity=0`, `cumulativeTco=0`, `totalPortfolio=cashInHand≈sum(salePrices)`. Tested in `scenario.test.ts`.

---

## 9. Dashboard Components

### `TimelineSlider`
- Sticky bar (`sticky top-0 z-10`) below the `<header>`.
- HTML `<input type="range" min=1 max=5 step=1>` driving `setTimelineYears`.
- IPVA `<Input>` driving `setIpvaRate`.
- Year labels below slider highlight active year.

### `SummaryMetrics`
- Props: `{ result: ScenarioResult, timelineYears: number }`
- 4 cards in a `grid-cols-2 md:grid-cols-4` grid:
  1. **Caixa livre** — `result.cashInHand` (green if ≥0, red if <0)
  2. **Patrimônio** — `result.byYear[timelineYears].assetEquity`
  3. **Portfólio total** — `result.byYear[timelineYears].totalPortfolio`
  4. **Custo total** — `result.byYear[timelineYears].cumulativeTco` (amber, always shown as cost/negative)

### `NetWorthChart`
- Props: `{ result: ScenarioResult }`
- Recharts `<LineChart>` with two lines:
  - `totalPortfolio` (primary color, solid)
  - `assetEquity` (muted, dashed)
- X-axis: year labels (`"Hoje"` for year 0, `"Ano N"` after)
- Y-axis: abbreviated currency (`R$280k`, `R$1.2M`)

### `TcoBreakdownChart`
- Props: `{ result: ScenarioResult }`
- Recharts `<BarChart>` stacked bars, years 1..N only (no year 0)
- Data flattened: `{ year, ipva, seguro, manutencao, combustivel }`
- Colors: ipva=orange, seguro=blue, manutencao=purple, combustivel=green

### `App.tsx` wiring
```tsx
const { ownedVehicles, newPurchases, timelineYears, ipvaRatePct } = useScenarioStore()
const result = useMemo(
  () => computeScenario({ ownedVehicles, newPurchases, timelineYears, ipvaRatePct }),
  [ownedVehicles, newPurchases, timelineYears, ipvaRatePct],
)
// Dashboard section only rendered when hasVehicles (ownedVehicles.length > 0 || newPurchases.length > 0)
```

Page order: Header → TimelineSlider (sticky) → Dashboard (metrics + 2 charts, hidden if empty) → Garage section → Purchases section.

---

## 10. AddVehicleDialog / AddPurchaseDialog Pattern

Both dialogs follow the same multi-step FIPE cascade:
1. Select Make → `useQuery(['fipe','makes'], getMakes)`
2. Select Model → `useQuery(['fipe','models',makeId], () => getModels(makeId))`
3. Select Year → `useQuery(['fipe','years',makeId,modelId], () => getYears(makeId, modelId))`
4. On year select → `useQuery(['fipe','vehicle',...], () => getVehicle(...))` — auto-fills `currentValue` and fuel defaults

Fuel defaults applied on vehicle fetch:
```
'G' → fuelPrice=6.0, kmPerLiter=12
'A' → fuelPrice=5.0, kmPerLiter=10
'D' → fuelPrice=6.5, kmPerLiter=10
'E' → fuelPrice=0.80, kmPerLiter=20 (kWh/100km)
```

`parseFipeValue("R$ 280.064,00")` → `280064` (strips `R$`, swaps `.`/`,`).

---

## 11. Styling Conventions

- **shadcn/ui pattern**: `cn()` = `clsx` + `tailwind-merge`, imported from `@/lib/utils`.
- **CSS variables**: colors defined in `src/index.css` as `--primary`, `--muted`, etc., consumed as `hsl(var(--primary))` in Tailwind config and inline styles.
- **Max-width container**: `max-w-4xl` on both header and main.
- **Dark mode**: configured but not actively toggled in UI (classes exist).

---

## 12. What's Not Implemented (Out of Scope)

- **Module 4**: Named scenarios + side-by-side comparison.
- Auth, cloud sync, multi-user.
- Financing / loan modeling.
- Inflation-adjusted costs (all values are nominal R$).
- FIPE historical lookups for depreciation — the engine uses a fixed-rate model (20% first year for new, 10%/year after; 10%/year for used).
- PWA / offline beyond localStorage.

---

## 13. Test Coverage (`src/lib/calc/scenario.test.ts`)

22 tests across 4 `describe` blocks:
- `projectVehicleValue`: year 0, used curve, new curve, new > used in year 1
- `computeAnnualIpva`: 2% rate, arbitrary rate, zero vehicle
- `computeAnnualFuel`: gasoline, electric, zero km, zero kmPerLiter, ethanol
- `computeScenario`: empty scenario, sell-all sanity, discount sale, year 0 no TCO, IPVA accumulation, new purchase depreciation, byYear length, full realistic fixture (Mercedes kept + Volvo sold + EV purchased)

Run: `yarn test` (all 22 pass in ~500ms).

---

## 14. Known Constraints / Gotchas

- **FIPE API**: public, no auth, rate limits loose. Requests go directly from the browser (no proxy). Errors show as TanStack Query retry state.
- **Electric fuel formula**: `kmPerLiter` field stores `kWh/100km` (NOT km/kWh). `fuelPricePerLiter` stores `R$/kWh`. This is consistent across all components and the calc engine.
- **Sale price vs discount**: `salePrice` takes precedence in `effectiveSalePrice`. If `salePrice` is undefined, `discountPct` is used. Both are optional; if neither is set, effective price = full FIPE value.
- **Year 0 TCO = 0**: The calc engine treats year 0 as "today, after transactions but before any ongoing costs." Costs begin accumulating in year 1.
- **New purchase equity at year 0 = acquisitionCost**: Regardless of FIPE value (could be above or below FIPE). Years 1+ use `projectVehicleValue(fipe.currentValue, ...)`.
- **Sold vehicles have no ongoing TCO**: Only `keptVehicles` and `newPurchases` contribute to insurance, maintenance, fuel, IPVA.
- **shadcn/ui Slider not installed**: The timeline uses a native `<input type="range">` styled with Tailwind/accent-color, not a Radix component.
