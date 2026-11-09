"""Weekly digest: each student's top 3 NEW matches (opportunities posted in the last 7 days, not yet applied)
plus one development opportunity from their closest career track. Idempotent per student per ISO week."""

import logging
from datetime import datetime, timedelta, timezone

from pymongo.errors import DuplicateKeyError

from backend.lib.dates import today_iso
from backend.lib.db import db
from backend.lib.emailer import digest_email, email_student
from backend.lib.matching import TRACKS, compute_match, gap_analysis
from backend.lib.notify import notify
from backend.lib.profiles import student_out

logger = logging.getLogger(__name__)


async def run_weekly_digest() -> dict:
    now = datetime.now(timezone.utc)
    week = today_iso("Asia/Amman")  # one digest per student per run-day (re-runs the same day are no-ops)
    since = (now - timedelta(days=7)).isoformat()
    opps = await db.opportunities.find({"status": "open", "created_at": {"$gte": since}}, {"_id": 0}).to_list(500)
    stats = {"week": week, "new_opportunities": len(opps), "students": 0, "digests": 0, "skipped_no_matches": 0, "already": 0}
    if not opps:
        return stats

    async for doc in db.students.find({}, {"_id": 0}):
        stats["students"] += 1
        s = student_out(doc)
        applied = {a["opportunity_id"] async for a in db.applications.find({"student_id": s["id"]}, {"opportunity_id": 1})}
        ranked = sorted(((compute_match(s, o)["total"], o) for o in opps if o["id"] not in applied), key=lambda x: -x[0])[:3]
        if not ranked:
            stats["skipped_no_matches"] += 1
            continue
        try:  # claim this student's digest for the week before sending (no double sends on re-runs)
            await db.digests.insert_one({"student_id": s["id"], "week": week, "created_at": now.isoformat()})
        except DuplicateKeyError:
            stats["already"] += 1
            continue
        matches = [{"title": o["title"], "company": o["company_name"], "city": o["city"], "score": sc} for sc, o in ranked]
        best = max((gap_analysis(s, k) for k in TRACKS), key=lambda r: r["readiness"])
        gap = {"track": best["track_name"], **best["gaps"][0]} if best["gaps"] else None
        body = "; ".join(f"{m['title']} ({round(m['score'])}%)" for m in matches)
        nid = await notify(s["user_id"], "Your weekly digest", f"Top new matches: {body}.", "/student/opportunities", "digest")
        subject, html = digest_email(s["name"], matches, gap)
        await email_student(s, "weekly_digest", nid, subject, html)
        stats["digests"] += 1
    logger.info("weekly digest %s", stats)
    return stats
