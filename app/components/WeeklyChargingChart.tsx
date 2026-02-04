// app/components/WeeklyChargingChart.tsx
'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { WeeklyData } from '@/app/lib/chartUtils';
import { useTheme } from '../providers/ThemeProvider';

interface WeeklyChargingChartProps {
  data: WeeklyData[];
}

export default function WeeklyChargingChart({ data }: WeeklyChargingChartProps) {

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">
        Weekly Charging Activity
      </h3>
      <p className="text-sm text-stone-600 dark:text-stone-400 mb-4">
        Number of charging sessions over the last 7 days
      </p>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
          <XAxis 
            dataKey="day" 
            stroke="#6B7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="#806f6b"
            style={{ fontSize: '12px' }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#F3F4F6',
            }}
            labelStyle={{ color: isDark ? '#F3F4F6' : '#374151', fontWeight: 'bold' }}
            formatter={(value: number, name: string) => {
              if (name === 'sessions') return [value, 'Sessions'];
              if (name === 'hours') return [value.toFixed(1), 'Hours'];
              return [value, name];
            }}
          />
          <Bar dataKey="sessions" fill="#03AFD7" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}