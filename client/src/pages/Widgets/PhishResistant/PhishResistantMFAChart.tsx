import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { EvaluatedMethod } from '@/models/IdentitiesAndPeopleModel';

ChartJS.register(ArcElement, Tooltip, Legend);

interface MFARecommendationsChartProps {
  data: {
    toEnable: EvaluatedMethod[];
    toDisable: EvaluatedMethod[];
    enhance: EvaluatedMethod[];
    correct: EvaluatedMethod[];
  };
}

// Colors: orange for recommendations, green for correct
const COLORS = ['#10b981', '#f59e0b'];

const PhishResistantMFAChart = ({ data }: MFARecommendationsChartProps) => {
  const recommendationsCount = data.toEnable.length + data.toDisable.length + data.enhance.length;
  const correctCount = data.correct.length;

  const chartData = {
    labels: ['Correct', 'Recommendations'],
    datasets: [
      {
        data: [correctCount, recommendationsCount],
        backgroundColor: COLORS,
        borderWidth: 0,
      },
    ],
  };

  const options = {
    cutout: '70%',
    plugins: {
      tooltip: {
        callbacks: {
          label: function (context: any) {
            const label = context.label || '';
            const value = context.parsed || 0;
            return `${label}: ${value}`;
          },
        },
      },
      legend: {
        display: false,
        position: 'bottom' as const,
        labels: {
          boxWidth: 12,
          padding: 16,
          font: {
            size: 12,
          },
        },
      },
    },
    responsive: true,
    maintainAspectRatio: false,
  };

  return (
    <div className="relative w-32 h-32">
      <Doughnut data={chartData} options={options} />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-sm">
        <span className="font-bold text-gray-700 text-2xl">{recommendationsCount}</span>
        <span className="text-gray-700 text-[8px] font-bold">Recommendations</span>
      </div>
    </div>
  );
};

export default PhishResistantMFAChart;
