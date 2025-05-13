import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, HelpCircle, Calendar } from "lucide-react";

type SecureScoreHistory = {
  id: number;
  tenantId: number;
  score: number;
  scorePercent: number;
  maxScore: number;
  recordedAt: string;
  reportQuarter: 1 | 2 | 3 | 4;
  reportYear: number;
};

interface SecureScoreTrendWidgetProps {
  tenantId: number;
  limit?: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 shadow-md rounded-md border border-gray-200">
        <p className="font-semibold text-sm">{format(new Date(data.recordedAt), "MMM d, yyyy")}</p>
        <p className="text-xs text-gray-600">Score: {data.score.toFixed(1)}</p>
        <p className="text-xs text-gray-600">Percentage: {data.scorePercent}%</p>
      </div>
    );
  }
  return null;
};

const getScoreColor = (percent: number) => {
  if (percent >= 70) return "#22c55e"; // green
  if (percent >= 40) return "#eab308"; // yellow
  return "#ef4444"; // red
};

const calculateTrend = (data: SecureScoreHistory[]) => {
  if (!data || data.length < 2) return { trend: "none", change: 0 };
  
  // Sort by date ascending
  const sortedData = [...data].sort((a, b) => 
    new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
  );
  
  const firstEntry = sortedData[0];
  const lastEntry = sortedData[sortedData.length - 1];
  
  const change = lastEntry.scorePercent - firstEntry.scorePercent;
  const trend = change > 0 ? "up" : change < 0 ? "down" : "none";
  
  return { trend, change: Math.abs(change) };
};

export default function SecureScoreTrendWidget({ tenantId, limit = 90 }: SecureScoreTrendWidgetProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/secure-score-history`, { limit }],
    enabled: !!tenantId
  });

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Secure Score Trend</CardTitle>
          <CardDescription>Historical secure score data</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-[300px]">
          <div className="text-center">
            <HelpCircle className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">Error Loading Data</h3>
            <p className="mt-1 text-sm text-gray-500">There was an error fetching the secure score history.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Secure Score Trend</CardTitle>
          <CardDescription>Historical secure score data</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          <Skeleton className="w-full h-[250px] rounded-md" />
        </CardContent>
      </Card>
    );
  }

  // No data state
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Secure Score Trend</CardTitle>
          <CardDescription>Historical secure score data</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-[300px]">
          <div className="text-center">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No History Available</h3>
            <p className="mt-1 text-sm text-gray-500">Secure score history will appear here as it is collected.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Process data for the chart
  const chartData = Array.isArray(data) ? [...data]
    .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())
    .map(item => ({
      ...item,
      formattedDate: format(new Date(item.recordedAt), "MMM d")
    })) : [];

  // Calculate trend
  const { trend, change } = calculateTrend(Array.isArray(data) ? data : []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg">Secure Score Trend</CardTitle>
          <CardDescription>Historical secure score data (last {chartData ? chartData.length : 0} days)</CardDescription>
        </div>
        {trend !== "none" && (
          <div className={`flex items-center ${trend === "up" ? "text-green-500" : "text-red-500"}`}>
            {trend === "up" ? (
              <TrendingUp className="h-4 w-4 mr-1" />
            ) : (
              <TrendingDown className="h-4 w-4 mr-1" />
            )}
            <span className="text-sm font-medium">
              {change.toFixed(1)}% {trend === "up" ? "increase" : "decrease"}
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={getScoreColor(chartData && chartData.length > 0 ? chartData[chartData.length - 1]?.scorePercent || 0 : 0)} stopOpacity={0.8} />
                <stop offset="95%" stopColor={getScoreColor(chartData && chartData.length > 0 ? chartData[chartData.length - 1]?.scorePercent || 0 : 0)} stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis 
              dataKey="formattedDate" 
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              tickFormatter={(value, index) => index % 14 === 0 ? value : ''}
            />
            <YAxis 
              domain={[0, 100]} 
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              label={{ value: 'Score %', angle: -90, position: 'insideLeft', style: { fontSize: 12, textAnchor: 'middle' } }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="scorePercent"
              stroke={getScoreColor(chartData && chartData.length > 0 ? chartData[chartData.length - 1]?.scorePercent || 0 : 0)}
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#scoreGradient)"
              activeDot={{ r: 6, stroke: "white", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}