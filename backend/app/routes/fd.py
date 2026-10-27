from datetime import date
from dateutil.relativedelta import relativedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.auth import get_current_user
from app.database import get_db
from app.models import FD
from app.schemas import FDCreate

router = APIRouter()


def calculate_fd_details(fd: FD) -> dict:
    maturity_date = fd.start_date + relativedelta(months=fd.tenure_months)
    n = 4  # quarterly compounding
    t = fd.tenure_months / 12.0
    maturity_amount = fd.principal * ((1.0 + (fd.rate / (100.0 * n))) ** (n * t))
    total_interest = maturity_amount - fd.principal
    today = date.today()
    is_matured = today >= maturity_date
    days_to_maturity = max(0, (maturity_date - today).days)
    elapsed_days = (today - fd.start_date).days
    elapsed_years = min(max(0, elapsed_days) / 365.25, t)
    interest_earned = fd.principal * ((1.0 + (fd.rate / (100.0 * n))) ** (n * elapsed_years)) - fd.principal

    return {
        "id": fd.id,
        "bank": fd.bank,
        "principal": fd.principal,
        "rate": fd.rate,
        "tenure_months": fd.tenure_months,
        "start_date": fd.start_date.isoformat(),
        "fd_number": fd.fd_number or "",
        "notes": fd.notes or "",
        "is_active": fd.is_active,
        "maturity_date": maturity_date.isoformat(),
        "maturity_amount": round(maturity_amount, 2),
        "interest_earned": round(max(0.0, interest_earned), 2),
        "total_interest": round(total_interest, 2),
        "days_to_maturity": days_to_maturity,
        "is_matured": is_matured
    }


@router.get("")
def get_fds(db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    fds = db.query(FD).all()
    result = [calculate_fd_details(fd) for fd in fds]
    return {
        "fds": result,
        "total_invested": round(sum(f["principal"] for f in result), 2),
        "total_maturity": round(sum(f["maturity_amount"] for f in result), 2),
        "total_interest_earned": round(sum(f["interest_earned"] for f in result), 2),
        "total_interest": round(sum(f["total_interest"] for f in result), 2)
    }


@router.post("", status_code=status.HTTP_201_CREATED)
def add_fd(data: FDCreate, db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    fd = FD(
        bank=data.bank,
        principal=data.principal,
        rate=data.rate,
        tenure_months=data.tenure_months,
        start_date=data.start_date,
        fd_number=data.fd_number or "",
        notes=data.notes or ""
    )
    db.add(fd)
    db.commit()
    db.refresh(fd)
    return calculate_fd_details(fd)


@router.put("/{fd_id}")
def update_fd(
    fd_id: int,
    data: FDCreate,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    fd = db.query(FD).filter(FD.id == fd_id).first()
    if not fd:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="FD not found")

    fd.bank = data.bank
    fd.principal = data.principal
    fd.rate = data.rate
    fd.tenure_months = data.tenure_months
    fd.start_date = data.start_date
    fd.fd_number = data.fd_number or ""
    fd.notes = data.notes or ""
    db.commit()
    db.refresh(fd)
    return calculate_fd_details(fd)


@router.delete("/{fd_id}")
def delete_fd(fd_id: int, db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    fd = db.query(FD).filter(FD.id == fd_id).first()
    if not fd:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="FD not found")

    db.delete(fd)
    db.commit()
    return {"message": "Deleted"}
