"use client";

import { Pie, PieChart } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { LeaveStatus } from "@/generated/prisma";
import { LEAVE_STATUS_LABEL } from "@/lib/leave";

const STATUS_COLOR: Record<LeaveStatus, string> = {
  PENDING: "var(--color-chart-terlambat)",
  APPROVED: "var(--color-chart-hadir)",
  REJECTED: "var(--color-destructive)",
};

const chartConfig = {
  value: { label: "Pengajuan" },
  PENDING: { label: LEAVE_STATUS_LABEL.PENDING, color: STATUS_COLOR.PENDING },
  APPROVED: {
    label: LEAVE_STATUS_LABEL.APPROVED,
    color: STATUS_COLOR.APPROVED,
  },
  REJECTED: {
    label: LEAVE_STATUS_LABEL.REJECTED,
    color: STATUS_COLOR.REJECTED,
  },
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

export default function LeaveStatusChart({
  countByStatus,
}: {
  countByStatus: Record<LeaveStatus, number>;
}) {
  const statuses = Object.keys(LEAVE_STATUS_LABEL) as LeaveStatus[];
  const total = statuses.reduce((sum, status) => sum + countByStatus[status], 0);

  const chartData = statuses.map((status) => ({
    key: status,
    label: LEAVE_STATUS_LABEL[status],
    value: countByStatus[status],
    fill: STATUS_COLOR[status],
  }));

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <ChartContainer
        config={chartConfig}
        className="mx-auto aspect-square max-h-[220px] w-full"
      >
        <PieChart>
          <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
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

      <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
        {statuses.map((status) => (
          <div key={status} className="flex items-center gap-2">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: STATUS_COLOR[status] }}
            />
            <span className="text-muted-foreground">
              {LEAVE_STATUS_LABEL[status]}
            </span>
            (<span className="font-medium">{countByStatus[status]}</span>)
          </div>
        ))}

        <span className="text-muted-foreground">Total {total}</span>
      </div>
    </div>
  );
}
