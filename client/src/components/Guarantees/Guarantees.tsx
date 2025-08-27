import { useSelector } from "react-redux"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ChevronDown, ChevronRight } from "lucide-react"
import { useState } from "react"
import { navigate } from "wouter/use-browser-location"

interface GuaranteesPanelProps {
    tenantId: string
}

const GuaranteesPanel = (props: GuaranteesPanelProps) => {
  const [open, setOpen] = useState(false)

  const identityScores = useSelector((state: any) => state.scores.identityScores)
  const dataScores = useSelector((state: any) => state.scores.dataScores)
  const appsScores = useSelector((state: any) => state.scores.appScores)
  const secureScores = useSelector((state: any) => state.cloudAndInfrastructure.secureScores)

  const latestIdentity = identityScores?.[identityScores.length - 1]?.percentage ?? null
  const latestData = dataScores?.[dataScores.length - 1]?.percentage ?? null
  const latestApps = appsScores?.[appsScores.length - 1]?.percentage ?? null
  const latestSecure = secureScores?.[secureScores.length - 1]?.percentage ?? null

  const scores = [
    // { label: "Identity", value: latestIdentity },
    // { label: "Data", value: latestData },
    // { label: "Apps", value: latestApps },
    { label: "Secure", value: latestSecure },
    { label: "Risk Rating", value: 75 },
  ]

  const getColor = (val: number | null) => {
    if (val === null) return "bg-gray-400"
    if (val >= 80) return "bg-green-500"
    if (val >= 60) return "bg-orange-400"
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
          <h2 className="text-lg font-semibold text-brand-teal">Guarantees</h2>
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
                    if(score.label === 'Secure') navigate(`/secure-scores/${props.tenantId}`)
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
