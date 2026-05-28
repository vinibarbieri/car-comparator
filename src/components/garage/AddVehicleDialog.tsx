import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { getMakes, getModels, getYears, getVehicle } from '@/lib/fipe/client'
import { useScenarioStore } from '@/store/scenarioStore'
import type { FuelType, OwnedVehicle } from '@/store/types'
import { formatCurrency, parseFipeValue } from '@/lib/utils'

const FUEL_LABEL: Record<string, string> = {
  G: 'Gasolina',
  A: 'Álcool',
  D: 'Diesel',
}

const FUEL_DEFAULTS: Record<string, { price: number; consumption: number; type: FuelType }> = {
  G: { price: 6.0, consumption: 12, type: 'gasoline' },
  A: { price: 5.0, consumption: 10, type: 'ethanol' },
  D: { price: 6.5, consumption: 10, type: 'diesel' },
}

function fuelTypeFromSigla(sigla: string): FuelType {
  return FUEL_DEFAULTS[sigla]?.type ?? 'flex'
}

export function AddVehicleDialog() {
  const [open, setOpen] = useState(false)

  // FIPE selection state
  const [makeId, setMakeId] = useState('')
  const [modelId, setModelId] = useState<number | null>(null)
  const [yearId, setYearId] = useState('')

  // Cost inputs
  const [annualInsurance, setAnnualInsurance] = useState(5000)
  const [annualMaintenance, setAnnualMaintenance] = useState(2000)
  const [annualKm, setAnnualKm] = useState(15000)
  const [fuelPrice, setFuelPrice] = useState(6.0)
  const [consumption, setConsumption] = useState(12)

  const { addOwnedVehicle } = useScenarioStore()

  const makesQuery = useQuery({
    queryKey: ['fipe', 'makes'],
    queryFn: getMakes,
    enabled: open,
  })

  const modelsQuery = useQuery({
    queryKey: ['fipe', 'models', makeId],
    queryFn: () => getModels(makeId),
    enabled: !!makeId,
  })

  const yearsQuery = useQuery({
    queryKey: ['fipe', 'years', makeId, modelId],
    queryFn: () => getYears(makeId, modelId!),
    enabled: !!makeId && modelId !== null,
  })

  const vehicleQuery = useQuery({
    queryKey: ['fipe', 'vehicle', makeId, modelId, yearId],
    queryFn: () => getVehicle(makeId, modelId!, yearId),
    enabled: !!makeId && modelId !== null && !!yearId,
  })

  const vehicle = vehicleQuery.data

  // Auto-fill fuel defaults when vehicle data arrives
  useEffect(() => {
    if (vehicle) {
      const defaults = FUEL_DEFAULTS[vehicle.SiglaCombustivel]
      if (defaults) {
        setFuelPrice(defaults.price)
        setConsumption(defaults.consumption)
      }
    }
  }, [vehicle?.SiglaCombustivel])

  function handleMakeChange(id: string) {
    setMakeId(id)
    setModelId(null)
    setYearId('')
  }

  function handleModelChange(id: string) {
    setModelId(parseInt(id))
    setYearId('')
  }

  function handleAdd() {
    if (!vehicle || !makeId || modelId === null || !yearId) return

    const selectedMake = makesQuery.data?.find((m) => m.codigo === makeId)
    const selectedModel = modelsQuery.data?.modelos.find((m) => m.codigo === modelId)
    const selectedYear = yearsQuery.data?.find((y) => y.codigo === yearId)

    const newVehicle: OwnedVehicle = {
      id: crypto.randomUUID(),
      fipe: {
        makeId,
        makeName: selectedMake?.nome ?? '',
        modelId,
        modelName: selectedModel?.nome ?? vehicle.Modelo,
        yearId,
        yearName: selectedYear?.nome ?? String(vehicle.AnoModelo),
        currentValue: parseFipeValue(vehicle.Valor),
        fuelType: fuelTypeFromSigla(vehicle.SiglaCombustivel),
        fipeCode: vehicle.CodigoFipe,
      },
      decision: 'keep',
      annualInsurance,
      annualMaintenance,
      annualKm,
      fuelPricePerLiter: fuelPrice,
      kmPerLiter: consumption,
    }

    addOwnedVehicle(newVehicle)
    handleClose()
  }

  function handleClose() {
    setOpen(false)
    setMakeId('')
    setModelId(null)
    setYearId('')
    setAnnualInsurance(5000)
    setAnnualMaintenance(2000)
    setAnnualKm(15000)
    setFuelPrice(6.0)
    setConsumption(12)
  }

  const fipeValue = vehicle ? parseFipeValue(vehicle.Valor) : 0
  const fuelSigla = vehicle?.SiglaCombustivel ?? 'G'
  const isElectric = fuelSigla === 'E'

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : handleClose())}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full border-dashed">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar veículo à garagem
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar veículo à garagem</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Cascading FIPE selects */}
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Marca</Label>
              {makesQuery.isLoading ? (
                <LoadingRow label="Carregando marcas…" />
              ) : (
                <Select value={makeId} onValueChange={handleMakeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a marca" />
                  </SelectTrigger>
                  <SelectContent>
                    {makesQuery.data?.map((make) => (
                      <SelectItem key={make.codigo} value={make.codigo}>
                        {make.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-1">
              <Label>Modelo</Label>
              {modelsQuery.isLoading ? (
                <LoadingRow label="Carregando modelos…" />
              ) : (
                <Select
                  value={modelId?.toString() ?? ''}
                  onValueChange={handleModelChange}
                  disabled={!makeId}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={makeId ? 'Selecione o modelo' : 'Selecione a marca primeiro'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {modelsQuery.data?.modelos.map((model) => (
                      <SelectItem key={model.codigo} value={model.codigo.toString()}>
                        {model.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-1">
              <Label>Ano / Versão</Label>
              {yearsQuery.isLoading ? (
                <LoadingRow label="Carregando anos…" />
              ) : (
                <Select value={yearId} onValueChange={setYearId} disabled={!modelId}>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={modelId ? 'Selecione o ano' : 'Selecione o modelo primeiro'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {yearsQuery.data?.map((year) => (
                      <SelectItem key={year.codigo} value={year.codigo}>
                        {year.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* FIPE value display */}
          {vehicleQuery.isLoading && <LoadingRow label="Buscando valor FIPE…" />}
          {vehicle && (
            <div className="rounded-md border bg-muted/30 p-3 space-y-0.5">
              <p className="text-xs text-muted-foreground">
                {vehicle.Modelo} · {vehicle.AnoModelo} ·{' '}
                {FUEL_LABEL[vehicle.SiglaCombustivel] ?? vehicle.Combustivel}
              </p>
              <p className="text-xl font-bold">{formatCurrency(fipeValue)}</p>
              <p className="text-xs text-muted-foreground">Ref: {vehicle.MesReferencia}</p>
            </div>
          )}

          <Separator />

          {/* Annual costs */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Custos anuais estimados</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Seguro (R$/ano)</Label>
                <Input
                  type="number"
                  min={0}
                  value={annualInsurance}
                  onChange={(e) => setAnnualInsurance(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Manutenção (R$/ano)</Label>
                <Input
                  type="number"
                  min={0}
                  value={annualMaintenance}
                  onChange={(e) => setAnnualMaintenance(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Km / ano</Label>
                <Input
                  type="number"
                  min={0}
                  value={annualKm}
                  onChange={(e) => setAnnualKm(parseFloat(e.target.value) || 0)}
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
                  value={fuelPrice}
                  onChange={(e) => setFuelPrice(parseFloat(e.target.value) || 0)}
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
                  value={consumption}
                  onChange={(e) => setConsumption(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleAdd} disabled={!vehicle || vehicleQuery.isLoading}>
            Adicionar veículo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function LoadingRow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
      <Loader2 className="h-3 w-3 animate-spin" />
      {label}
    </div>
  )
}
