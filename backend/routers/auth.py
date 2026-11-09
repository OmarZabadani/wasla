import uuid

from fastapi import APIRouter, Depends, HTTPException, Response

from backend.lib.auth import clear_session, current_user, hash_password, set_session, verify_password
from backend.lib.db import db
from backend.lib.notify import notify, now_iso
from backend.models.schemas import LoginIn, MeOut, RegisterIn, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


def _user_out(u: dict) -> UserOut:
    return UserOut(**{k: u[k] for k in UserOut.model_fields})


async def _me(user: dict) -> MeOut:
    company_status = None
    if user["role"] == "company":
        c = await db.companies.find_one({"user_id": user["id"]}, {"approval_status": 1})
        company_status = c["approval_status"] if c else None
    unread = await db.notifications.count_documents({"user_id": user["id"], "read": False})
    return MeOut(user=_user_out(user), company_status=company_status, unread=unread)


@router.post("/register", response_model=MeOut)
async def register(body: RegisterIn, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="Email already registered")
    user = {"id": str(uuid.uuid4()), "name": body.name.strip(), "email": email,
            "password_hash": hash_password(body.password), "role": body.role, "status": "active",
            "created_at": now_iso()}
    await db.users.insert_one(dict(user))
    if body.role == "student":
        await db.students.insert_one({
            "id": str(uuid.uuid4()), "user_id": user["id"], "name": user["name"], "email": email,
            "university_id": body.university_id, "major": body.major, "city": body.city, "phone": "",
            "year_level": 3, "bio": "", "languages": [], "courses": [], "external_courses": [], "skills": [],
            "projects": [], "interests": [], "answers": {}, "generated": False,
        })
    else:
        if not body.company_name.strip():
            await db.users.delete_one({"id": user["id"]})
            raise HTTPException(status_code=422, detail="Company name is required")
        await db.companies.insert_one({
            "id": str(uuid.uuid4()), "user_id": user["id"], "company_name": body.company_name.strip(),
            "industry": body.industry, "city": body.city, "description": "", "website": "", "size": "",
            "approval_status": "pending", "created_at": now_iso(),
        })
        async for admin in db.users.find({"role": "admin"}, {"id": 1}):
            await notify(admin["id"], "New company registration",
                         f"{body.company_name} is waiting for approval.", "/admin?tab=companies", "company")
    set_session(response, user["id"])
    return await _me(user)


@router.post("/login", response_model=MeOut)
async def login(body: LoginIn, response: Response):
    user = await db.users.find_one({"email": body.email.lower()}, {"_id": 0})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if user["status"] != "active":
        raise HTTPException(status_code=403, detail="Account suspended")
    set_session(response, user["id"])
    return await _me(user)


@router.post("/logout")
async def logout(response: Response):
    clear_session(response)
    return {"ok": True}


@router.get("/me", response_model=MeOut)
async def me(user: dict = Depends(current_user)):
    return await _me(user)
