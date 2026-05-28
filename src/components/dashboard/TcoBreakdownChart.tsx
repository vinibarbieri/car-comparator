import {
  BarChart,
  Bar,
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

export function TcoBreakdownChart({ result }: Props) {
  const data = result.byYear
    .filter((y) => y.year >= 1)
    .map((y) => ({
      year: y.year,
      ipva: Math.round(y.tcoBreakdown.ipva),
      seguro: Math.round(y.tcoBreakdown.insurance),
      manutencao: Math.round(y.tcoBreakdown.maintenance),
      combustivel: Math.round(y.tcoBreakdown.fuel),
    }))

  const tickFormatter = (v: number) => {
    if (v >= 1_000) return `R$${(v / 1_000).toFixed(0)}k`
    return formatCurrency(v)
  }

  const nameMap: Record<string, string> = {
    ipva: 'IPVA',
    seguro: 'Seguro',
    manutencao: 'Manutenção',
    combustivel: 'Combustível',
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Custo total por ano (TCO)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
            <XAxis
              dataKey="year"
              tickFormatter={(y) => `Ano ${y}`}
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
              formatter={(value: number, name: string) => [formatCurrency(value), nameMap[name] ?? name]}
              labelFormatter={(y) => `Ano ${y}`}
            />
            <Legend
              formatter={(value) => nameMap[value] ?? value}
              iconSize={10}
              wrapperStyle={{ fontSize: 11 }}
            />
            <Bar dataKey="ipva" stackId="tco" fill="#f97316" radius={[0, 0, 0, 0]} />
            <Bar dataKey="seguro" stackId="tco" fill="#3b82f6" />
            <Bar dataKey="manutencao" stackId="tco" fill="#8b5cf6" />
            <Bar dataKey="combustivel" stackId="tco" fill="#10b981" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
