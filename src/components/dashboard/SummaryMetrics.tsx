import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import type { ScenarioResult } from '@/lib/calc/scenario'

type Props = {
  result: ScenarioResult
  timelineYears: number
}

export function SummaryMetrics({ result, timelineYears }: Props) {
  const final = result.byYear[timelineYears]
  const yearLabel = `${timelineYears} ${timelineYears === 1 ? 'ano' : 'anos'}`

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <MetricCard
        title="Caixa livre"
        value={result.cashInHand}
        description="Vendas − compras"
        variant={result.cashInHand >= 0 ? 'positive' : 'negative'}
      />
      <MetricCard
        title="Patrimônio"
        value={final.assetEquity}
        description={`Valor dos veículos em ${yearLabel}`}
        variant="neutral"
      />
      <MetricCard
        title="Portfólio total"
        value={final.totalPortfolio}
        description="Caixa + patrimônio"
        variant={final.totalPortfolio >= 0 ? 'neutral' : 'negative'}
      />
      <MetricCard
        title="Custo total"
        value={final.cumulativeTco}
        description={`IPVA, seguro, manu. e comb. em ${yearLabel}`}
        variant="cost"
      />
    </div>
  )
}

type Variant = 'positive' | 'negative' | 'neutral' | 'cost'

function MetricCard({
  title,
  value,
  description,
  variant,
}: {
  title: string
  value: number
  description: string
  variant: Variant
}) {
  const valueClass =
    variant === 'positive'
      ? 'text-emerald-600 dark:text-emerald-400'
      : variant === 'negative'
        ? 'text-destructive'
        : variant === 'cost'
          ? 'text-amber-600 dark:text-amber-400'
          : 'text-foreground'

  const prefix = variant === 'cost' ? '−' : ''

  return (
    <Card>
      <CardContent className="pt-4 pb-4 space-y-1">
        <p className="text-xs text-muted-foreground">{title}</p>
        <p className={`text-xl font-bold leading-none ${valueClass}`}>
          {prefix}
          {formatCurrency(Math.abs(value))}
        </p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}
