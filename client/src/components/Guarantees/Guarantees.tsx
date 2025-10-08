import { useSelector } from 'react-redux';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { navigate } from 'wouter/use-browser-location';

interface GuaranteesPanelProps {
  tenantId: string;
}

interface ScoreObjectProps {
  id: string;
  tenantId: string;
  scoreDate: string;
  totalScore: string;
  maxScore: string;
  microsoftSecureScore: string;
  totalScorePct: string;
  microsoftSecureScorePct: string;
  breakdown: any;
  lastUpdated: string;
}

const GuaranteesPanel = (props: GuaranteesPanelProps) => {
  const [open, setOpen] = useState(false);
  const scoreHistory = useSelector((state: any) => state.scores.scoresHistory);
  const [maturityScoreAverage, setMaturityScoreAverage] = useState<number | null>(null);
  const [microsoftScoreAverage, setMicrosoftScoreAverage] = useState<number | null>(null);

  useEffect(() => {
    const allMaturityScores: number[] = [];
    const allSecureScores: number[] = [];
    if (scoreHistory)
      scoreHistory.map((scoreObject: ScoreObjectProps) => {
        allMaturityScores.push(+scoreObject.totalScorePct);
        allSecureScores.push(+scoreObject.microsoftSecureScorePct);
      });

    const maturityAvg = allMaturityScores.reduce((acc, val) => acc + val, 0) / allMaturityScores.length;
    const secureAvg = allSecureScores.reduce((acc, val) => acc + val, 0) / allSecureScores.length;

    // Update state
    setMaturityScoreAverage(+maturityAvg.toFixed(2));
    setMicrosoftScoreAverage(+secureAvg.toFixed(2));
  }, [scoreHistory]);

  const scores = [
    { label: 'Secure Score', value: microsoftScoreAverage },
    { label: 'Maturity Rating', value: maturityScoreAverage },
  ];

  const getColor = (val: number | null) => {
    if (val === null) return 'bg-gray-400';
    if (val >= 75) return 'bg-green-500';
    if (val >= 50) return 'bg-orange-400';
    return 'bg-red-500';
  };

  return (
    <div className="fixed top-20 right-6 z-50 w-72">
      <Card className="p-4 shadow-lg rounded-2xl border border-gray-200 bg-white">
        {/* Header row */}
        <div className="flex items-center justify-between cursor-pointer select-none" onClick={() => setOpen(!open)}>
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
                      navigate(`/secure-scores/${props.tenantId}`);
                      break;
                    case 'Maturity Rating':
                      navigate(`/maturity-scores/${props.tenantId}`);
                  }
                }}
              >
                <span className="text-sm font-medium text-gray-700">{score.label}</span>
                {score.value !== null ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-800">{score.value}%</span>
                    <div className={cn('w-3 h-3 rounded-full', getColor(score.value))} />
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
  );
};

export default GuaranteesPanel;
