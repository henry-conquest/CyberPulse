import { getSecureScores } from "@/service/CloudAndInfrastructureService";
import { getTenants } from "@/service/TenantService";
import { cloudAndInfrastructureActions, sessionInfoActions } from "@/store/store";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import { useDispatch, useSelector } from "react-redux";
import { Link, useParams } from "wouter";
import {
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

ChartJS.register(
  LineElement,
  LineController,
  PointElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);


const SecureScores = () => {
  const selectedClient = useSelector((state: any) => state?.sessionInfo?.selectedClient);
  const secureScores = useSelector((state: any) => state.cloudAndInfrastructure.secureScores);
  const userId = useSelector((state: any) => state?.sessionInfo?.user?.id);
  const { tenantId } = useParams();
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initialiseData = async () => {
      try {
        setLoading(true);

        if (tenantId && !selectedClient) {
          const tenants = await getTenants();
          const selectedTenant = tenants.find((t: any) => t.id === +tenantId);
          dispatch(sessionInfoActions.setTenants(tenants));
          dispatch(sessionInfoActions.setSelectedClient(selectedTenant));
        }

        if (userId) {
          const data = await getSecureScores(userId);
          dispatch(cloudAndInfrastructureActions.setSecureScores(data));
        }
      } catch (err) {
        console.error("Failed to fetch secure scores", err);
      } finally {
        setLoading(false);
      }
    };

    initialiseData();
  }, [tenantId, userId]);

  // Only compute if data is available
  const sortedData = secureScores?.length
    ? [...secureScores].sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
    : [];

  const labels = sortedData.map(d => d.month);
  const allSecureScores = sortedData.map(d => d.percentage);
  const allComparativeScores = sortedData.map(d => d.comparative);

  const chartData = {
    labels,
    datasets: [
      {
        label: "Secure Score (%)",
        data: allSecureScores,
        borderColor: "rgba(54, 162, 235, 1)",
        backgroundColor: "rgba(54, 162, 235, 0.2)",
        tension: 0.3,
      },
      {
        label: "Comparative Score (%)",
        data: allComparativeScores,
        borderColor: "rgba(255, 99, 132, 1)",
        backgroundColor: "rgba(255, 99, 132, 0.2)",
        tension: 0.3,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Secure Scores - Last 2 Years",
      },
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        title: {
          display: true,
          text: "Percentage (%)",
        },
      },
      x: {
        title: {
          display: true,
          text: "Month",
        },
      },
    },
  };

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

      <h1 className="text-3xl font-bold font-montserrat text-brand-teal mb-10 ml-6">
        {selectedClient?.name} Secure Score Trend
      </h1>

      <div className="ml-6 mr-6">
        {loading ? (
          <LoadingSpinner />
        ) : sortedData.length === 0 ? (
          <p>No secure score data available.</p>
        ) : (
          <Line data={chartData} options={options} />
        )}
      </div>
    </div>
  );
};

export default SecureScores;
