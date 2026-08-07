"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export type TrendPoint = {
  /** Label sumbu-x yang sudah diformat di server, mis. "24 Jul". */
  label: string;
  hadir: number;
  terlambat: number;
};

const chartConfig = {
  hadir: { label: "Hadir", color: "var(--chart-hadir)" },
  terlambat: { label: "Terlambat", color: "var(--chart-terlambat)" },
} satisfies ChartConfig;

export default function AttendanceTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto h-56 w-full [&_.recharts-cartesian-axis-tick_text]:text-[11px]"
    >
      <LineChart
        data={data}
        margin={{ top: 8, right: 8, bottom: 0, left: -20 }}
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" />

        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          interval="preserveStartEnd"
          minTickGap={24}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          allowDecimals={false}
          width={44}
        />

        <ChartTooltip
          cursor
          content={<ChartTooltipContent indicator="dot" />}
        />

        <Line
          dataKey="hadir"
          type="monotone"
          stroke="var(--color-hadir)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2 }}
        />
        <Line
          dataKey="terlambat"
          type="monotone"
          stroke="var(--color-terlambat)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2 }}
        />
      </LineChart>
    </ChartContainer>
  );
}
