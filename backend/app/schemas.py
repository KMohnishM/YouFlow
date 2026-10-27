from datetime import date, datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict


# Auth
class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# Expense
class ExpenseCreate(BaseModel):
    amount: float
    category: str
    reason: str
    date: date
    tags: List[str] = []


class ExpenseUpdate(BaseModel):
    amount: Optional[float] = None
    category: Optional[str] = None
    reason: Optional[str] = None
    date: Optional[date] = None
    tags: Optional[List[str]] = None


class ExpenseResponse(BaseModel):
    id: int
    amount: float
    category: str
    reason: str
    date: date
    tags: List[str] = []
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# StockHolding
class StockCreate(BaseModel):
    ticker: str
    name: str = ""
    buy_price: float
    quantity: float
    buy_date: date
    exchange: str = "NSE"
    notes: str = ""


class StockResponse(BaseModel):
    id: int
    ticker: str
    name: str
    buy_price: float
    quantity: float
    buy_date: date
    exchange: str
    notes: str
    current_price: float
    current_value: float
    invested: float
    pnl: float
    pnl_percent: float

    model_config = ConfigDict(from_attributes=True)


class StockPortfolio(BaseModel):
    holdings: List[StockResponse]
    total_invested: float
    current_value: float
    total_pnl: float
    pnl_percent: float


# MFHolding
class MFCreate(BaseModel):
    scheme_code: str
    scheme_name: str
    buy_nav: float
    units: float
    buy_date: date


class MFResponse(BaseModel):
    id: int
    scheme_code: str
    scheme_name: str
    buy_nav: float
    units: float
    buy_date: date
    current_nav: float
    current_value: float
    invested: float
    pnl: float
    pnl_percent: float
    xirr: float

    model_config = ConfigDict(from_attributes=True)


class MFPortfolio(BaseModel):
    holdings: List[MFResponse]
    total_invested: float
    current_value: float
    total_pnl: float
    pnl_percent: float


# FD
class FDCreate(BaseModel):
    bank: str
    principal: float
    rate: float
    tenure_months: int
    start_date: date
    fd_number: str = ""
    notes: str = ""


class FDResponse(BaseModel):
    id: int
    bank: str
    principal: float
    rate: float
    tenure_months: int
    start_date: date
    fd_number: str
    notes: str
    is_active: bool
    maturity_date: date
    maturity_amount: float
    interest_earned: float
    total_interest: float
    days_to_maturity: int
    is_matured: bool

    model_config = ConfigDict(from_attributes=True)


# Dashboard
class AssetAllocation(BaseModel):
    name: str
    value: float


class MonthlyExpense(BaseModel):
    month: str
    total: float


class DashboardResponse(BaseModel):
    net_worth: Dict[str, float]  # {total, stocks, mutual_funds, fds}
    expense_summary: Dict[str, Any]  # {this_month, last_month, by_category}
    recent_expenses: List[Dict[str, Any]]
    asset_allocation: List[AssetAllocation]
    monthly_expenses: List[MonthlyExpense]
