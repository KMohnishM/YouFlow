import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981'];

const formatINR = (value: number) =>
  '₹' + value.toLocaleString('en-IN', { maximumFractionDigits: 0 });

interface Props {
  data: Array<{ name: string; value: number }>;
}

export default function AllocationChart({ data }: Props) {
  const filtered = data.filter(d => d.value > 0);

  if (filtered.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 dark:text-gray-500">
        <p className="text-sm">No investment data yet</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={filtered}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={85}
          paddingAngle={3}
          dataKey="value"
        >
          {filtered.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => [formatINR(value), '']}
          contentStyle={{
            background: 'rgba(255,255,255,0.9)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.4)',
            borderRadius: '12px',
            fontSize: '12px'
          }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span className="text-xs text-gray-600 dark:text-gray-400">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
