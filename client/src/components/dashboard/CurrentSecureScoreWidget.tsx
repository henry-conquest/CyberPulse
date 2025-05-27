import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { Check, AlertTriangle, XCircle } from 'lucide-react';

interface CurrentSecureScoreWidgetProps {
  currentScore: number;
  maxScore?: number;
  currentPercent: number;
}

export default function CurrentSecureScoreWidget({
  currentScore,
  maxScore = 285,
  currentPercent,
}: CurrentSecureScoreWidgetProps) {
  // Calculate gradient colors based on score
  const getScoreColor = (percent: number) => {
    if (percent >= 70) return '#22c55e'; // green
    if (percent >= 40) return '#eab308'; // yellow
    return '#ef4444'; // red
  };

  const scoreColor = getScoreColor(currentPercent);

  // Get appropriate icon for the score
  const getScoreIcon = (percent: number) => {
    if (percent >= 70) return <Check className="h-6 w-6 text-green-500" />;
    if (percent >= 40) return <AlertTriangle className="h-6 w-6 text-amber-500" />;
    return <XCircle className="h-6 w-6 text-red-500" />;
  };

  // Get score description
  const getScoreDescription = (percent: number) => {
    if (percent >= 70) return 'Good';
    if (percent >= 40) return 'Needs Improvement';
    return 'Critical';
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Current Secure Score</CardTitle>
        <CardDescription>Microsoft 365 security assessment</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center">
          <div className="w-24 h-24 mr-4">
            <CircularProgressbar
              value={currentPercent}
              text={`${currentPercent}%`}
              styles={buildStyles({
                pathColor: scoreColor,
                textColor: scoreColor,
                trailColor: '#e5e7eb',
                textSize: '22px',
              })}
            />
          </div>
          <div>
            <div className="flex items-center">
              {getScoreIcon(currentPercent)}
              <span className="ml-2 font-medium">{getScoreDescription(currentPercent)}</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Score: {currentScore.toFixed(1)} / {maxScore}
            </p>
            <p className="text-sm text-gray-600">
              {currentPercent < 40 && 'Urgent action required'}
              {currentPercent >= 40 && currentPercent < 70 && 'Improvement needed'}
              {currentPercent >= 70 && 'Good security posture'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
