import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Loader2 } from "lucide-react";

interface SecureScoreHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: number;
}

interface SecureScoreHistory {
  id: number;
  tenantId: number;
  score: number;
  scorePercent: number;
  maxScore: number | null;
  recordedAt: string;
  reportQuarter: number | null;
  reportYear: number | null;
}

export default function SecureScoreHistoryDialog({
  isOpen,
  onClose,
  tenantId
}: SecureScoreHistoryDialogProps) {
  // Refresh key will force a query refresh when the dialog is opened
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Reset the refresh key when the dialog opens to force a data refresh
  useEffect(() => {
    if (isOpen) {
      setRefreshKey(Date.now());
    }
  }, [isOpen]);
  
  // Query to fetch secure score history
  const { data: history, isLoading, error } = useQuery<SecureScoreHistory[]>({
    queryKey: [`/api/tenants/${tenantId}/secure-score-history`, refreshKey],
    enabled: isOpen, // Only fetch when dialog is open
  });
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };
  
  // Prepare data for chart
  const chartData = history?.map(item => ({
    date: formatDate(item.recordedAt),
    scorePercent: item.scorePercent,
    score: item.score,
    maxScore: item.maxScore
  })).sort((a, b) => {
    // Sort by date (oldest to newest)
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });
  
  // Calculate average score
  const averageScore = history && history.length > 0
    ? Number((history.reduce((sum, item) => sum + item.scorePercent, 0) / history.length).toFixed(1))
    : 0;
    
  // Determine color based on average score
  const getScoreColor = (score: number): string => {
    if (score >= 70) return "text-green-600";
    if (score >= 40) return "text-yellow-600";
    return "text-red-600";
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Secure Score History</DialogTitle>
          <DialogDescription>
            Monthly snapshots of Microsoft 365 Secure Score over the past 12 months
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-2">Loading history...</span>
            </div>
          ) : error ? (
            <div className="p-4 text-center text-red-600">
              Error loading secure score history. Please try again.
            </div>
          ) : history && history.length > 0 ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500">Latest Score</h3>
                  <p className={`text-2xl font-bold ${getScoreColor(history[0].scorePercent)}`}>
                    {history[0].scorePercent.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDate(history[0].recordedAt)}
                  </p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500">Average Score</h3>
                  <p className={`text-2xl font-bold ${getScoreColor(averageScore)}`}>
                    {averageScore}%
                  </p>
                  <p className="text-xs text-gray-500">
                    Last {history.length} months
                  </p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500">Trend</h3>
                  <p className={`text-2xl font-bold ${
                    history[0].scorePercent > history[history.length - 1].scorePercent
                      ? "text-green-600"
                      : history[0].scorePercent < history[history.length - 1].scorePercent
                      ? "text-red-600"
                      : "text-gray-600"
                  }`}>
                    {history[0].scorePercent > history[history.length - 1].scorePercent
                      ? "Improving"
                      : history[0].scorePercent < history[history.length - 1].scorePercent
                      ? "Declining"
                      : "Stable"}
                  </p>
                  <p className="text-xs text-gray-500">
                    Based on historical data
                  </p>
                </div>
              </div>
              
              <div className="h-64 md:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis 
                      domain={[0, 100]} 
                      tickCount={6} 
                      width={40}
                      tick={{ fontSize: 12 }}
                      label={{ value: 'Score %', angle: -90, position: 'insideLeft', fontSize: 12 }}
                    />
                    <Tooltip 
                      formatter={(value: number) => [`${value.toFixed(1)}%`, 'Score']}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="scorePercent"
                      name="Secure Score %"
                      stroke="#4f46e5"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              <div className="text-sm text-gray-500">
                <p>Note: This chart shows the historical trend of your Microsoft 365 Secure Score. 
                Monthly snapshots are taken automatically at the end of each month.</p>
                <p className="mt-1">Use this data to track your security improvement journey over time.</p>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <p className="mb-2">No historical data available yet.</p>
              <p className="text-sm">
                Secure Score history snapshots are taken at the end of each month. 
                Check back later or contact your administrator for details.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}