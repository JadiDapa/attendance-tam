"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Role } from "@/generated/prisma";
import { ROLE_LABEL } from "@/lib/role";

const ROLE_COLOR: Record<Role, string> = {
  EMPLOYEE: "var(--color-chart-1)",
  ADMIN: "var(--color-chart-2)",
  SUPERVISOR: "var(--color-chart-3)",
  MANAGER: "var(--color-chart-4)",
};

const chartConfig = {
  value: { label: "Akun" },
  EMPLOYEE: { label: ROLE_LABEL.EMPLOYEE, color: ROLE_COLOR.EMPLOYEE },
  ADMIN: { label: ROLE_LABEL.ADMIN, color: ROLE_COLOR.ADMIN },
  SUPERVISOR: { label: ROLE_LABEL.SUPERVISOR, color: ROLE_COLOR.SUPERVISOR },
  MANAGER: { label: ROLE_LABEL.MANAGER, color: ROLE_COLOR.MANAGER },
} satisfies ChartConfig;

export default function WorkerRoleChart({
  countByRole,
}: {
  countByRole: Record<Role, number>;
}) {
  const roles = Object.keys(ROLE_LABEL) as Role[];

  const chartData = roles.map((role) => ({
    key: role,
    label: ROLE_LABEL[role],
    value: countByRole[role],
    fill: ROLE_COLOR[role],
  }));

  return (
    <ChartContainer config={chartConfig} className="h-64 w-full min-h-0 flex-1">
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
