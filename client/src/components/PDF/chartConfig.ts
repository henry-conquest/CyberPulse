// chartConfig.ts
import { ChartConfiguration } from "chart.js";

export const getMaturityChartConfig = (
  labels: string[],
  data: number[]
): ChartConfiguration<"line"> => ({
  type: "line",
  data: {
    labels,
    datasets: [
      {
        label: "Maturity Score %",
        data,
        borderColor: "#006666",
        backgroundColor: "rgba(0, 102, 102, 0.2)",
        fill: true,
        tension: 0.3,
        pointRadius: 5,
        pointBackgroundColor: "#006666",
      },
    ],
  },
  options: {
    responsive: false,
    animation: false,
    maintainAspectRatio: true,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: {
          stepSize: 10,
        },
        grid: { color: "#cccccc" },
      },
      x: {
        grid: { display: false },
      },
    },
  },
  
});
