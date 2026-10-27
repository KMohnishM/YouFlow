from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
import httpx
from sqlalchemy.orm import Session
from app.auth import get_current_user
from app.database import get_db
from app.models import StockHolding
from app.schemas import StockCreate

router = APIRouter()


def get_current_price(ticker: str) -> float:
    """Fetch live market price using Yahoo Finance's lightweight chart API."""
    try:
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?interval=1d&range=2d"
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
        with httpx.Client(timeout=8) as client:
            resp = client.get(url, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                result = data.get("chart", {}).get("result", [])
                if result:
                    meta = result[0].get("meta", {})
                    regular_price = meta.get("regularMarketPrice")
                    if regular_price is not None:
                        return float(regular_price)
                    # Fallback to indicators close price
                    indicators = result[0].get("indicators", {}).get("quote", [])
                    if indicators and "close" in indicators[0]:
                        closes = [c for c in indicators[0]["close"] if c is not None]
                        if closes:
                            return float(closes[-1])
    except Exception:
        pass
    return 0.0


def holding_to_dict(h: StockHolding, current_price: float) -> dict:
    invested = h.buy_price * h.quantity
    current_value = current_price * h.quantity if current_price > 0 else invested
    pnl = current_value - invested
    pnl_percent = (pnl / invested * 100) if invested > 0 else 0.0
    return {
        "id": h.id,
        "ticker": h.ticker,
        "name": h.name or h.ticker,
        "buy_price": h.buy_price,
        "quantity": h.quantity,
        "buy_date": h.buy_date.isoformat(),
        "exchange": h.exchange,
        "notes": h.notes or "",
        "current_price": round(current_price, 2),
        "current_value": round(current_value, 2),
        "invested": round(invested, 2),
        "pnl": round(pnl, 2),
        "pnl_percent": round(pnl_percent, 2),
    }


@router.get("")
def get_stocks(db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    holdings = db.query(StockHolding).all()
    result = []
    total_invested = 0.0
    current_value = 0.0

    for h in holdings:
        price = get_current_price(h.ticker)
        d = holding_to_dict(h, price)
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
        "pnl_percent": round(pnl_percent, 2),
    }


@router.post("", status_code=status.HTTP_201_CREATED)
def add_stock(
    data: StockCreate,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    h = StockHolding(
        ticker=data.ticker.upper(),
        name=data.name or data.ticker.upper(),
        buy_price=data.buy_price,
        quantity=data.quantity,
        buy_date=data.buy_date,
        exchange=data.exchange,
        notes=data.notes,
    )
    db.add(h)
    db.commit()
    db.refresh(h)
    price = get_current_price(h.ticker)
    return holding_to_dict(h, price)


@router.put("/{holding_id}")
def update_stock(
    holding_id: int,
    data: StockCreate,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    h = db.query(StockHolding).filter(StockHolding.id == holding_id).first()
    if not h:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stock holding not found")

    h.ticker = data.ticker.upper()
    h.name = data.name or data.ticker.upper()
    h.buy_price = data.buy_price
    h.quantity = data.quantity
    h.buy_date = data.buy_date
    h.exchange = data.exchange
    h.notes = data.notes

    db.commit()
    db.refresh(h)
    price = get_current_price(h.ticker)
    return holding_to_dict(h, price)


@router.delete("/{holding_id}")
def delete_stock(
    holding_id: int,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    h = db.query(StockHolding).filter(StockHolding.id == holding_id).first()
    if not h:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stock holding not found")

    db.delete(h)
    db.commit()
    return {"message": "Stock holding deleted successfully"}
