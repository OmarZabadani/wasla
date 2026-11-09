import re
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query

from backend.lib.auth import require_role
from backend.lib.db import db
from backend.lib.emailer import email_student, opportunity_email, status_email
from backend.lib.matching import compute_match, n

EMAIL_MATCH_MIN = 60.0
from backend.lib.notify import notify, now_iso
from backend.lib.profiles import company_for_user, opportunities_out, student_out
from backend.models.schemas import (Applicant, Application, Company, CompanyEmailPrefs, CompanyIn, Evaluation, Opportunity,
                            OpportunityIn, StatusIn, StudentSearchResult)

router = APIRouter(prefix="/company", tags=["company"])
CompanyUser = Depends(require_role("company"))


async def _company(user: dict) -> dict:
    c = await company_for_user(user["id"])
    if not c:
        raise HTTPException(status_code=404, detail="Company profile not found")
    return c


async def _own_opp(company: dict, opp_id: str) -> dict:
    opp = await db.opportunities.find_one({"id": opp_id, "company_id": company["id"]}, {"_id": 0})
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    return opp


async def _own_app(company: dict, app_id: str) -> dict:
    app = await db.applications.find_one({"id": app_id, "company_id": company["id"]}, {"_id": 0})
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    return app


@router.get("/profile", response_model=Company)
async def get_profile(user: dict = CompanyUser):
    return await _company(user)


@router.put("/profile", response_model=Company)
async def update_profile(body: CompanyIn, user: dict = CompanyUser):
    c = await _company(user)
    await db.companies.update_one({"id": c["id"]}, {"$set": body.model_dump()})
    await db.opportunities.update_many({"company_id": c["id"]}, {"$set": {"company_name": body.company_name}})
    return await _company(user)


@router.put("/email-prefs", response_model=Company)
async def save_email_prefs(body: CompanyEmailPrefs, user: dict = CompanyUser):
    c = await _company(user)
    await db.companies.update_one({"id": c["id"]}, {"$set": {"email_prefs": body.model_dump()}})
    return await _company(user)


