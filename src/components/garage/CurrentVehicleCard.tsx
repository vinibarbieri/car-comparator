import { useState } from 'react'
import { Trash2, Car } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useScenarioStore } from '@/store/scenarioStore'
import type { OwnedVehicle } from '@/store/types'
import { formatCurrency } from '@/lib/utils'

type Props = { vehicle: OwnedVehicle }

export function CurrentVehicleCard({ vehicle }: Props) {
  const { updateOwnedVehicle, removeOwnedVehicle } = useScenarioStore()
  const [sellMode, setSellMode] = useState<'price' | 'discount'>('price')

  const effectiveSalePrice =
    sellMode === 'discount'
      ? vehicle.fipe.currentValue * (1 - (vehicle.discountPct ?? 0) / 100)
      : (vehicle.salePrice ?? vehicle.fipe.currentValue)

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-muted p-2">
              <Car className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg">
                {vehicle.fipe.makeName} {vehicle.fipe.modelName}
              </CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <span>{vehicle.fipe.yearName}</span>
                <Badge variant="outline" className="text-xs">
                  {vehicle.fipe.fipeCode}
                </Badge>
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => removeOwnedVehicle(vehicle.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-3">
          <p className="text-2xl font-bold">{formatCurrency(vehicle.fipe.currentValue)}</p>
          <p className="text-xs text-muted-foreground">Valor FIPE atual</p>
        </div>

        <Tabs
          value={vehicle.decision}
          onValueChange={(v) => updateOwnedVehicle(vehicle.id, { decision: v as 'keep' | 'sell' })}
          className="mt-3"
        >
          <TabsList className="w-full">
            <TabsTrigger value="keep" className="flex-1">
              Manter
            </TabsTrigger>
            <TabsTrigger value="sell" className="flex-1">
              Vender
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <Separator />

      <CardContent className="pt-4 space-y-4">
        {vehicle.decision === 'sell' ? (
          <SellFields
            vehicle={vehicle}
            sellMode={sellMode}
            setSellMode={setSellMode}
            effectiveSalePrice={effectiveSalePrice}
            onUpdate={(updates) => updateOwnedVehicle(vehicle.id, updates)}
          />
        ) : (
          <KeepFields
            vehicle={vehicle}
            onUpdate={(updates) => updateOwnedVehicle(vehicle.id, updates)}
          />
        )}
      </CardContent>
    </Card>
  )
}

function SellFields({
  vehicle,
  sellMode,
  setSellMode,
  effectiveSalePrice,
  onUpdate,
}: {
  vehicle: OwnedVehicle
  sellMode: 'price' | 'discount'
  setSellMode: (m: 'price' | 'discount') => void
  effectiveSalePrice: number
  onUpdate: (updates: Partial<OwnedVehicle>) => void
}) {
  return (
    <div className="space-y-3">
      <Tabs value={sellMode} onValueChange={(v) => setSellMode(v as 'price' | 'discount')}>
        <TabsList className="w-full">
          <TabsTrigger value="price" className="flex-1 text-xs">
            Preço manual
          </TabsTrigger>
          <TabsTrigger value="discount" className="flex-1 text-xs">
            Desconto sobre FIPE
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {sellMode === 'price' ? (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Preço de venda (R$)</Label>
          <Input
            type="number"
            min={0}
            value={vehicle.salePrice ?? vehicle.fipe.currentValue}
            onChange={(e) => onUpdate({ salePrice: parseFloat(e.target.value) || 0 })}
          />
        </div>
      ) : (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Desconto sobre FIPE (%)</Label>
          <Input
            type="number"
            min={0}
            max={100}
            step={1}
            value={vehicle.discountPct ?? 0}
            onChange={(e) => onUpdate({ discountPct: parseFloat(e.target.value) || 0 })}
          />
        </div>
      )}

      <div className="rounded-md bg-muted/50 p-3 text-sm">
        <span className="text-muted-foreground">Valor efetivo de venda: </span>
        <span className="font-semibold">{formatCurrency(effectiveSalePrice)}</span>
      </div>
    </div>
  )
}

function KeepFields({
  vehicle,
  onUpdate,
}: {
  vehicle: OwnedVehicle
  onUpdate: (updates: Partial<OwnedVehicle>) => void
}) {
  const isElectric = vehicle.fipe.fuelType === 'electric'

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Seguro anual (R$)</Label>
        <Input
          type="number"
          min={0}
          value={vehicle.annualInsurance}
          onChange={(e) => onUpdate({ annualInsurance: parseFloat(e.target.value) || 0 })}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Manutenção anual (R$)</Label>
        <Input
          type="number"
          min={0}
          value={vehicle.annualMaintenance}
          onChange={(e) => onUpdate({ annualMaintenance: parseFloat(e.target.value) || 0 })}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Km / ano</Label>
        <Input
          type="number"
          min={0}
          value={vehicle.annualKm}
          onChange={(e) => onUpdate({ annualKm: parseFloat(e.target.value) || 0 })}
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
          value={vehicle.fuelPricePerLiter}
          onChange={(e) => onUpdate({ fuelPricePerLiter: parseFloat(e.target.value) || 0 })}
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
          value={vehicle.kmPerLiter}
          onChange={(e) => onUpdate({ kmPerLiter: parseFloat(e.target.value) || 0 })}
        />
      </div>
    </div>
  )
}
