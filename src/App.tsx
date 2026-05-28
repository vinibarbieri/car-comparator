import { useEffect, useMemo } from 'react'
import { Car, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useScenarioStore } from '@/store/scenarioStore'
import { SEED_CONFIGS, buildSeedVehicle } from '@/store/seeds'
import { CurrentVehicleCard } from '@/components/garage/CurrentVehicleCard'
import { NewPurchaseCard } from '@/components/purchases/NewPurchaseCard'
import { AddPurchaseDialog } from '@/components/purchases/AddPurchaseDialog'
import { TimelineSlider } from '@/components/dashboard/TimelineSlider'
import { SummaryMetrics } from '@/components/dashboard/SummaryMetrics'
import { NetWorthChart } from '@/components/dashboard/NetWorthChart'
import { TcoBreakdownChart } from '@/components/dashboard/TcoBreakdownChart'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { computeScenario } from '@/lib/calc/scenario'
import { getVehicle } from '@/lib/fipe/client'
import { parseFipeValue } from '@/lib/utils'

const STALE_24H = 24 * 60 * 60 * 1000
const [mercedesConfig, volvoConfig] = SEED_CONFIGS

export default function App() {
  const {
    ownedVehicles,
    newPurchases,
    timelineYears,
    ipvaRatePct,
    reset,
    addOwnedVehicle,
    updateOwnedVehicle,
  } = useScenarioStore()

  // Fetch live FIPE prices for seed vehicles — results cached for 24h
  const { data: mercedesData, isLoading: mercedesLoading } = useQuery({
    queryKey: ['fipe', 'vehicle', mercedesConfig.makeId, mercedesConfig.modelId, mercedesConfig.yearId],
    queryFn: () => getVehicle(mercedesConfig.makeId, mercedesConfig.modelId, mercedesConfig.yearId),
    staleTime: STALE_24H,
  })

  const { data: volvoData, isLoading: volvoLoading } = useQuery({
    queryKey: ['fipe', 'vehicle', volvoConfig.makeId, volvoConfig.modelId, volvoConfig.yearId],
    queryFn: () => getVehicle(volvoConfig.makeId, volvoConfig.modelId, volvoConfig.yearId),
    staleTime: STALE_24H,
  })

  // Track presence of seed vehicles so this effect re-runs after a reset
  const hasMercedes = ownedVehicles.some((v) => v.id === mercedesConfig.id)
  const hasVolvo = ownedVehicles.some((v) => v.id === volvoConfig.id)

  useEffect(() => {
    const pairs = [
      { config: mercedesConfig, data: mercedesData },
      { config: volvoConfig, data: volvoData },
    ]

    pairs.forEach(({ config, data }) => {
      if (!data) return
      // Read fresh state to avoid stale closure
      const { ownedVehicles: current } = useScenarioStore.getState()
      const existing = current.find((v) => v.id === config.id)
      const currentValue = parseFipeValue(data.Valor)

      if (existing) {
        if (existing.fipe.currentValue !== currentValue) {
          updateOwnedVehicle(config.id, { fipe: { ...existing.fipe, currentValue } })
        }
      } else {
        addOwnedVehicle(buildSeedVehicle(config, data))
      }
    })
  }, [mercedesData, volvoData, hasMercedes, hasVolvo, addOwnedVehicle, updateOwnedVehicle])

  const result = useMemo(
    () => computeScenario({ ownedVehicles, newPurchases, timelineYears, ipvaRatePct }),
    [ownedVehicles, newPurchases, timelineYears, ipvaRatePct],
  )

  const hasVehicles = ownedVehicles.length > 0 || newPurchases.length > 0
  const seedsLoading = mercedesLoading || volvoLoading

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between max-w-4xl">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <Car className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Simulador de Garagem</h1>
              <p className="text-xs text-muted-foreground">Análise financeira de veículos</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={reset} className="text-muted-foreground text-xs">
            Limpar cenário
          </Button>
        </div>
      </header>

      <TimelineSlider />

      <main className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
        {hasVehicles && (
          <section>
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Resumo financeiro</h2>
              <p className="text-sm text-muted-foreground">
                Projeção ao longo de {timelineYears} {timelineYears === 1 ? 'ano' : 'anos'}
              </p>
            </div>
            <div className="space-y-4">
              <SummaryMetrics result={result} timelineYears={timelineYears} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <NetWorthChart result={result} />
                <TcoBreakdownChart result={result} />
              </div>
            </div>
          </section>
        )}

        {hasVehicles && <Separator />}

        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Minha Garagem</h2>
            <p className="text-sm text-muted-foreground">
              Decida o que fazer com cada veículo atual
            </p>
          </div>

          {seedsLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando dados FIPE…
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ownedVehicles.map((vehicle) => (
                <CurrentVehicleCard key={vehicle.id} vehicle={vehicle} />
              ))}
            </div>
          )}
        </section>

        <Separator />

        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Novas Compras</h2>
            <p className="text-sm text-muted-foreground">
              Simule veículos que pretende adquirir
            </p>
          </div>

          {newPurchases.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground mb-4">
              <Car className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Nenhuma compra simulada ainda.</p>
              <p className="text-xs mt-1">Use o botão abaixo para adicionar um veículo que deseja comprar.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {newPurchases.map((purchase) => (
                <NewPurchaseCard key={purchase.id} purchase={purchase} />
              ))}
            </div>
          )}

          <AddPurchaseDialog />
        </section>
      </main>
    </div>
  )
}