@router.get("/opportunities", response_model=list[Opportunity])
async def list_opps(user: dict = CompanyUser):
    c = await _company(user)
    docs = await db.opportunities.find({"company_id": c["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return await opportunities_out(docs)


@router.get("/opportunities/{opp_id}", response_model=Opportunity)
async def get_opp(opp_id: str, user: dict = CompanyUser):
    c = await _company(user)
    return (await opportunities_out([await _own_opp(c, opp_id)]))[0]


@router.post("/opportunities", response_model=Opportunity)
async def create_opp(body: OpportunityIn, user: dict = CompanyUser):
    c = await _company(user)
    if c["approval_status"] != "approved":
        raise HTTPException(status_code=403, detail="Your company must be approved by the university before posting")
    opp = {**body.model_dump(), "id": str(uuid.uuid4()), "company_id": c["id"],
           "company_name": c["company_name"], "created_at": now_iso()}
    await db.opportunities.insert_one(dict(opp))
    # In-app: every student whose major fits. Email: only strong matches (>= EMAIL_MATCH_MIN) who opted in.
    majors = body.majors
    query = {"major": {"$in": majors}} if majors else {}
    async for s in db.students.find(query, {"_id": 0}):
        score = compute_match(student_out(s), opp)["total"]
        nid = await notify(s["user_id"], "New training opportunity",
                           f"{c['company_name']} posted “{body.title}” — {score}% match.", "/student/opportunities", "opportunity")
        if score >= EMAIL_MATCH_MIN:
            subject, html = opportunity_email(s["name"], c["company_name"], body.title, score, body.city, body.mode)
            await email_student(s, "new_opportunities", nid, subject, html)
    return (await opportunities_out([opp]))[0]


@router.put("/opportunities/{opp_id}", response_model=Opportunity)
async def update_opp(opp_id: str, body: OpportunityIn, user: dict = CompanyUser):
    c = await _company(user)
    await _own_opp(c, opp_id)
    await db.opportunities.update_one({"id": opp_id}, {"$set": body.model_dump()})
    return (await opportunities_out([await _own_opp(c, opp_id)]))[0]


@router.delete("/opportunities/{opp_id}")
async def delete_opp(opp_id: str, user: dict = CompanyUser):
    c = await _company(user)
    await _own_opp(c, opp_id)
    await db.opportunities.delete_one({"id": opp_id})
    await db.applications.delete_many({"opportunity_id": opp_id})
    return {"ok": True}


@router.get("/opportunities/{opp_id}/applicants", response_model=list[Applicant])
async def applicants(opp_id: str, user: dict = CompanyUser):
    c = await _company(user)
    opp = await _own_opp(c, opp_id)
    apps = await db.applications.find({"opportunity_id": opp_id}, {"_id": 0}).to_list(1000)
    ids = [a["student_id"] for a in apps]
    students = {s["id"]: student_out(s) async for s in db.students.find({"id": {"$in": ids}}, {"_id": 0})}
    out = []
    for a in apps:
        s = students.get(a["student_id"])
        if s:
            out.append({"application": a, "student": s, "match": compute_match(s, opp)})
    out.sort(key=lambda x: -x["match"]["total"])
    return out


@router.get("/applications", response_model=list[Application])
async def all_applications(user: dict = CompanyUser):
    c = await _company(user)
    return await db.applications.find({"company_id": c["id"]}, {"_id": 0}).sort("created_at", -1).to_list(1000)


@router.patch("/applications/{app_id}/status", response_model=Application)
async def set_status(app_id: str, body: StatusIn, user: dict = CompanyUser):
    c = await _company(user)
    app = await _own_app(c, app_id)
    await db.applications.update_one({"id": app_id}, {"$set": {"status": body.status, "updated_at": now_iso()}})
    s = await db.students.find_one({"id": app["student_id"]}, {"_id": 0})
    if s and body.status != app["status"]:
        nid = await notify(s["user_id"], f"Application {body.status}",
                           f"{c['company_name']} updated your application for {app['opportunity_title']} to {body.status}.",
                           "/student/applications", "status")
        subject, html = status_email(s["name"], c["company_name"], app["opportunity_title"], body.status)
        await email_student(s, "status_updates", nid, subject, html)
    return await _own_app(c, app_id)


@router.put("/applications/{app_id}/evaluation", response_model=Application)
async def evaluate(app_id: str, body: Evaluation, user: dict = CompanyUser):
    c = await _company(user)
    app = await _own_app(c, app_id)
    if app["status"] != "accepted":
        raise HTTPException(status_code=409, detail="Only accepted trainees can be evaluated")
    await db.applications.update_one({"id": app_id}, {"$set": {"evaluation": body.model_dump(), "updated_at": now_iso()}})
    s = await db.students.find_one({"id": app["student_id"]}, {"user_id": 1})
    if s:
        await notify(s["user_id"], "Training evaluation received",
                     f"{c['company_name']} evaluated your training: {body.score}/100.", "/student/applications", "evaluation")
    return await _own_app(c, app_id)


@router.get("/students/search", response_model=list[StudentSearchResult])
async def search_students(
    major: str = "", skill: str = "", city: str = "", opportunity_id: str = "", user: dict = CompanyUser
):
    c = await _company(user)
    q: dict = {}
    if major:
        q["major"] = major
    if city:
        q["city"] = city
    if skill:
        q["skills.name"] = {"$regex": f"^{re.escape(skill.strip())}$", "$options": "i"}
    opp = await _own_opp(c, opportunity_id) if opportunity_id else None
    docs = await db.students.find(q, {"_id": 0}).to_list(500)
    out = [{"student": student_out(d), "match": compute_match(student_out(d), opp) if opp else None} for d in docs]
    if opp:
        out.sort(key=lambda r: -r["match"]["total"])
    else:
        out.sort(key=lambda r: -r["student"]["gpa"])
    return out[:100]


_ = n  # re-exported helper kept for symmetry
