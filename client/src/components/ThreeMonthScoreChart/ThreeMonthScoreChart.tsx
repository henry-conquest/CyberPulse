import { useEffect, useMemo, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { useDispatch, useSelector } from 'react-redux';
import { format } from 'date-fns';
import {
  TimeScale,
  Chart as ChartJS,
  LineElement,
  LineController,
  PointElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorResponseMessage from '@/components/ui/ErrorResponseMessage';
import { getLastThreeMonthsData, splitScoreData } from '@/helpers/pdfHelper';
import { getTenantScoreHistory } from '@/service/TenantService';
import { scoresActions } from '@/store/store';
import { Link, useParams } from 'wouter';

ChartJS.register(
  LineElement,
  LineController,
  PointElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale
);

interface ThreeMonthScoreChartProps {
  id: 'secure' | 'maturity';
  title: string;
  totalScorePct?: string;
  microsoftSecureScorePct?: string;
}

const ThreeMonthScoreChart = ({ id, title }: ThreeMonthScoreChartProps) => {
  const scoreHistory = useSelector((state: any) => state.scores.scoresHistory);
  const [labels, setLabels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const dispatch = useDispatch();
  const { tenantId } = useParams();

  const fetchScoreHistory = async () => {
    if (!tenantId) return;
    try {
      const data = await getTenantScoreHistory(tenantId);
      dispatch(scoresActions.setScoresHistory(data));
    } catch (err) {
      console.log('problem getting score history');
    }
  };

  useEffect(() => {
    fetchScoreHistory();
  }, []);

  // Prepare data
  const chartDataValues = useMemo(() => {
    try {
      console.log('score hist', scoreHistory);
      if (!scoreHistory?.length) return [];

      const last3Months = getLastThreeMonthsData(scoreHistory);
      const { maturityResult, secureResult } = splitScoreData(last3Months);
      console.log('mat res', maturityResult);

      const dataSet = id === 'secure' ? secureResult : maturityResult;

      const sorted = [...dataSet].sort((a, b) => new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime());

      console.log('sorted', sorted);

      setLabels(sorted.map((d) => format(new Date(d.lastUpdated), 'yyyy-MM-01')));

      return sorted.map((d) => d.totalScorePct || d.microsoftSecureScorePct);
    } catch (err) {
      console.error('Error preparing chart data', err);
      setError(true);
      return [];
    } finally {
      setLoading(false);
    }
  }, [scoreHistory, id]);

  const data = {
    labels,
    datasets: [
      {
        label: `${title} (%)`,
        data: chartDataValues,
        borderColor: 'rgba(54, 162, 235, 1)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        tension: 0.3,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: true, text: `${title} - 3 Month Average Performance` },
    },
    scales: {
      y: { min: 0, max: 100, title: { display: true, text: 'Percentage (%)' } },
      x: {
        type: 'time' as const,
        time: { unit: 'month', tooltipFormat: 'MMM yyyy' },
        title: { display: true, text: 'Month' },
      },
    },
  };

  if (error) {
    return <p>error</p>;
  }

  return (
    <div className="ml-6 mr-6 mt-4">
      <Link
        to={`/tenants/${tenantId}/details`}
        className="inline-flex items-center text-sm text-brand-teal hover:underline"
      >
        ← Back
      </Link>
      {loading ? (
        <LoadingSpinner />
      ) : chartDataValues.length === 0 ? (
        <p>No {title} data available.</p>
      ) : (
        <Line data={data} options={options} />
      )}
    </div>
  );
};

export default ThreeMonthScoreChart;
