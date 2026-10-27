from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, status
import httpx
from scipy.optimize import brentq
from sqlalchemy.orm import Session
from app.auth import get_current_user
from app.database import get_db
from app.models import MFHolding
from app.schemas import MFCreate

router = APIRouter()


def calculate_xirr(buy_nav: float, units: float, current_nav: float, buy_date: date) -> float:
    invested = buy_nav * units
    current = current_nav * units
    today = date.today()
    days = (today - buy_date).days
    if days <= 0 or invested <= 0:
        return 0.0
    try:
        def npv(rate):
            t1 = 0.0
            t2 = days / 365.0
            return -invested / ((1.0 + rate) ** t1) + current / ((1.0 + rate) ** t2)

        result = brentq(npv, -0.999, 100.0)
        return round(float(result) * 100.0, 2)
    except Exception:
        return 0.0


def get_current_nav(scheme_code: str) -> float:
    try:
        with httpx.Client(timeout=10) as client:
            resp = client.get(f"https://api.mfapi.in/mf/{scheme_code}")
            if resp.status_code == 200:
                data = resp.json()
                if data.get("data"):
                    return float(data["data"][0]["nav"])
    except Exception:
        pass
    return 0.0


def holding_to_dict(h: MFHolding, current_nav: float) -> dict:
    invested = h.buy_nav * h.units
    current_value = current_nav * h.units
    pnl = current_value - invested
    pnl_percent = (pnl / invested * 100) if invested > 0 else 0.0
    xirr = calculate_xirr(h.buy_nav, h.units, current_nav, h.buy_date)
    return {
        "id": h.id,
        "scheme_code": h.scheme_code,
        "scheme_name": h.scheme_name,
        "buy_nav": h.buy_nav,
        "units": h.units,
        "buy_date": h.buy_date.isoformat(),
        "current_nav": round(current_nav, 4),
        "current_value": round(current_value, 2),
        "invested": round(invested, 2),
        "pnl": round(pnl, 2),
        "pnl_percent": round(pnl_percent, 2),
        "xirr": xirr
    }


@router.get("/search")
def search_funds(q: str = Query(..., min_length=2), current_user: str = Depends(get_current_user)):
    try:
        with httpx.Client(timeout=10) as client:
            resp = client.get(f"https://api.mfapi.in/mf/search?q={q}")
            if resp.status_code == 200:
                data = resp.json()
                return {
                    "funds": [
                        {
                            "scheme_code": str(f.get("schemeCode")),
                            "scheme_name": f.get("schemeName")
                        }
                        for f in data[:20]
                    ]
                }
    except Exception:
        pass
    return {"funds": []}


@router.get("")
def get_mf(db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    holdings = db.query(MFHolding).all()
    result = []
    total_invested = 0.0
    current_value = 0.0
    for h in holdings:
        nav = get_current_nav(h.scheme_code)
        d = holding_to_dict(h, nav)
        result.append(d)
        total_invested += d["invested"]
        current_value += d["current_value"]

    total_pnl = current_value - total_invested
    pnl_percent = (total_pnl / total_invested * 100) if total_invested > 0 else 0.0
    return {
        "holdings": result,
        "total_invested": round(total_invested, 2),
        "current_value": round(current_value, 2),
        "total_pnl": round(total_pnl, 2),
        "pnl_percent": round(pnl_percent, 2)
    }


@router.post("", status_code=status.HTTP_201_CREATED)
def add_mf(data: MFCreate, db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    h = MFHolding(
        scheme_code=data.scheme_code,
        scheme_name=data.scheme_name,
        buy_nav=data.buy_nav,
        units=data.units,
        buy_date=data.buy_date
    )
    db.add(h)
    db.commit()
    db.refresh(h)
    nav = get_current_nav(h.scheme_code)
    return holding_to_dict(h, nav)


@router.put("/{holding_id}")
def update_mf(
    holding_id: int,
    data: MFCreate,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    h = db.query(MFHolding).filter(MFHolding.id == holding_id).first()
    if not h:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    h.scheme_code = data.scheme_code
    h.scheme_name = data.scheme_name
    h.buy_nav = data.buy_nav
    h.units = data.units
    h.buy_date = data.buy_date
    db.commit()
    db.refresh(h)
    nav = get_current_nav(h.scheme_code)
    return holding_to_dict(h, nav)


@router.delete("/{holding_id}")
def delete_mf(holding_id: int, db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    h = db.query(MFHolding).filter(MFHolding.id == holding_id).first()
    if not h:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    db.delete(h)
    db.commit()
    return {"message": "Deleted"}
