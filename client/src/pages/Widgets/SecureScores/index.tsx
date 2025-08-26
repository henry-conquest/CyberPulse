import { getSecureScores } from "@/service/CloudAndInfrastructureService";
import { cloudAndInfrastructureActions, scoresActions } from "@/store/store";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import { useDispatch, useSelector } from "react-redux";
import { Link, useParams } from "wouter";
import 'chartjs-adapter-date-fns';
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
  Filler
} from 'chart.js';
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorResponseMessage from "@/components/ui/ErrorResponseMessage";
import { getAppScores, getDataScores, getIdentityScores } from "@/service/MicrosoftScoresService";

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

interface ScoreChartProps {
  id: "secure" | "identity" | "app" | "data";
  title: string;
}


const dataMap = {
  secure: {
    selector: (state: any) => state.cloudAndInfrastructure.secureScores,
    fetcher: getSecureScores,
    setAction: cloudAndInfrastructureActions.setSecureScores
  },
  identity: {
    selector: (state: any) => state.scores.identityScores,
    fetcher: getIdentityScores,
    setAction: scoresActions.setIdentityScores
  },
  app: {
    selector: (state: any) => state.scores.appScores,
    fetcher: getAppScores,
    setAction: scoresActions.setAppScores
  },
  data: {
    selector: (state: any) => state.scores.dataScores,
    fetcher: getDataScores,
    setAction: scoresActions.setDataScores
  }
} as const;


const ScoreChart = ({ id, title }: ScoreChartProps) => {
  const { tenantId } = useParams();
  const userId = useSelector((state: any) => state?.sessionInfo?.user?.id);
  const dispatch = useDispatch();

  const [labels, setLabels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // pick the right data/fetcher for this id
  const { selector, fetcher, setAction } = dataMap[id];
  const scores = useSelector(selector);

  useEffect(() => {
    const initialiseData = async () => {
      try {
        setLoading(true);
        setError(false);

        if (userId && tenantId) {
          const params = { userId, tenantId };
          const data = await fetcher(params);
          dispatch(setAction(data));
        }
      } catch (err) {
        console.error(`Failed to fetch ${id} scores`, err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    initialiseData();
  }, [id, tenantId, userId]);

  const sortedData = scores?.length
    ? [...scores].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    : [];

  useEffect(() => {
    if (sortedData.length > 1) {
      const labels = sortedData.map((d) => format(new Date(d.date), "yyyy-MM-dd"));
      setLabels(labels);
    }
  }, [sortedData]);

  const allScores = sortedData.map((d) => d.percentage);
  const allComparativeScores = sortedData.map((d) => d.comparative);

const chartData = {
  labels,
  datasets: [
    {
      label: `${title} (%)`,
      data: allScores,
      borderColor: "rgba(54, 162, 235, 1)",
      backgroundColor: "rgba(54, 162, 235, 0.2)",
      tension: 0.3,
    },
    ...(id === "secure" // Only include comparative dataset for secure score
      ? [
          {
            label: "Organisations of similar size (%)",
            data: allComparativeScores,
            borderColor: "rgba(255, 99, 132, 1)",
            backgroundColor: "rgba(255, 99, 132, 0.2)",
            tension: 0.3,
          },
        ]
      : []),
  ],
};


  const options = {
    responsive: true,
    plugins: {
      legend: { position: "top" as const },
      title: { display: true, text: `${title} - Last 2 Years` }
    },
    scales: {
      y: { min: 0, max: 100, title: { display: true, text: "Percentage (%)" } },
      x: {
        type: "time" as const,
        time: { unit: "month", tooltipFormat: "PPP" },
        title: { display: true, text: "Date" }
      }
    },
    animation: false
  };

  if (error && tenantId) {
    return <ErrorResponseMessage tenantId={tenantId} text={title} />;
  }

  return (
    <div>
      <div className="flex justify-between align-center ml-6 mr-6 mt-4 mb-12">
        <Link
          to={`/tenants/${tenantId}/details`}
          className="inline-flex items-center text-sm text-brand-teal hover:underline"
        >
          ← Back
        </Link>
        <span className="text-secondary-600">
          Last updated: {format(new Date(), "MMMM d, yyyy 'at' h:mm a")}
        </span>
      </div>

      <h1 className="text-3xl font-bold font-montserrat text-brand-teal mb-10 ml-6">{title}</h1>

      <div className="ml-6 mr-6">
        {loading ? (
          <LoadingSpinner />
        ) : sortedData.length === 0 ? (
          <p>No {title} data available.</p>
        ) : (
          <Line data={chartData} options={options} />
        )}
      </div>
    </div>
  );
};


export default ScoreChart;
