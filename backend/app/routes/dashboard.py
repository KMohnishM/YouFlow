from datetime import date
from dateutil.relativedelta import relativedelta
from fastapi import APIRouter, Depends
from sqlalchemy import extract, func
from sqlalchemy.orm import Session
from app.auth import get_current_user
from app.database import get_db
from app.models import Expense, StockHolding, MFHolding, FD
from app.routes.stocks import get_current_price
from app.routes.mf import get_current_nav
from app.routes.fd import calculate_fd_details

router = APIRouter()


@router.get("/dashboard")
def get_dashboard(db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    today = date.today()
    this_month = today.replace(day=1)
    last_month_start = this_month - relativedelta(months=1)

    # This month expenses
    this_month_expenses = db.query(func.sum(Expense.amount)).filter(
        extract("year", Expense.date) == today.year,
        extract("month", Expense.date) == today.month
    ).scalar() or 0.0

    # Last month expenses
    last_month_expenses = db.query(func.sum(Expense.amount)).filter(
        extract("year", Expense.date) == last_month_start.year,
        extract("month", Expense.date) == last_month_start.month
    ).scalar() or 0.0

    # By category this month
    cat_data = db.query(Expense.category, func.sum(Expense.amount)).filter(
        extract("year", Expense.date) == today.year,
        extract("month", Expense.date) == today.month
    ).group_by(Expense.category).all()
    by_category = {cat: round(float(amt), 2) for cat, amt in cat_data}

    # Recent 5 expenses
    recent = db.query(Expense).order_by(Expense.date.desc()).limit(5).all()
    recent_expenses = [
        {
            "id": e.id,
            "amount": e.amount,
            "category": e.category,
            "reason": e.reason,
            "date": e.date.isoformat()
        }
        for e in recent
    ]

    # Last 6 months expense totals
    monthly_expenses = []
    for i in range(5, -1, -1):
        m = today.replace(day=1) - relativedelta(months=i)
        total = db.query(func.sum(Expense.amount)).filter(
            extract("year", Expense.date) == m.year,
            extract("month", Expense.date) == m.month
        ).scalar() or 0.0
        monthly_expenses.append({"month": m.strftime("%b %Y"), "total": round(float(total), 2)})

    # Stocks value
    stocks = db.query(StockHolding).all()
    stocks_value = sum(get_current_price(s.ticker) * s.quantity for s in stocks)

    # MF value
    mfs = db.query(MFHolding).all()
    mf_value = sum(get_current_nav(m.scheme_code) * m.units for m in mfs)

    # FD value
    fds = db.query(FD).all()
    fd_value = sum(calculate_fd_details(f)["maturity_amount"] for f in fds)

    net_worth = round(stocks_value + mf_value + fd_value, 2)

    asset_allocation = [
        {"name": "Stocks", "value": round(stocks_value, 2)},
        {"name": "Mutual Funds", "value": round(mf_value, 2)},
        {"name": "Fixed Deposits", "value": round(fd_value, 2)},
    ]

    return {
        "net_worth": {
            "total": net_worth,
            "stocks": round(stocks_value, 2),
            "mutual_funds": round(mf_value, 2),
            "fds": round(fd_value, 2)
        },
        "expense_summary": {
            "this_month": round(float(this_month_expenses), 2),
            "last_month": round(float(last_month_expenses), 2),
            "by_category": by_category
        },
        "recent_expenses": recent_expenses,
        "asset_allocation": asset_allocation,
        "monthly_expenses": monthly_expenses
    }
