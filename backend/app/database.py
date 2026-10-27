import os
import socket
from urllib.parse import urlparse
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

raw_db_url = settings.DATABASE_URL or os.environ.get("DATABASE_URL")

if not raw_db_url:
    raw_db_url = "sqlite:///./temp_fallback.db"

if raw_db_url.startswith("postgres://"):
    raw_db_url = raw_db_url.replace("postgres://", "postgresql://", 1)

connect_args = {}
if "sqlite" in raw_db_url:
    connect_args["check_same_thread"] = False
else:
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
                try:
                    import dns.resolver
                    res = dns.resolver.Resolver()
                    res.nameservers = ["8.8.8.8", "1.1.1.1"]
                    answers = res.resolve(hostname, "A")
                    ip = answers[0].to_text()
                    connect_args["hostaddr"] = ip
                except Exception:
                    pass
    except Exception:
        pass

engine = create_engine(
    raw_db_url,
    pool_size=10 if "sqlite" not in raw_db_url else 5,
    max_overflow=20 if "sqlite" not in raw_db_url else 10,
    pool_pre_ping=True,
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
