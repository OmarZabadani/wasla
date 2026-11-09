import uuid

from fastapi import APIRouter, Depends, HTTPException, Query

from backend.lib.auth import require_role
from backend.lib.cv_ai import ai_cv_text
from backend.lib.db import db
from backend.lib.emailer import application_email, email_student
from backend.lib.matching import TRACKS, compute_match, gap_analysis
from backend.lib.notify import notify, now_iso
from backend.lib.profiles import opportunities_out, student_for_user, student_out
from backend.models.schemas import (CV, AnswersIn, Application, ApplicationIn, CVUpdate, EmailPrefs, GapReport, Recommendation,
                            StudentProfile, StudentProfileIn)

router = APIRouter(prefix="/student", tags=["student"])
Student = Depends(require_role("student"))


async def _me(user: dict) -> dict:
    s = await student_for_user(user["id"])
    if not s:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return s


@router.get("/profile", response_model=StudentProfile)
async def get_profile(user: dict = Student):
    return student_out(await _me(user))


@router.put("/profile", response_model=StudentProfile)
async def update_profile(body: StudentProfileIn, user: dict = Student):
    s = await _me(user)
    await db.students.update_one({"id": s["id"]}, {"$set": body.model_dump()})
    return student_out(await _me(user))


@router.put("/answers", response_model=StudentProfile)
async def save_answers(body: AnswersIn, user: dict = Student):
    s = await _me(user)
    await db.students.update_one({"id": s["id"]}, {"$set": {"answers": body.answers}})
    return student_out(await _me(user))


@router.put("/email-prefs", response_model=StudentProfile)
async def save_email_prefs(body: EmailPrefs, user: dict = Student):
    s = await _me(user)
    await db.students.update_one({"id": s["id"]}, {"$set": {"email_prefs": body.model_dump()}})
    return student_out(await _me(user))


@router.get("/recommendations", response_model=list[Recommendation])
async def recommendations(user: dict = Student):
    s = student_out(await _me(user))
    opps = await opportunities_out(await db.opportunities.find({"status": "open"}, {"_id": 0}).to_list(500))
    apps = {a["opportunity_id"]: a["status"] async for a in db.applications.find({"student_id": s["id"]})}
    recs = [{"opportunity": o, "match": compute_match(s, o), "application_status": apps.get(o["id"])} for o in opps]
    recs.sort(key=lambda r: -r["match"]["total"])
    return recs


@router.post("/applications", response_model=Application)
async def apply(body: ApplicationIn, user: dict = Student):
    s = student_out(await _me(user))
    opp = await db.opportunities.find_one({"id": body.opportunity_id, "status": "open"}, {"_id": 0})
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found or closed")
    if await db.applications.find_one({"student_id": s["id"], "opportunity_id": opp["id"]}):
        raise HTTPException(status_code=409, detail="You already applied to this opportunity")
    ts = now_iso()
    app = {"id": str(uuid.uuid4()), "student_id": s["id"], "student_name": s["name"], "opportunity_id": opp["id"],
           "opportunity_title": opp["title"], "company_id": opp["company_id"], "company_name": opp["company_name"],
           "status": "pending", "match_score": compute_match(s, opp)["total"], "cover_note": body.cover_note,
           "created_at": ts, "updated_at": ts, "evaluation": None}
    await db.applications.insert_one(dict(app))
    company = await db.companies.find_one({"id": opp["company_id"]}, {"_id": 0})
    if company:
        nid = await notify(company["user_id"], "New application",
                           f"{s['name']} applied to {opp['title']} ({app['match_score']}% match).",
                           f"/company/opportunities/{opp['id']}", "application")
        cu = await db.users.find_one({"id": company["user_id"]}, {"email": 1})
        recipient = {"email": cu["email"] if cu else "", "generated": company.get("generated", False),
                     "email_prefs": company.get("email_prefs")}
        subject, html = application_email(company["company_name"], s["name"], s.get("major", ""), opp["title"],
                                          app["match_score"], opp["id"])
        await email_student(recipient, "new_applications", nid, subject, html)
    return app


@router.get("/applications", response_model=list[Application])
async def my_applications(user: dict = Student):
    s = await _me(user)
    return await db.applications.find({"student_id": s["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)


@router.get("/gaps", response_model=list[GapReport])
async def gaps(track: str | None = Query(default=None), user: dict = Student):
    s = student_out(await _me(user))
    keys = [track] if track else list(TRACKS)
    if track and track not in TRACKS:
        raise HTTPException(status_code=404, detail="Unknown career track")
    return [gap_analysis(s, k) for k in keys]


@router.get("/cv", response_model=CV | None)
async def get_cv(user: dict = Student):
    s = await _me(user)
    return await db.cvs.find_one({"student_id": s["id"]}, {"_id": 0})


@router.post("/cv/generate", response_model=CV)
async def generate_cv(lang: str = Query(default="en", pattern="^(en|ar)$"), user: dict = Student):
    s = student_out(await _me(user))
    text, ai_used = await ai_cv_text(s, lang)
    lines = text.get("project_lines") or {}
    projects = [{**p, "description": lines.get(p["title"]) or p.get("description", "")} for p in s.get("projects", [])]
    content = {
        "name": s["name"], "email": s["email"], "phone": s.get("phone", ""), "city": s.get("city", ""),
        "major": s.get("major", ""), "year_level": s.get("year_level", 3), "gpa": s["gpa"],
        "summary": text["summary"], "objective": text["objective"],
        "courses": sorted(s.get("courses", []), key=lambda c: c["name"]), "skills": s.get("skills", []),
        "external_courses": s.get("external_courses", []), "projects": projects,
        "languages": s.get("languages", []), "interests": s.get("interests", []),
    }
    cv = {"id": str(uuid.uuid4()), "student_id": s["id"], "lang": lang, "content": content, "approved": False,
          "ai_generated": ai_used, "generated_at": now_iso()}
    await db.cvs.replace_one({"student_id": s["id"]}, dict(cv), upsert=True)
    return cv


@router.put("/cv", response_model=CV)
async def update_cv(body: CVUpdate, user: dict = Student):
    s = await _me(user)
    res = await db.cvs.update_one({"student_id": s["id"]}, {"$set": {
        "content.summary": body.summary, "content.objective": body.objective, "approved": body.approved}})
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Generate a CV first")
    return await db.cvs.find_one({"student_id": s["id"]}, {"_id": 0})
