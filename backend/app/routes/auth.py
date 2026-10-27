import time
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.auth import verify_password, create_access_token, get_current_user
from app.schemas import LoginRequest, TokenResponse

router = APIRouter()

# Simple in-memory rate limiting: username -> list of timestamp attempts
failed_attempts = {}


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    ip_key = request.username
    now = time.time()
    attempts = failed_attempts.get(ip_key, [])
    attempts = [t for t in attempts if now - t < 900]  # 15 min window
    if len(attempts) >= 5:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed attempts. Try again in 15 minutes."
        )

    user = db.query(User).filter(User.username == request.username).first()
    if not user or not verify_password(request.password, user.password_hash):
        attempts.append(now)
        failed_attempts[ip_key] = attempts
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )

    failed_attempts.pop(ip_key, None)
    token = create_access_token({"sub": user.username})
    return TokenResponse(access_token=token)


@router.get("/me")
def get_me(current_user: str = Depends(get_current_user)):
    return {"username": current_user}
