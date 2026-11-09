"""CV generation: template-built structure + Claude Sonnet 4.5 (Emergent LLM key) for summary/objective text."""

import json
import logging
import os
import uuid

import httpx

logger = logging.getLogger(__name__)

SYSTEM = (
    "You are a career services writer at a university. You write concise, factual, ATS-friendly CV text "
    "for students applying to field training (internships). Never invent facts not present in the data. "
    "Respond ONLY with a JSON object, no markdown."
)


def template_text(s: dict, lang: str) -> dict:
    skills = ", ".join(x["name"] for x in s.get("skills", [])[:5])
    if lang == "ar":
        return {
            "summary": f"طالب/ة {s.get('major', '')} بمعدل تراكمي {s.get('gpa', 0)}، يمتلك مهارات في {skills}.",
            "objective": f"الحصول على فرصة تدريب ميداني في مجال {s.get('major', '')} لتطبيق المعرفة الأكاديمية واكتساب خبرة عملية.",
        }
    return {
        "summary": f"{s.get('major', '')} student with a GPA of {s.get('gpa', 0)} and hands-on skills in {skills}.",
        "objective": f"Seeking a field training opportunity in {s.get('major', '')} to apply academic knowledge and gain practical industry experience.",
    }


async def ai_cv_text(s: dict, lang: str = "en") -> tuple[dict, bool]:
    key = os.environ.get("EMERGENT_LLM_KEY")
    if not key:
        return template_text(s, lang), False
    data = {
        "name": s.get("name"), "major": s.get("major"), "gpa": s.get("gpa"), "year_level": s.get("year_level"),
        "courses": [f"{c['name']} ({c['grade']})" for c in s.get("courses", [])],
        "skills": [f"{x['name']} ({x.get('level', '')})" for x in s.get("skills", [])],
        "external_courses": [e["title"] for e in s.get("external_courses", [])],
        "projects": [{"title": p["title"], "tech": p.get("tech", [])} for p in s.get("projects", [])],
        "interests": s.get("interests", []), "bio": s.get("bio", ""),
    }
    language = "Arabic" if lang == "ar" else "English"
    prompt = (
        f"Student data:\n{json.dumps(data, ensure_ascii=False)}\n\n"
        f"Write in {language}. Return JSON with keys: "
        '"summary" (2-3 sentence professional summary), '
        '"objective" (1-2 sentence career objective for field training), '
        '"project_lines" (object mapping each project title to a one-line impact-oriented description).'
    )
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": "claude-sonnet-4-5-20250929",
                    "max_tokens": 1024,
                    "system": SYSTEM,
                    "messages": [{"role": "user", "content": prompt}],
                },
            )
            resp.raise_for_status()
            text = "".join(
                block.get("text", "")
                for block in resp.json().get("content", [])
                if block.get("type") == "text"
            )
        parsed = json.loads(text[text.find("{"): text.rfind("}") + 1])
        if not parsed.get("summary") or not parsed.get("objective"):
            raise ValueError("incomplete AI response")
        return parsed, True
    except Exception as exc:  # degrade to template text; never fail the request on the LLM
        logger.error("AI CV generation failed: %s", exc)
        return template_text(s, lang), False