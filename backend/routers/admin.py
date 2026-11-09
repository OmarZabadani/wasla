import uuid
from collections import Counter

from fastapi import APIRouter, Depends, HTTPException

from backend.lib.auth import require_role
from backend.lib.db import db
from backend.lib.notify import notify
from backend.lib.profiles import opportunities_out
from backend.models.schemas import Company, Opportunity, Question, QuestionIn, Reports, StatusUpdate, UserOut

router = APIRouter(prefix="/admin", tags=["admin"])
Admin = Depends(require_role("admin"))


@router.get("/users", response_model=list[UserOut])
async def users(_: dict = Admin):
    return await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(2000)


@router.patch("/users/{user_id}/status", response_model=UserOut)
async def set_user_status(user_id: str, body: StatusUpdate, me: dict = Admin):
    if body.status not in ("active", "suspended"):
        raise HTTPException(status_code=422, detail="Invalid status")
    if user_id == me["id"]:
        raise HTTPException(status_code=409, detail="You cannot change your own status")
    res = await db.users.update_one({"id": user_id}, {"$set": {"status": body.status}})
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="User not found")
    return await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})


@router.get("/companies", response_model=list[Company])
async def companies(_: dict = Admin):
    return await db.companies.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)


@router.patch("/companies/{company_id}/approval", response_model=Company)
async def approve_company(company_id: str, body: StatusUpdate, _: dict = Admin):
    if body.status not in ("pending", "approved", "rejected"):
        raise HTTPException(status_code=422, detail="Invalid status")
    c = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not c:
        raise HTTPException(status_code=404, detail="Company not found")
    await db.companies.update_one({"id": company_id}, {"$set": {"approval_status": body.status}})
    if body.status != c["approval_status"]:
        await notify(c["user_id"], f"Company {body.status}",
                     f"The university has {body.status} {c['company_name']}.", "/company", "approval")
    return await db.companies.find_one({"id": company_id}, {"_id": 0})


@router.get("/opportunities", response_model=list[Opportunity])
async def opportunities(_: dict = Admin):
    return await opportunities_out(await db.opportunities.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000))


@router.patch("/opportunities/{opp_id}/status", response_model=Opportunity)
async def set_opp_status(opp_id: str, body: StatusUpdate, _: dict = Admin):
    if body.status not in ("open", "closed"):
        raise HTTPException(status_code=422, detail="Invalid status")
    res = await db.opportunities.update_one({"id": opp_id}, {"$set": {"status": body.status}})
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    return (await opportunities_out([await db.opportunities.find_one({"id": opp_id}, {"_id": 0})]))[0]


@router.delete("/opportunities/{opp_id}")
async def delete_opp(opp_id: str, _: dict = Admin):
    res = await db.opportunities.delete_one({"id": opp_id})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    await db.applications.delete_many({"opportunity_id": opp_id})
    return {"ok": True}


@router.get("/questions", response_model=list[Question])
async def list_questions(_: dict = Admin):
    return await db.questions.find({}, {"_id": 0}).sort("order", 1).to_list(500)


@router.post("/questions", response_model=Question)
async def create_question(body: QuestionIn, _: dict = Admin):
    q = {**body.model_dump(), "id": str(uuid.uuid4())}
    await db.questions.insert_one(dict(q))
    return q


@router.put("/questions/{qid}", response_model=Question)
async def update_question(qid: str, body: QuestionIn, _: dict = Admin):
    res = await db.questions.update_one({"id": qid}, {"$set": body.model_dump()})
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Question not found")
    return await db.questions.find_one({"id": qid}, {"_id": 0})


@router.delete("/questions/{qid}")
async def delete_question(qid: str, _: dict = Admin):
    res = await db.questions.delete_one({"id": qid})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Question not found")
    return {"ok": True}


@router.get("/reports", response_model=Reports)
async def reports(_: dict = Admin):
    students = await db.students.find({}, {"_id": 0, "id": 1, "major": 1}).to_list(5000)
    apps = await db.applications.find({}, {"_id": 0, "student_id": 1, "status": 1, "company_name": 1}).to_list(10000)
    opps = await db.opportunities.find({}, {"_id": 0, "company_name": 1, "required_skills": 1}).to_list(5000)
    companies = await db.companies.find({}, {"_id": 0, "company_name": 1, "approval_status": 1}).to_list(1000)

    applied_ids = {a["student_id"] for a in apps}
    accepted_ids = {a["student_id"] for a in apps if a["status"] == "accepted"}
    major_of = {s["id"]: s.get("major") or "Undeclared" for s in students}
    by_major: dict[str, dict] = {}
    for s in students:
        row = by_major.setdefault(major_of[s["id"]], {"major": major_of[s["id"]], "students": 0, "applied": 0, "accepted": 0})
        row["students"] += 1
        row["applied"] += s["id"] in applied_ids
        row["accepted"] += s["id"] in accepted_ids

    status_c = Counter(a["status"] for a in apps)
    skill_c = Counter(sk for o in opps for sk in o.get("required_skills", []))
    by_company: dict[str, dict] = {c["company_name"]: {"company": c["company_name"], "opportunities": 0,
                                                     "applications": 0, "accepted": 0}
                                   for c in companies if c["approval_status"] == "approved"}
    for o in opps:
        if o["company_name"] in by_company:
            by_company[o["company_name"]]["opportunities"] += 1
    for a in apps:
        if a["company_name"] in by_company:
            by_company[a["company_name"]]["applications"] += 1
            by_company[a["company_name"]]["accepted"] += a["status"] == "accepted"

    return {
        "students": len(students),
        "companies": sum(1 for c in companies if c["approval_status"] == "approved"),
        "pending_companies": sum(1 for c in companies if c["approval_status"] == "pending"),
        "opportunities": len(opps),
        "applications": len(apps),
        "accepted": status_c.get("accepted", 0),
        "participation_rate": round(100 * len(applied_ids) / len(students), 1) if students else 0.0,
        "by_status": [{"label": k, "count": status_c.get(k, 0)} for k in ("pending", "accepted", "rejected")],
        "by_major": sorted(by_major.values(), key=lambda r: -r["students"]),
        "top_skills": [{"label": k, "count": v} for k, v in skill_c.most_common(10)],
        "by_company": sorted(by_company.values(), key=lambda r: -r["applications"]),
    }
