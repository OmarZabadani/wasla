"""Shared document → response shaping helpers used across routers."""

from backend.lib.db import db
from backend.lib.matching import CITY_REGION, compute_gpa


def student_out(doc: dict) -> dict:
    d = {k: v for k, v in doc.items() if k != "_id"}
    d["gpa"] = compute_gpa(d.get("courses", []))
    d["region"] = CITY_REGION.get(d.get("city", ""), "")
    checks = [d.get("phone"), d.get("major"), d.get("city"), d.get("courses"), d.get("skills"),
              d.get("external_courses"), d.get("projects"), d.get("interests"), d.get("answers"), d.get("languages")]
    d["completeness"] = sum(10 for c in checks if c)
    return d


async def student_for_user(user_id: str) -> dict | None:
    return await db.students.find_one({"user_id": user_id}, {"_id": 0})


async def company_for_user(user_id: str) -> dict | None:
    return await db.companies.find_one({"user_id": user_id}, {"_id": 0})


async def applicant_counts(opp_ids: list[str]) -> dict[str, int]:
    rows = await db.applications.aggregate(
        [{"$match": {"opportunity_id": {"$in": opp_ids}}}, {"$group": {"_id": "$opportunity_id", "c": {"$sum": 1}}}]
    ).to_list(1000)
    return {r["_id"]: r["c"] for r in rows}


async def opportunities_out(docs: list[dict]) -> list[dict]:
    counts = await applicant_counts([o["id"] for o in docs])
    out = []
    for o in docs:
        o = {k: v for k, v in o.items() if k != "_id"}
        o["region"] = CITY_REGION.get(o.get("city", ""), "")
        o["applicants_count"] = counts.get(o["id"], 0)
        out.append(o)
    return out
