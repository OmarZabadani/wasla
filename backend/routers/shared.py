from fastapi import APIRouter, Depends, HTTPException

from backend.lib.auth import current_user
from backend.lib.db import db
from backend.lib.matching import CITY_REGION, MAJORS, TRACKS, WEIGHTS
from backend.lib.profiles import opportunities_out
from backend.models.schemas import Meta, Notification, Opportunity, PublicStats, Question

router = APIRouter(tags=["shared"])


@router.get("/meta", response_model=Meta)
async def meta():
    return {"majors": MAJORS, "cities": list(CITY_REGION),
            "tracks": [{"key": k, "name": v["name"], "name_ar": v["name_ar"]} for k, v in TRACKS.items()],
            "weights": WEIGHTS}


@router.get("/public/stats", response_model=PublicStats)
async def public_stats():
    return {"students": await db.students.count_documents({}),
            "companies": await db.companies.count_documents({"approval_status": "approved"}),
            "opportunities": await db.opportunities.count_documents({"status": "open"}),
            "applications": await db.applications.count_documents({})}


@router.get("/public/opportunities", response_model=list[Opportunity])
async def public_opportunities():
    docs = await db.opportunities.find({"status": "open"}, {"_id": 0}).sort("created_at", -1).to_list(8)
    return await opportunities_out(docs)


@router.get("/questions", response_model=list[Question])
async def active_questions(_: dict = Depends(current_user)):
    return await db.questions.find({"active": True}, {"_id": 0}).sort("order", 1).to_list(200)


@router.get("/notifications", response_model=list[Notification])
async def notifications(user: dict = Depends(current_user)):
    return await db.notifications.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)


@router.patch("/notifications/{nid}/read", response_model=Notification)
async def mark_read(nid: str, user: dict = Depends(current_user)):
    res = await db.notifications.update_one({"id": nid, "user_id": user["id"]}, {"$set": {"read": True}})
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Notification not found")
    return await db.notifications.find_one({"id": nid}, {"_id": 0})


@router.post("/notifications/read-all")
async def mark_all_read(user: dict = Depends(current_user)):
    await db.notifications.update_many({"user_id": user["id"], "read": False}, {"$set": {"read": True}})
    return {"ok": True}
