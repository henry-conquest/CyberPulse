import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js';

ChartJS.register(ArcElement, Tooltip);

interface RiskScoreChartProps {
  score: number;
  marginLeft?: number
}

const RiskScoreChart = ({ score, marginLeft }: RiskScoreChartProps) => {
  // Determine color based on score
  let scoreColor = '#10B981'; // green by default
  if (score < 40) {
    scoreColor = '#EF4444'; // red (Tailwind red-500)
  } else if (score < 70) {
    scoreColor = '#F59E0B'; // orange (Tailwind amber-500)
  }
  const data = {
    datasets: [
      {
        data: [score, 100 - score],
        backgroundColor: [scoreColor, '#E5E7EB'],
        borderWidth: 0,
      },
    ],
  };

  const options = {
    cutout: '75%', // size of inner hole
    responsive: true,
    plugins: {
      tooltip: { enabled: false },
    },
  };
  return (
    <div className={`relative w-32 h-32 ${marginLeft ? `ml-${marginLeft}` : ''} `}>
      <Doughnut data={data} options={options} />
      <div className="absolute inset-0 flex items-center justify-center text-xl font-bold text-${score-color}">
        {score}%
      </div>
    </div>
  );
};

export default RiskScoreChart;
