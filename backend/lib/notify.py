import uuid
from datetime import datetime, timezone

from backend.lib.db import db


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def notify(user_id: str, title: str, body: str, link: str = "", kind: str = "info") -> str:
    nid = str(uuid.uuid4())
    await db.notifications.insert_one(
        {
            "id": nid,
            "user_id": user_id,
            "title": title,
            "body": body,
            "link": link,
            "kind": kind,
            "read": False,
            "created_at": now_iso(),
            "email_status": None,
        }
    )
    return nid
