import { useSelector } from "react-redux"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ChevronDown, ChevronRight } from "lucide-react"
import { useEffect, useState } from "react"
import { navigate } from "wouter/use-browser-location"

interface GuaranteesPanelProps {
  tenantId: string
}

const GuaranteesPanel = (props: GuaranteesPanelProps) => {
  const [open, setOpen] = useState(false)
  const secureScores = useSelector((state: any) => state.devicesAndInfrastructure.secureScores)
  const maturityScore = useSelector((state: any) => state.scores.maturityScore)
  const latestSecure = secureScores?.[secureScores.length - 1]?.percentage ?? null

  useEffect(() => {

  }, [])

  const scores = [
    { label: "Secure Score", value: latestSecure },
    { label: "Maturity Rating", value: maturityScore },
  ]

  const getColor = (val: number | null) => {
    if (val === null) return "bg-gray-400"
    if (val >= 75) return "bg-green-500"
    if (val >= 50) return "bg-orange-400"
    return "bg-red-500"
  }

  return (
    <div className="fixed top-20 right-6 z-50 w-72">
      <Card className="p-4 shadow-lg rounded-2xl border border-gray-200 bg-white">
        {/* Header row */}
        <div
          className="flex items-center justify-between cursor-pointer select-none"
          onClick={() => setOpen(!open)}
        >
          <h2 className="text-lg font-semibold text-brand-teal">Guarantee Tracker</h2>
          {open ? (
            <ChevronDown className="w-5 h-5 text-gray-600" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-600" />
          )}
        </div>

        {/* Collapsible content */}
        {open && (
          <div className="mt-3">
            {scores.map((score, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between cursor-pointer group hover:bg-gray-100 transition-colors p-2"
                onClick={() => {
                  switch (score.label) {
                    case 'Secure Score':
                      navigate(`/secure-scores/${props.tenantId}`)
                      break
                    case 'Maturity Rating':
                      navigate(`/maturity-scores/${props.tenantId}`)
                  }
                }}
              >
                <span className="text-sm font-medium text-gray-700">
                  {score.label}
                </span>
                {score.value !== null ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-800">
                      {score.value}%
                    </span>
                    <div
                      className={cn(
                        "w-3 h-3 rounded-full",
                        getColor(score.value)
                      )}
                    />
                  </div>
                ) : (
                  <span className="text-xs text-gray-400">Loading...</span>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

export default GuaranteesPanel
