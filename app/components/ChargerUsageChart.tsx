"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChargerUsageData } from "../lib/chartUtils";
import { useTheme } from "../providers/ThemeProvider";

interface ChargerUsageChartProps {
  data: ChargerUsageData[];
}

const COLORS = ["#03AFD7", "#b3340a", "#10b981", "#f59e0b"];

export default function ChargerUsageChart({ data }: ChargerUsageChartProps) {
  const mostUsedCharger = data.reduce(
    (max, charger) => (charger.sessions > max.sessions ? charger : max),
    data[0]);

    const { theme } = useTheme();
    const isDark = theme === 'dark';

  return (
    <div className='bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg p-6'>
      <h3 className='text-lg. font-semibold text-foreground mb-4'>
        Charger Usage Distribution
      </h3>
      <p className='text-sm text-stone-600 dark:text-stone-400 mb-4'>
        Total sessions per charger
      </p>
      <ResponsiveContainer width='100%' height={250}>
        <BarChart data={data} layout='vertical'>
          <CartesianGrid strokeDasharray='3 3' stroke='#374151' opacity={0.2} />
          <XAxis
            type='number'
            stroke='#6B7280'
            style={{ fontSize: "12px" }}
            allowDecimals={false}
          />

          <YAxis
            type='category'
            dataKey='charger'
            stroke='#6B7280'
            style={{ fontSize: "12px" }}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
              border: "1px solid #374151",
              borderRadius: "8px",
              color: "#F3F4F6",
            }}
            labelStyle={{ color: isDark ? '#F3F4F6' : '#374151', fontWeight: "bold" }}
            itemStyle={{ color: "#03AFD7" }}
            formatter={(value: number, name: string) => {
              if (name === "sessions") return [value, "Sessions"];
              if (name === "totalHours")
                return [value.toFixed(1), "Total Hours"];
              return [value, name];
            }}
          />

          <Bar
            dataKey='sessions'
            radius={[0, 8, 8, 0]}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className='mt-4 pt-4 border-t border-stone-200 dark:border-stone-700'>
        <p className='text-sm text-stone-600 dark:text-stone-400'>
          <span className='font-semibold text-foreground'>
            {mostUsedCharger.charger}
          </span>{" "}
          is most popular with{" "}
          <span className='font-semibold text-foreground'>
            {mostUsedCharger.sessions} sessions
          </span>
          {mostUsedCharger.totalHours > 0 && (
            <span> ({mostUsedCharger.totalHours} hours total)</span>
          )}
        </p>
      </div>
    </div>
  );
}
