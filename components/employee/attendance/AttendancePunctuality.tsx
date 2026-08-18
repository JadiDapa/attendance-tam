"use client";

import { Pie, PieChart } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const PUNCTUALITY_COLOR: Record<"onTime" | "late", string> = {
  onTime: "var(--color-chart-1)",
  late: "var(--color-chart-4)",
};

const chartConfig = {
  value: { label: "Hari" },
  onTime: { label: "Tepat Waktu", color: PUNCTUALITY_COLOR.onTime },
  late: { label: "Terlambat", color: PUNCTUALITY_COLOR.late },
} satisfies ChartConfig;

const RADIAN = Math.PI / 180;

function renderSliceLabel({
  cx = 0,
  cy = 0,
  midAngle = 0,
  innerRadius = 0,
  outerRadius = 0,
  value = 0,
  percent = 0,
}: {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  value?: number;
  percent?: number;
}) {
  if (!value) return null;

  const radius = Number(innerRadius) + (Number(outerRadius) - Number(innerRadius)) * 0.6;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      className="fill-white"
    >
      <tspan x={x} dy="-0.35em" className="text-base font-bold">
        {value}
      </tspan>
      <tspan x={x} dy="1.2em" className="text-xs font-medium opacity-90">
        {Math.round(percent * 100)}%
      </tspan>
    </text>
  );
}

export default function AttendancePunctuality({
  onTime,
  late,
}: {
  onTime: number;
  late: number;
}) {
  const total = onTime + late;

  const chartData = [
    {
      key: "onTime",
      label: "Tepat Waktu",
      value: onTime,
      fill: PUNCTUALITY_COLOR.onTime,
    },
    {
      key: "late",
      label: "Terlambat",
      value: late,
      fill: PUNCTUALITY_COLOR.late,
    },
  ];

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <ChartContainer
        config={chartConfig}
        className="mx-auto aspect-square max-h-[220px] w-full"
      >
        <PieChart>
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel />}
          />
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="key"
            stroke="0"
            label={renderSliceLabel}
            labelLine={false}
          />
        </PieChart>
      </ChartContainer>

      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: PUNCTUALITY_COLOR.onTime }}
          />
          <span className="text-muted-foreground">Tepat Waktu</span>(
          <span className="font-medium">{onTime}</span>)
        </div>

        <div className="flex items-center gap-2">
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: PUNCTUALITY_COLOR.late }}
          />
          <span className="text-muted-foreground">Terlambat</span>(
          <span className="font-medium">{late}</span>)
        </div>

        <span className="text-muted-foreground ml-auto">Total {total}</span>
      </div>
    </div>
  );
}
