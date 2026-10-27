from sqlalchemy import Column, Integer, Float, String, Boolean, Date, DateTime, func
from app.database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=func.now())


class Expense(Base):
    __tablename__ = "expenses"
    id = Column(Integer, primary_key=True)
    amount = Column(Float, nullable=False)
    category = Column(String, nullable=False)
    reason = Column(String, nullable=False)  # "Why I spent this"
    date = Column(Date, nullable=False)
    tags = Column(String, default="")  # comma-separated
    created_at = Column(DateTime, default=func.now())


class StockHolding(Base):
    __tablename__ = "stock_holdings"
    id = Column(Integer, primary_key=True)
    ticker = Column(String, nullable=False)  # e.g., RELIANCE.NS
    name = Column(String, default="")
    buy_price = Column(Float, nullable=False)
    quantity = Column(Float, nullable=False)
    buy_date = Column(Date, nullable=False)
    exchange = Column(String, default="NSE")  # NSE or BSE
    notes = Column(String, default="")
    created_at = Column(DateTime, default=func.now())


class MFHolding(Base):
    __tablename__ = "mf_holdings"
    id = Column(Integer, primary_key=True)
    scheme_code = Column(String, nullable=False)
    scheme_name = Column(String, nullable=False)
    buy_nav = Column(Float, nullable=False)
    units = Column(Float, nullable=False)
    buy_date = Column(Date, nullable=False)
    created_at = Column(DateTime, default=func.now())


class FD(Base):
    __tablename__ = "fds"
    id = Column(Integer, primary_key=True)
    bank = Column(String, nullable=False)
    principal = Column(Float, nullable=False)
    rate = Column(Float, nullable=False)  # annual % rate
    tenure_months = Column(Integer, nullable=False)
    start_date = Column(Date, nullable=False)
    fd_number = Column(String, default="")
    notes = Column(String, default="")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
