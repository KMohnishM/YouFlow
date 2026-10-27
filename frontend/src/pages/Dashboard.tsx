import { useEffect, useState } from 'react';
import { TrendingUp, Receipt, BarChart2, Landmark, RefreshCw, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import StatCard from '../components/StatCard';
import AllocationChart from '../components/charts/AllocationChart';
import ExpenseChart from '../components/charts/ExpenseChart';
import { getDashboard } from '../api/dashboard';
import { getStocks } from '../api/stocks';
import { DashboardData, StockHolding } from '../types';
import { formatINR, formatDate, formatPercent } from '../utils/format';

const CATEGORY_COLORS: Record<string, string> = {
  'Food & Dining': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'Transportation': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Shopping': 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  'Entertainment': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'Healthcare': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'Utilities': 'bg-gray-100 text-gray-700 dark:bg-gray-700/30 dark:text-gray-400',
  'Rent': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  'Education': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  'Travel': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  'Personal Care': 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-400',
  'Investments': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'Other': 'bg-slate-100 text-slate-700 dark:bg-slate-700/30 dark:text-slate-400',
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [stocks, setStocks] = useState<StockHolding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setError(null);
      const [dashRes, stocksRes] = await Promise.all([
        getDashboard(),
        getStocks().catch(() => ({ data: { holdings: [] } })),
      ]);
      setData(dashRes.data);
      const stockList = Array.isArray(stocksRes.data)
        ? stocksRes.data
        : (stocksRes.data?.holdings || []);
      setStocks(stockList);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500" />
        <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">Loading financial intelligence...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="glass-card p-8 text-center max-w-md mx-auto my-12">
        <p className="text-rose-500 font-medium mb-3">{error || 'Something went wrong'}</p>
        <button onClick={handleRefresh} className="btn-primary inline-flex items-center gap-2 text-sm">
          <RefreshCw size={16} /> Try Again
        </button>
      </div>
    );
  }

  const { net_worth, expense_summary, recent_expenses, asset_allocation, monthly_expenses } = data;

  // Month over month expense diff
  const expenseDiff = expense_summary.last_month > 0
    ? ((expense_summary.this_month - expense_summary.last_month) / expense_summary.last_month) * 100
    : 0;
  const expenseTrend = expenseDiff > 0 ? 'down' : expenseDiff < 0 ? 'up' : 'neutral'; // Spending less is positive
  const expenseTrendValue = expense_summary.last_month > 0
    ? `${expenseDiff > 0 ? '+' : ''}${expenseDiff.toFixed(1)}% vs last mo`
    : 'No prev data';

  // Stock P&L summary
  const stockList = Array.isArray(stocks) ? stocks : [];
  const totalStockPnl = stockList.reduce((acc, s) => acc + (s.pnl || 0), 0);
  const totalStockInvested = stockList.reduce((acc, s) => acc + (s.invested || 0), 0);
  const stockPnlPercent = totalStockInvested > 0 ? (totalStockPnl / totalStockInvested) * 100 : 0;
  const stockTrend = totalStockPnl >= 0 ? 'up' : 'down';

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Overview</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Track your assets, expenses, and portfolio health</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn-secondary self-start sm:self-auto inline-flex items-center gap-2 text-xs"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Net Worth"
          value={formatINR(net_worth.total || 0)}
          subtitle={`Stocks + MFs + FDs`}
          icon={TrendingUp}
          color="indigo"
        />
        <StatCard
          title="This Month Expenses"
          value={formatINR(expense_summary.this_month || 0)}
          subtitle={`Last month: ${formatINR(expense_summary.last_month || 0)}`}
          icon={Receipt}
          trend={expenseTrend}
          trendValue={expenseTrendValue}
          color="rose"
        />
        <StatCard
          title="Stocks P&L"
          value={`${totalStockPnl >= 0 ? '+' : '-'}${formatINR(totalStockPnl)}`}
          subtitle={`Invested: ${formatINR(totalStockInvested)}`}
          icon={BarChart2}
          trend={stockTrend}
          trendValue={formatPercent(stockPnlPercent)}
          color={totalStockPnl >= 0 ? 'emerald' : 'rose'}
        />
        <StatCard
          title="Fixed Deposits"
          value={formatINR(net_worth.fds || 0)}
          subtitle="Total locked capital"
          icon={Landmark}
          color="cyan"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Asset Allocation */}
        <div className="lg:col-span-5 glass-card p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Asset Allocation</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Distribution across asset classes</p>
          </div>
          <div className="my-4">
            <AllocationChart data={asset_allocation || []} />
          </div>
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100/60 dark:border-slate-700/60 text-center">
            <div>
              <p className="text-[11px] text-gray-400 uppercase font-medium">Stocks</p>
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 mt-0.5">
                {formatINR(net_worth.stocks || 0)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400 uppercase font-medium">Mutual Funds</p>
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 mt-0.5">
                {formatINR(net_worth.mutual_funds || 0)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400 uppercase font-medium">Fixed Deposits</p>
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 mt-0.5">
                {formatINR(net_worth.fds || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* 6-Month Expense History */}
        <div className="lg:col-span-7 glass-card p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Spending Trends</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Monthly expenses over time</p>
          </div>
          <div className="my-4">
            {monthly_expenses && monthly_expenses.length > 0 ? (
              <ExpenseChart data={monthly_expenses} />
            ) : (
              <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
                No expense history available
              </div>
            )}
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-3 border-t border-gray-100/60 dark:border-slate-700/60">
            <span>Average: {monthly_expenses?.length ? formatINR(monthly_expenses.reduce((s, m) => s + m.total, 0) / monthly_expenses.length) : '₹0'} / month</span>
            <span>Total: {monthly_expenses ? formatINR(monthly_expenses.reduce((s, m) => s + m.total, 0)) : '₹0'}</span>
          </div>
        </div>
      </div>

      {/* Recent Expenses List */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Recent Transactions</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Latest 5 recorded expenses</p>
          </div>
        </div>

        {recent_expenses && recent_expenses.length > 0 ? (
          <div className="divide-y divide-gray-100/80 dark:divide-slate-700/50">
            {recent_expenses.slice(0, 5).map((expense) => {
              const badgeClass = CATEGORY_COLORS[expense.category] || CATEGORY_COLORS['Other'];
              return (
                <div key={expense.id} className="py-3.5 flex items-center justify-between gap-4 first:pt-1 last:pb-1">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap ${badgeClass}`}>
                      {expense.category}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                        {expense.reason || 'Expense'}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(expense.date)}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                      -{formatINR(expense.amount)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
            No expenses recorded yet. Head over to the Expenses tab to add one!
          </div>
        )}
      </div>
    </div>
  );
}
