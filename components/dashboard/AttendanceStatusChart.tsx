"use client";

import { Bar, BarChart, CartesianGrid, XAxis, Cell, LabelList } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export type AttendanceStatusDatum = {
  key: string;
  label: string;
  value: number;
};

const chartConfig = {
  value: { label: "Hari" },
  HADIR_DIKANTOR: {
    label: "Hadir di Kantor",
    color: "var(--color-chart-hadir)",
  },
  WFH: { label: "WFH", color: "var(--color-chart-1)" },
  DINAS_LUAR: { label: "Dinas Luar", color: "var(--color-chart-3)" },
  SAKIT: { label: "Sakit", color: "var(--color-chart-5)" },
  IZIN: { label: "Izin", color: "var(--color-chart-2)" },
  CUTI: { label: "Cuti", color: "var(--color-chart-4)" },
  ALFA: { label: "Alfa", color: "var(--color-destructive)" },
} satisfies ChartConfig;

export default function AttendanceStatusChart({
  data,
  total,
  totalLabel = "Total",
}: {
  data: AttendanceStatusDatum[];
  total: number;
  totalLabel?: string;
}) {
  const chartData = data.map((d) => ({
    ...d,
    fill: `var(--color-${d.key})`,
  }));

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {/* <div className="flex items-baseline justify-between">
        <span className="text-muted-foreground text-sm font-medium">
          {totalLabel}
        </span>
        <span className="text-2xl font-semibold">{total}</span>
      </div> */}

      <ChartContainer
        config={chartConfig}
        className="h-64 w-full min-h-0 flex-1"
      >
        <BarChart accessibilityLayer data={chartData} margin={{ top: 20 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
          />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel />}
          />
          <Bar dataKey="value" radius={8}>
            {chartData.map((entry) => (
              <Cell key={entry.key} fill={entry.fill} />
            ))}
            <LabelList
              dataKey="value"
              position="top"
              className="fill-foreground text-sm font-semibold"
            />
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
}
