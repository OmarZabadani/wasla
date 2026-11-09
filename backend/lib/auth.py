"""Password hashing, JWT session cookie, and role dependencies (RBAC; ownership checks live in routers)."""

import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, Request, Response

from backend.lib.db import db

COOKIE = "wasla_session"
SECRET = os.environ.get("JWT_SECRET", "dev-only-secret")
TTL_DAYS = 7


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 200_000).hex()
    return f"{salt}${dk}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt, dk = stored.split("$", 1)
    except ValueError:
        return False
    check = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 200_000).hex()
    return hmac.compare_digest(check, dk)


def set_session(response: Response, user_id: str) -> None:
    token = jwt.encode(
        {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=TTL_DAYS)}, SECRET, algorithm="HS256"
    )
    response.set_cookie(COOKIE, token, httponly=True, samesite="lax", max_age=TTL_DAYS * 86400, path="/")


def clear_session(response: Response) -> None:
    response.delete_cookie(COOKIE, path="/")


async def current_user(request: Request) -> dict:
    token = request.cookies.get(COOKIE)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Session expired")
    # Re-read from the source of truth each request so suspension takes effect immediately.
    user = await db.users.find_one({"id": payload.get("sub")}, {"_id": 0, "password_hash": 0})
    if not user or user.get("status") != "active":
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


def require_role(*roles: str):
    async def dep(user: dict = Depends(current_user)) -> dict:
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Forbidden")
        return user

    return dep
