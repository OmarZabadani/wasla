"""Shared Mongo handle — import `client`/`db` from here (server.py, routers, seed.py)."""

import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING, IndexModel

load_dotenv(Path(__file__).parent.parent / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

logger = logging.getLogger(__name__)

# One entry per collection: every field a route filters, sorts, or dedupes on. Applied by ensure_indexes() at startup.
INDEXES: dict[str, list[IndexModel]] = {
    "users": [IndexModel([("id", ASCENDING)], name="id", unique=True),
              IndexModel([("email", ASCENDING)], name="email", unique=True)],
    "students": [IndexModel([("id", ASCENDING)], name="id", unique=True),
                 IndexModel([("user_id", ASCENDING)], name="user_id", unique=True),
                 IndexModel([("major", ASCENDING), ("city", ASCENDING)], name="major_city")],
    "companies": [IndexModel([("id", ASCENDING)], name="id", unique=True),
                  IndexModel([("user_id", ASCENDING)], name="user_id", unique=True)],
    "opportunities": [IndexModel([("id", ASCENDING)], name="id", unique=True),
                      IndexModel([("company_id", ASCENDING), ("created_at", DESCENDING)], name="company_created"),
                      IndexModel([("status", ASCENDING), ("created_at", DESCENDING)], name="status_created")],
    "applications": [IndexModel([("id", ASCENDING)], name="id", unique=True),
                     IndexModel([("student_id", ASCENDING), ("opportunity_id", ASCENDING)], name="student_opp", unique=True),
                     IndexModel([("opportunity_id", ASCENDING)], name="opp"),
                     IndexModel([("company_id", ASCENDING), ("created_at", DESCENDING)], name="company_created")],
    "cvs": [IndexModel([("student_id", ASCENDING)], name="student_id", unique=True)],
    "notifications": [IndexModel([("user_id", ASCENDING), ("created_at", DESCENDING)], name="user_created")],
    "questions": [IndexModel([("id", ASCENDING)], name="id", unique=True), IndexModel([("order", ASCENDING)], name="order")],
    "digests": [IndexModel([("student_id", ASCENDING), ("week", ASCENDING)], name="student_week", unique=True)],
    "cron_runs": [IndexModel([("run_id", ASCENDING)], name="run_id", unique=True)],
}


async def ensure_indexes() -> None:
    for collection, models in INDEXES.items():
        for model in models:  # one at a time so a bad spec skips only itself
            try:
                await db[collection].create_indexes([model])
            except Exception as exc:  # never block boot on an index; the log line names what to fix
                logger.error("ensure_indexes(%s.%s): %s", collection, model.document["name"], exc)
