import React, { useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";
import { getMaturityChartConfig } from "./chartConfig";

Chart.register(...registerables);

export const MaturityChart = ({ data, labels }: { data: number[]; labels: string[] }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    if (chartRef.current) chartRef.current.destroy();

    chartRef.current = new Chart(ctx, getMaturityChartConfig(labels, data));

    return () => chartRef.current?.destroy();
  }, [data, labels]);

  return <canvas ref={canvasRef} width={600} height={400} />;
};
