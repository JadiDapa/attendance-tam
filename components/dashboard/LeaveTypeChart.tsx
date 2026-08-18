"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { LeaveType } from "@/generated/prisma";
import { LEAVE_TYPE_LABEL } from "@/lib/leave";

const chartConfig = {
  value: { label: "Pengajuan" },
  IZIN: { label: LEAVE_TYPE_LABEL.IZIN, color: "var(--color-chart-2)" },
  SAKIT: { label: LEAVE_TYPE_LABEL.SAKIT, color: "var(--color-chart-5)" },
  CUTI: { label: LEAVE_TYPE_LABEL.CUTI, color: "var(--color-chart-4)" },
} satisfies ChartConfig;

export default function LeaveTypeChart({
  countByType,
}: {
  countByType: Record<LeaveType, number>;
}) {
  const chartData = (Object.keys(LEAVE_TYPE_LABEL) as LeaveType[]).map(
    (type) => ({
      key: type,
      label: LEAVE_TYPE_LABEL[type],
      value: countByType[type],
      fill: `var(--color-${type})`,
    }),
  );

  return (
    <ChartContainer config={chartConfig} className="h-64 w-full">
      <BarChart accessibilityLayer data={chartData} margin={{ top: 20 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} tickMargin={10} axisLine={false} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
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
  );
}
