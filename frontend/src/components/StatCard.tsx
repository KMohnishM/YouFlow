import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import clsx from 'clsx';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'indigo' | 'emerald' | 'rose' | 'amber' | 'cyan';
}

const colorMap = {
  indigo: 'from-indigo-500 to-purple-600',
  emerald: 'from-emerald-400 to-teal-500',
  rose: 'from-rose-400 to-pink-500',
  amber: 'from-amber-400 to-orange-500',
  cyan: 'from-cyan-400 to-blue-500',
};

export default function StatCard({ title, value, subtitle, icon: Icon, trend, trendValue, color = 'indigo' }: StatCardProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-rose-500' : 'text-gray-400';

  return (
    <div className="glass-card p-5 hover:scale-[1.02] hover:shadow-2xl transition-all duration-300 cursor-default">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${colorMap[color]} shadow-lg`}>
          <Icon size={18} className="text-white" />
        </div>
        {trend && trendValue && (
          <div className={clsx('flex items-center gap-1 text-xs font-medium', trendColor)}>
            <TrendIcon size={14} />
            <span>{trendValue}</span>
          </div>
        )}
      </div>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{title}</p>
      <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-1">{value}</p>
      {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}
