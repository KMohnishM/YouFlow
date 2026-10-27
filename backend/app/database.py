import os
import socket
from urllib.parse import urlparse
import dns.resolver
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

raw_db_url = settings.DATABASE_URL or os.environ.get("DATABASE_URL")

if not raw_db_url:
    raise RuntimeError("DATABASE_URL is not configured. Please provide a Neon PostgreSQL connection string in .env.")

if raw_db_url.startswith("postgres://"):
    raw_db_url = raw_db_url.replace("postgres://", "postgresql://", 1)

connect_args = {}
if "sslmode" not in raw_db_url:
    connect_args["sslmode"] = "require"

# Resolve hostname via public DNS if local router DNS fails to resolve Neon CNAME
try:
    parsed = urlparse(raw_db_url)
    hostname = parsed.hostname
    if hostname:
        try:
            socket.gethostbyname(hostname)
        except socket.gaierror:
            # Fallback to public DNS resolver
            resolver = dns.resolver.Resolver()
            resolver.nameservers = ["8.8.8.8", "1.1.1.1"]
            answers = resolver.resolve(hostname, "A")
            ip = answers[0].to_text()
            connect_args["hostaddr"] = ip
except Exception:
    pass

engine = create_engine(
    raw_db_url,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,  # Crucial for Neon serverless auto-suspend / connection pooling
    connect_args=connect_args
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from app.models import Base as ModelsBase, User
    from app.auth import get_password_hash

    # Create all tables on Neon Postgres
    ModelsBase.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if not db.query(User).first():
            user = User(
                username=settings.ADMIN_USERNAME,
                password_hash=get_password_hash(settings.ADMIN_PASSWORD)
            )
            db.add(user)
            db.commit()
    finally:
        db.close()
