"use client";

import * as echarts from "echarts";
import { useEffect, useRef } from "react";
import type { EChartsOption } from "echarts";

interface ChartProps {
  option: EChartsOption;
  height?: number;
  className?: string;
}

export function Chart({ option, height = 280, className }: ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const chart = echarts.init(container);
    chartRef.current = chart;
    const observer = new ResizeObserver(() => {
      chart.resize();
    });
    observer.observe(container);
    return () => {
      observer.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    chartRef.current?.setOption(option, { notMerge: true });
  }, [option]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ height, width: "100%" }}
    />
  );
}

const AXIS_LABEL = {
  color: "#64748b",
  fontSize: 11,
} as const;

const SPLIT_LINE = {
  lineStyle: { color: "#1f2c38" },
} as const;

export const darkChartTheme = {
  tooltip: {
    trigger: "axis",
    backgroundColor: "#111a22",
    borderColor: "#1f2c38",
    textStyle: { color: "#e2e8f0", fontSize: 12 },
  },
  grid: { left: 48, right: 16, top: 24, bottom: 32 },
  xAxis: {
    type: "category",
    axisLine: { lineStyle: { color: "#1f2c38" } },
    axisLabel: AXIS_LABEL,
  },
  yAxis: {
    type: "value",
    splitLine: SPLIT_LINE,
    axisLabel: AXIS_LABEL,
  },
} as const;
