import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import type { ScenarioResult } from '@/lib/calc/scenario'

type Props = { result: ScenarioResult }

export function NetWorthChart({ result }: Props) {
  const data = result.byYear.map((y) => ({
    year: y.year,
    portfolio: Math.round(y.totalPortfolio),
    patrimonio: Math.round(y.assetEquity),
  }))

  const tickFormatter = (v: number) => {
    if (Math.abs(v) >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`
    if (Math.abs(v) >= 1_000) return `R$${(v / 1_000).toFixed(0)}k`
    return formatCurrency(v)
  }

  const labelFormatter = (year: number) => (year === 0 ? 'Hoje' : `Ano ${year}`)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Trajetória patrimonial</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="year"
              tickFormatter={labelFormatter}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={tickFormatter}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={72}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                formatCurrency(value),
                name === 'portfolio' ? 'Portfólio total' : 'Patrimônio em veículos',
              ]}
              labelFormatter={labelFormatter}
            />
            <Legend
              formatter={(value) =>
                value === 'portfolio' ? 'Portfólio total' : 'Patrimônio em veículos'
              }
              iconSize={12}
              wrapperStyle={{ fontSize: 11 }}
            />
            <Line
              type="monotone"
              dataKey="portfolio"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="patrimonio"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={1.5}
              strokeDasharray="5 4"
              dot={{ r: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
