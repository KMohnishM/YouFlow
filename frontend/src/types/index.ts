export interface Expense {
  id: number;
  amount: number;
  category: string;
  reason: string;
  date: string;
  tags: string[];
  created_at: string;
}

export interface StockHolding {
  id: number;
  ticker: string;
  name: string;
  buy_price: number;
  quantity: number;
  buy_date: string;
  exchange: string;
  notes: string;
  current_price: number;
  current_value: number;
  invested: number;
  pnl: number;
  pnl_percent: number;
}

export interface MFHolding {
  id: number;
  scheme_code: string;
  scheme_name: string;
  buy_nav: number;
  units: number;
  buy_date: string;
  current_nav: number;
  current_value: number;
  invested: number;
  pnl: number;
  pnl_percent: number;
  xirr: number;
}

export interface FD {
  id: number;
  bank: string;
  principal: number;
  rate: number;
  tenure_months: number;
  start_date: string;
  fd_number: string;
  notes: string;
  is_active: boolean;
  maturity_date: string;
  maturity_amount: number;
  interest_earned: number;
  total_interest: number;
  days_to_maturity: number;
  is_matured: boolean;
}

export interface DashboardData {
  net_worth: {
    total: number;
    stocks: number;
    mutual_funds: number;
    fds: number;
  };
  expense_summary: {
    this_month: number;
    last_month: number;
    by_category: Record<string, number>;
  };
  recent_expenses: Array<{
    id: number;
    amount: number;
    category: string;
    reason: string;
    date: string;
  }>;
  asset_allocation: Array<{ name: string; value: number }>;
  monthly_expenses: Array<{ month: string; total: number }>;
}
