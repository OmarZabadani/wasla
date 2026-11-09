"""Transactional email via Emergent-managed Resend. Fire-and-forget: a send never blocks or fails the request.

Recipients always come from server-side student records; subjects/bodies from the fixed templates below (G4).
Generated sample accounts (seed data with made-up addresses) are never emailed.
"""

import asyncio
import ipaddress
import logging
import os
import re
from html import escape
from html.parser import HTMLParser
from urllib.parse import urlparse

import httpx
from fastapi import HTTPException

from backend.lib.db import db  # also loads .env

logger = logging.getLogger(__name__)

EMAIL_BASE_URL = "https://integrations.emergentagent.com"  # constant by design — never from env
EMAIL_KEY = os.environ.get("EMERGENT_EMAIL_KEY", "")
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME", "Wasla Web")
EMAIL_REPLY_TO = os.environ.get("EMAIL_REPLY_TO")
APP_URL = os.environ.get("PUBLIC_APP_URL", "").rstrip("/")

PREF_KEYS = ("status_updates", "new_opportunities", "weekly_digest", "new_applications")
DEFAULT_PREFS = {k: True for k in PREF_KEYS}

# ---------------- guardrail gate (copied from the playbook; never weaken) ----------------
_SHORTENERS = ("bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "goo.gl", "rebrand.ly")
_CRED_ASK = ("reply with your password", "reply with the code", "send your password", "cvv",
             "send us your password", "enter your password below", "confirm your card number",
             "your full card number", "seed phrase", "recovery phrase", "verify your card",
             "social security number", "confirm your bank details")
_HOSTISH = re.compile(r"\b(?:https?://)?((?:[a-z0-9-]+\.)+[a-z]{2,})", re.I)


def _host_ok(host: str) -> bool:
    if not host or "xn--" in host:
        return False
    try:
        ipaddress.ip_address(host)
        return False
    except ValueError:
        pass
    return not any(host == s or host.endswith("." + s) for s in _SHORTENERS)


def _same_site(shown: str, real: str) -> bool:
    return shown == real or real.endswith("." + shown) or shown.endswith("." + real)


class _EmailScan(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags, self.urls, self.anchors = set(), [], []
        self._href, self._text = None, []

    def handle_starttag(self, tag, attrs):
        self.tags.add(tag.lower())
        self.urls += [v for k, v in attrs if k.lower() in ("href", "src") and v]
        if tag.lower() == "a":
            self._href = dict((k.lower(), v) for k, v in attrs).get("href")
            self._text = []

    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)

    def handle_endtag(self, tag):
        if tag.lower() == "a" and self._href is not None:
            self.anchors.append((self._href, "".join(self._text)))
            self._href, self._text = None, []


def _assert_safe_email(subject: str, html: str) -> None:
    scan = _EmailScan()
    scan.feed(html)
    if scan.tags & {"form", "input", "textarea", "select"}:
        raise ValueError("No forms or input fields in email (G2)")
    body = f"{subject}\n{html}".lower()
    for p in _CRED_ASK:
        if p in body:
            raise ValueError(f"Email asks the recipient for credentials: {p!r} (G2)")
    for url in scan.urls:
        low = url.strip().lower()
        if low.startswith(("mailto:", "tel:", "cid:", "#")):
            continue
        if not low.startswith("https://"):
            raise ValueError(f"Email links/assets must be absolute https: {url!r} (G3)")
        host = urlparse(low).hostname or ""
        if not _host_ok(host) or urlparse(low).username is not None:
            raise ValueError(f"Shortened, numeric-host or credential-bearing URL: {url!r} (G3)")
    for href, text in scan.anchors:
        real = urlparse(href.strip().lower()).hostname or ""
        if not real:
            continue
        for m in _HOSTISH.finditer(text):
            if not _same_site(m.group(1).lower(), real):
                raise ValueError(f"Anchor text {m.group(1)!r} ≠ real link host {real!r} (G3)")


async def send_email(*, to: str, subject: str, html: str) -> str | None:
    _assert_safe_email(subject, html)
    payload = {"to": [to], "subject": subject, "html": html, "from_name": EMAIL_FROM_NAME}
    if EMAIL_REPLY_TO:
        payload["contact_email"] = EMAIL_REPLY_TO
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(f"{EMAIL_BASE_URL}/api/v1/email/send",
                                     headers={"X-Email-Key": EMAIL_KEY}, json=payload)
        resp.raise_for_status()
        return resp.json().get("id")
    except httpx.HTTPStatusError as e:
        try:
            code = e.response.json().get("code", "")
        except ValueError:
            code = ""
        if code in ("insufficient_credits", "integration_disabled", "daily_limit_reached"):
            logger.warning("Email paused: %s (%s): %s", code, e.response.status_code, e.response.text)
            raise HTTPException(status_code=503, detail="Email is temporarily unavailable")
        logger.error("Email send failed: %s %s", e.response.status_code, e.response.text)
        raise HTTPException(status_code=502, detail="Failed to send email")
    except Exception as e:
        logger.error("Email send error: %s", e)
        raise HTTPException(status_code=500, detail="Failed to send email")


# ---------------- templates (fixed, server-side, all interpolation escaped) ----------------
def _layout(heading: str, paragraphs: list[str], cta_label: str, cta_path: str) -> str:
    paras = "".join(f'<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#334155">{p}</p>' for p in paragraphs)
    cta = ""
    if APP_URL:
        cta = (f'<p style="margin:22px 0"><a href="{escape(APP_URL + cta_path)}" '
               f'style="background:#0F766E;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;'
               f'font-weight:bold;font-size:14px;display:inline-block">{escape(cta_label)}</a></p>')
    return (
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:24px 0">'
        '<tr><td align="center"><table role="presentation" width="560" cellpadding="0" cellspacing="0" '
        'style="background:#ffffff;border:1px solid #E2E8F0;border-radius:12px;font-family:Arial,sans-serif">'
        '<tr><td style="background:#0F172A;padding:18px 28px;border-radius:12px 12px 0 0;color:#5EEAD4;'
        f'font-size:18px;font-weight:bold">{escape(EMAIL_FROM_NAME)}</td></tr>'
        f'<tr><td style="padding:28px"><h1 style="margin:0 0 16px;font-size:20px;color:#0F172A">{escape(heading)}</h1>'
        f'{paras}{cta}'
        f'<p style="margin:24px 0 0;font-size:12px;color:#94A3B8">Sent by {escape(EMAIL_FROM_NAME)} · Applied Science Private University field training. '
        'You can turn these alerts off from the Notifications page. We never ask for your password by email.</p>'
        '</td></tr></table></td></tr></table>'
    )


STATUS_LINE = {
    "accepted": "Congratulations — you have been accepted for this field training opportunity.",
    "rejected": "The company decided not to move forward with your application this time. Keep exploring your other recommendations.",
    "pending": "Your application is back under review.",
}


def status_email(student_name: str, company: str, title: str, status: str) -> tuple[str, str]:
    subject = f"Application update: {title} — {status}"
    html = _layout(
        f"Your application was {status}",
        [f"Hi {escape(student_name)},",
         f"<strong>{escape(company)}</strong> updated your application for <strong>{escape(title)}</strong> "
         f"to <strong>{escape(status)}</strong>.",
         escape(STATUS_LINE.get(status, ""))],
        "View my applications", "/student/applications")
    return subject, html


def opportunity_email(student_name: str, company: str, title: str, score: float, city: str, mode: str) -> tuple[str, str]:
    subject = f"New match: {title} at {company} ({round(score)}%)"
    html = _layout(
        "A new opportunity matches your profile",
        [f"Hi {escape(student_name)},",
         f"<strong>{escape(company)}</strong> posted <strong>{escape(title)}</strong> "
         f"({escape(city)} · {escape(mode)}).",
         f"Your match score is <strong>{round(score)}%</strong>, calculated with the transparent Wasla formula "
         "(major, courses &amp; grades, skills, certificates, interests, location)."],
        "See why it matches", "/student/opportunities")
    return subject, html


def application_email(company: str, student_name: str, major: str, title: str, score: float, opp_id: str) -> tuple[str, str]:
    subject = f"New applicant for {title}: {student_name} ({round(score)}% match)"
    html = _layout(
        "A new student applied",
        [f"Hello {escape(company)} team,",
         f"<strong>{escape(student_name)}</strong> ({escape(major)}) applied to <strong>{escape(title)}</strong>.",
         f"Match score: <strong>{round(score)}%</strong>. Open the applicant list to see the full criterion-by-criterion "
         "breakdown and update the application status."],
        "Review applicants", f"/company/opportunities/{opp_id}")
    return subject, html


def digest_email(student_name: str, matches: list[dict], gap: dict | None) -> tuple[str, str]:
    rows = "".join(
        f'<tr><td style="padding:10px 0;border-bottom:1px solid #E2E8F0;font-size:14px;color:#0F172A">'
        f'<strong>{escape(m["title"])}</strong><br><span style="color:#64748B">{escape(m["company"])} · {escape(m["city"])}</span></td>'
        f'<td align="right" style="padding:10px 0;border-bottom:1px solid #E2E8F0;font-size:16px;font-weight:bold;color:#0F766E">'
        f'{round(m["score"])}%</td></tr>'
        for m in matches)
    table = f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0">{rows}</table>'
    paras = [f"Hi {escape(student_name)},",
             f"Here are your top {len(matches)} new field-training matches from this week:", table]
    if gap:
        paras.append(f"<strong>Development opportunity ({escape(gap['track'])}):</strong> {escape(gap['name'])} — "
                     f"{escape(gap['suggestion'])}")
    html = _layout("Your weekly Wasla digest", paras, "See all recommendations", "/student/opportunities")
    return f"Your weekly matches: {matches[0]['title']} and more", html


# ---------------- fire-and-forget delivery ----------------
_tasks: set[asyncio.Task] = set()


async def _deliver(nid: str, to: str, subject: str, html: str) -> None:
    try:
        await send_email(to=to, subject=subject, html=html)
        status = "sent"
    except Exception as exc:  # logged in send_email; never propagate into the request
        logger.warning("email for notification %s not delivered: %s", nid, exc)
        status = "failed"
    await db.notifications.update_one({"id": nid}, {"$set": {"email_status": status}})


async def email_student(student: dict, pref: str, nid: str, subject: str, html: str) -> str:
    """Queue an email for a notification. `student` is any recipient dict with email/generated/email_prefs."""
    prefs = {**DEFAULT_PREFS, **(student.get("email_prefs") or {})}
    if student.get("generated"):
        status = "skipped"  # seed/sample account with a made-up address
    elif not prefs.get(pref, True):
        status = "off"
    elif not EMAIL_KEY or not student.get("email"):
        status = "skipped"
    else:
        status = "queued"
        task = asyncio.create_task(_deliver(nid, student["email"], subject, html))
        _tasks.add(task)
        task.add_done_callback(_tasks.discard)
    await db.notifications.update_one({"id": nid}, {"$set": {"email_status": status}})
    return status
