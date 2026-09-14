"use client";

import { Pie, PieChart } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const STATUS_COLOR: Record<"active" | "inactive", string> = {
  active: "var(--color-chart-hadir)",
  inactive: "var(--color-destructive)",
};

const chartConfig = {
  value: { label: "Akun" },
  active: { label: "Aktif", color: STATUS_COLOR.active },
  inactive: { label: "Nonaktif", color: STATUS_COLOR.inactive },
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

  const radius =
    Number(innerRadius) + (Number(outerRadius) - Number(innerRadius)) * 0.6;
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

export default function WorkerStatusChart({
  active,
  inactive,
}: {
  active: number;
  inactive: number;
}) {
  const total = active + inactive;

  const chartData = [
    { key: "active", label: "Aktif", value: active, fill: STATUS_COLOR.active },
    {
      key: "inactive",
      label: "Nonaktif",
      value: inactive,
      fill: STATUS_COLOR.inactive,
    },
  ];

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col items-center gap-4">
      <ChartContainer
        config={chartConfig}
        className="mx-auto h-56 w-full min-h-0 flex-1"
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

      <div className="flex w-full shrink-0 flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm">
        <div className="flex items-center gap-2">
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: STATUS_COLOR.active }}
          />
          <span className="text-muted-foreground">Aktif</span>(
          <span className="font-medium">{active}</span>)
        </div>

        <div className="flex items-center gap-2">
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: STATUS_COLOR.inactive }}
          />
          <span className="text-muted-foreground">Nonaktif</span>(
          <span className="font-medium">{inactive}</span>)
        </div>

        <span className="text-muted-foreground">Total {total}</span>
      </div>
    </div>
  );
}
