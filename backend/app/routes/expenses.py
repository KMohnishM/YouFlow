from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import extract, func
from sqlalchemy.orm import Session
from app.auth import get_current_user
from app.database import get_db
from app.models import Expense
from app.schemas import ExpenseCreate, ExpenseUpdate, ExpenseResponse

router = APIRouter()


def expense_to_response(e: Expense) -> ExpenseResponse:
    tags_list = [t.strip() for t in e.tags.split(",") if t.strip()] if e.tags else []
    return ExpenseResponse(
        id=e.id,
        amount=e.amount,
        category=e.category,
        reason=e.reason,
        date=e.date,
        tags=tags_list,
        created_at=e.created_at
    )


@router.get("")
def get_expenses(
    month: Optional[str] = None,  # YYYY-MM
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    query = db.query(Expense)
    if month:
        parts = month.split("-")
        if len(parts) == 2:
            try:
                year, mon = int(parts[0]), int(parts[1])
                query = query.filter(
                    extract("year", Expense.date) == year,
                    extract("month", Expense.date) == mon
                )
            except ValueError:
                pass
    if category:
        query = query.filter(Expense.category == category)
    if search:
        query = query.filter(Expense.reason.ilike(f"%{search}%"))

    expenses = query.order_by(Expense.date.desc()).all()
    return {
        "expenses": [expense_to_response(e) for e in expenses],
        "total": round(sum(e.amount for e in expenses), 2)
    }


@router.post("", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_expense(
    data: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    tags_str = ",".join(data.tags) if data.tags else ""
    expense = Expense(
        amount=data.amount,
        category=data.category,
        reason=data.reason,
        date=data.date,
        tags=tags_str
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense_to_response(expense)


@router.put("/{expense_id}", response_model=ExpenseResponse)
def update_expense(
    expense_id: int,
    data: ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")

    if data.amount is not None:
        expense.amount = data.amount
    if data.category is not None:
        expense.category = data.category
    if data.reason is not None:
        expense.reason = data.reason
    if data.date is not None:
        expense.date = data.date
    if data.tags is not None:
        expense.tags = ",".join(data.tags)

    db.commit()
    db.refresh(expense)
    return expense_to_response(expense)


@router.delete("/{expense_id}")
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")

    db.delete(expense)
    db.commit()
    return {"message": "Deleted successfully"}


@router.get("/summary")
def get_summary(
    month: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    query = db.query(Expense)
    if month:
        parts = month.split("-")
        if len(parts) == 2:
            try:
                year, mon = int(parts[0]), int(parts[1])
                query = query.filter(
                    extract("year", Expense.date) == year,
                    extract("month", Expense.date) == mon
                )
            except ValueError:
                pass

    expenses = query.all()
    by_category = {}
    for e in expenses:
        by_category[e.category] = round(by_category.get(e.category, 0.0) + e.amount, 2)

    return {
        "total": round(sum(e.amount for e in expenses), 2),
        "by_category": by_category,
        "count": len(expenses)
    }
