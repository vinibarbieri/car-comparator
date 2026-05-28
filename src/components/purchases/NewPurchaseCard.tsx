import { Trash2, ShoppingCart } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useScenarioStore } from '@/store/scenarioStore'
import type { NewPurchase } from '@/store/types'
import { formatCurrency } from '@/lib/utils'

type Props = { purchase: NewPurchase }

export function NewPurchaseCard({ purchase }: Props) {
  const { updateNewPurchase, removeNewPurchase } = useScenarioStore()
  const update = (updates: Partial<NewPurchase>) => updateNewPurchase(purchase.id, updates)
  const isElectric = purchase.fipe.fuelType === 'electric'

  const vsLabel =
    purchase.acquisitionCost < purchase.fipe.currentValue
      ? `${((1 - purchase.acquisitionCost / purchase.fipe.currentValue) * 100).toFixed(1)}% abaixo FIPE`
      : purchase.acquisitionCost > purchase.fipe.currentValue
        ? `${((purchase.acquisitionCost / purchase.fipe.currentValue - 1) * 100).toFixed(1)}% acima FIPE`
        : 'Igual à FIPE'

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">
                {purchase.fipe.makeName} {purchase.fipe.modelName}
              </CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <span>{purchase.fipe.yearName}</span>
                <Badge variant="outline" className="text-xs">
                  {purchase.fipe.fipeCode}
                </Badge>
                <Badge
                  variant={purchase.condition === 'new' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {purchase.condition === 'new' ? 'Novo' : 'Usado'}
                </Badge>
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => removeNewPurchase(purchase.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-3 space-y-1">
          <div>
            <p className="text-2xl font-bold">{formatCurrency(purchase.acquisitionCost)}</p>
            <p className="text-xs text-muted-foreground">Custo de aquisição · {vsLabel}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            FIPE: {formatCurrency(purchase.fipe.currentValue)}
          </p>
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="pt-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Custo de aquisição (R$)</Label>
            <Input
              type="number"
              min={0}
              value={purchase.acquisitionCost}
              onChange={(e) => update({ acquisitionCost: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Condição</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={purchase.condition}
              onChange={(e) => update({ condition: e.target.value as 'new' | 'used' })}
            >
              <option value="new">Novo (0 km)</option>
              <option value="used">Usado</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Seguro anual (R$)</Label>
            <Input
              type="number"
              min={0}
              value={purchase.annualInsurance}
              onChange={(e) => update({ annualInsurance: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Manutenção anual (R$)</Label>
            <Input
              type="number"
              min={0}
              value={purchase.annualMaintenance}
              onChange={(e) => update({ annualMaintenance: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Km / ano</Label>
            <Input
              type="number"
              min={0}
              value={purchase.annualKm}
              onChange={(e) => update({ annualKm: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              {isElectric ? 'R$ / kWh' : 'R$ / Litro'}
            </Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={purchase.fuelPricePerLiter}
              onChange={(e) => update({ fuelPricePerLiter: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-xs text-muted-foreground">
              {isElectric ? 'Consumo (kWh / 100km)' : 'Consumo (km / L)'}
            </Label>
            <Input
              type="number"
              min={0}
              step={0.1}
              value={purchase.kmPerLiter}
              onChange={(e) => update({ kmPerLiter: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
