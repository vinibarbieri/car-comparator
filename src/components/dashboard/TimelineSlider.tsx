import { useScenarioStore } from '@/store/scenarioStore'
import { Input } from '@/components/ui/input'

export function TimelineSlider() {
  const { timelineYears, ipvaRatePct, setTimelineYears, setIpvaRate } = useScenarioStore()
  const years = [1, 2, 3, 4, 5] as const

  return (
    <div className="sticky top-0 z-10 bg-card border-b shadow-sm">
      <div className="container mx-auto px-4 py-3 max-w-4xl">
        <div className="flex items-center gap-6">
          <div className="flex-1 space-y-1.5">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-muted-foreground">Horizonte de simulação</span>
              <span className="text-sm font-semibold">
                {timelineYears} {timelineYears === 1 ? 'ano' : 'anos'}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={timelineYears}
              onChange={(e) => setTimelineYears(parseInt(e.target.value) as typeof timelineYears)}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-muted accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground select-none">
              {years.map((y) => (
                <span key={y} className={y === timelineYears ? 'text-primary font-medium' : ''}>
                  {y}a
                </span>
              ))}
            </div>
          </div>

          <div className="shrink-0 space-y-1">
            <label className="text-xs text-muted-foreground block">IPVA (%)</label>
            <Input
              type="number"
              min={0}
              max={10}
              step={0.1}
              value={ipvaRatePct}
              onChange={(e) => setIpvaRate(parseFloat(e.target.value) || 0)}
              className="w-20 h-8 text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
