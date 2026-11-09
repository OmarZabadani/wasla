import asyncio
import hmac
import logging
import os

from fastapi import APIRouter, HTTPException, Request
from pymongo.errors import DuplicateKeyError

from backend.lib.db import db
from backend.lib.digest import run_weekly_digest
from backend.lib.notify import now_iso

router = APIRouter(prefix="/cron", tags=["cron"])
logger = logging.getLogger(__name__)
_tasks: set[asyncio.Task] = set()


def _check_auth(request: Request) -> None:
    secret = os.environ.get("WEBHOOK_CRON_SECRET", "")
    header = request.headers.get("authorization", "")
    token = header[7:] if header.lower().startswith("bearer ") else ""
    if not secret or not token or not hmac.compare_digest(token, secret):
        raise HTTPException(status_code=401, detail="Unauthorized")


async def _run(run_id: str) -> None:
    try:
        stats = await run_weekly_digest()
        await db.cron_runs.update_one({"run_id": run_id}, {"$set": {"status": "done", "stats": stats}})
    except Exception as exc:
        logger.exception("weekly digest failed")
        await db.cron_runs.update_one({"run_id": run_id}, {"$set": {"status": "failed", "error": str(exc)}})


@router.post("/weekly-digest", status_code=202)
async def weekly_digest(request: Request):
    # Cron endpoints must ack 2xx immediately; enqueue/background the actual work.
    _check_auth(request)
    try:
        envelope = await request.json()
    except Exception:
        envelope = None
    if envelope is not None and not isinstance(envelope, dict):
        raise HTTPException(status_code=400, detail="Invalid body")
    run_id = request.headers.get("x-webhook-id") or (envelope or {}).get("run_id")
    if not run_id:
        raise HTTPException(status_code=400, detail="Missing run id")
    try:
        await db.cron_runs.insert_one({"run_id": run_id, "job": "weekly-digest", "status": "queued", "created_at": now_iso()})
    except DuplicateKeyError:
        return {"accepted": True, "duplicate": True}
    task = asyncio.create_task(_run(run_id))
    _tasks.add(task)
    task.add_done_callback(_tasks.discard)
    return {"accepted": True, "run_id": run_id}
