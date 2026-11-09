"""Transparent weighted match formula + Phase 1 profile gap analysis (rule-based, no ML).

Weights: Major 25 · Courses & grades 25 · Skills 25 · External courses 10 · Interests/answers 10 · Location 5.
"""

GRADE_POINTS = {
    "A": 4.0, "A-": 3.75, "B+": 3.5, "B": 3.0, "B-": 2.75, "C+": 2.5,
    "C": 2.0, "C-": 1.75, "D+": 1.5, "D": 1.0, "F": 0.0,
}

MAJORS = [
    "Computer Science", "Software Engineering", "Cybersecurity", "Data Science",
    "Artificial Intelligence", "Computer Information Systems", "Networks",
]

CITY_REGION = {
    "Amman": "Central", "Zarqa": "Central", "Salt": "Central", "Madaba": "Central",
    "Irbid": "North", "Jerash": "North", "Ajloun": "North", "Mafraq": "North",
    "Karak": "South", "Tafilah": "South", "Ma'an": "South", "Aqaba": "South",
}

WEIGHTS = {"major": 25, "courses": 25, "skills": 25, "external": 10, "interests": 10, "location": 5}


def n(s: str) -> str:
    return (s or "").strip().lower()


def grade_points(grade: str) -> float:
    return GRADE_POINTS.get((grade or "").strip().upper(), 0.0)


def compute_gpa(courses: list[dict]) -> float:
    total_h = sum(c.get("credit_hours", 3) for c in courses)
    if not total_h:
        return 0.0
    return round(sum(grade_points(c["grade"]) * c.get("credit_hours", 3) for c in courses) / total_h, 2)


def skill_set(student: dict) -> set[str]:
    s = {n(x["name"]) for x in student.get("skills", [])}
    for ec in student.get("external_courses", []):
        s |= {n(x) for x in ec.get("skills", [])}
    for p in student.get("projects", []):
        s |= {n(x) for x in p.get("tech", [])}
    return s


def tag_set(student: dict) -> set[str]:
    tags = {n(x) for x in student.get("interests", [])}
    tags |= {n(v) for v in (student.get("answers") or {}).values() if v}
    return tags


def _course_match(name: str, courses: list[dict]) -> dict | None:
    key = n(name)
    for c in courses:
        cn = n(c["name"])
        if key and (key in cn or cn in key):
            return c
    return None


# Each factor returns (score 0-100, matched, missing, info) — small, independently testable pieces.
Factor = tuple[float, list[str], list[str], str]


def _major_factor(student: dict, opp: dict) -> Factor:
    majors = [n(m) for m in opp.get("majors", [])]
    smajor = n(student.get("major", ""))
    if not majors or smajor in majors:
        return 100.0, [student.get("major", "")], [], "exact"
    if smajor in {n(m) for m in MAJORS}:
        return 50.0, [], opp.get("majors", []), "related"
    return 0.0, [], opp.get("majors", []), "none"


def _courses_factor(student: dict, opp: dict) -> Factor:
    """Grade quality on the opportunity's related courses (70%) + overall GPA (30%)."""
    courses = student.get("courses", [])
    gpa = compute_gpa(courses)
    matched, missing, pts = [], [], []
    for rc in opp.get("related_courses", []):
        c = _course_match(rc, courses)
        if c:
            matched.append(f"{c['name']} ({c['grade']})")
            pts.append(grade_points(c["grade"]) / 4)
        else:
            missing.append(rc)
            pts.append(0.0)
    course_part = (sum(pts) / len(pts)) if pts else gpa / 4
    return round((0.7 * course_part + 0.3 * gpa / 4) * 100, 1), matched, missing, f"GPA {gpa}"


def _skills_factor(student: dict, opp: dict) -> Factor:
    have = skill_set(student)
    req = opp.get("required_skills", [])
    matched = [s for s in req if n(s) in have]
    missing = [s for s in req if n(s) not in have]
    score = round(100 * len(matched) / len(req), 1) if req else 100.0
    return score, matched, missing, f"{len(matched)}/{len(req)}"


def _external_factor(student: dict, opp: dict) -> Factor:
    req_n = {n(s) for s in opp.get("required_skills", [])}
    ext = student.get("external_courses", [])
    relevant = [e["title"] for e in ext if {n(x) for x in e.get("skills", [])} & req_n]
    if relevant:
        score = min(100.0, 50.0 * len(relevant) + 20)
    else:
        score = 30.0 if ext else 0.0
    return score, relevant, [], f"{len(ext)} total"


def _interests_factor(student: dict, opp: dict) -> Factor:
    tags = opp.get("tags", [])
    stags = tag_set(student)
    matched = [t for t in tags if n(t) in stags]
    missing = [t for t in tags if n(t) not in stags]
    score = round(100 * len(matched) / len(tags), 1) if tags else 50.0
    return score, matched, missing, f"{len(matched)}/{len(tags)}"


def _location_factor(student: dict, opp: dict) -> Factor:
    scity, ocity = student.get("city", ""), opp.get("city", "")
    if opp.get("mode") == "remote":
        score, info = 100.0, "remote"
    elif scity and n(scity) == n(ocity):
        score, info = 100.0, "same_city"
    elif CITY_REGION.get(scity) and CITY_REGION.get(scity) == CITY_REGION.get(ocity):
        score, info = 60.0, "same_region"
    else:
        score, info = 20.0, "distant"
    return score, [scity] if score >= 60 else [], [], info


FACTORS = [("major", _major_factor), ("courses", _courses_factor), ("skills", _skills_factor),
           ("external", _external_factor), ("interests", _interests_factor), ("location", _location_factor)]


def compute_match(student: dict, opp: dict) -> dict:
    """Transparent weighted score: each factor's score x its weight = points; total = sum of points."""
    out, total = [], 0.0
    for key, fn in FACTORS:
        score, matched, missing, info = fn(student, opp)
        points = round(score * WEIGHTS[key] / 100, 2)
        total += points
        out.append({"key": key, "weight": WEIGHTS[key], "score": score, "points": points,
                    "matched": matched, "missing": missing, "info": info})
    return {"total": round(total, 1), "factors": out}


# ---------------- Phase 1 gap analysis: ideal profile per career track ----------------
# importance: 3 = high, 2 = medium, 1 = low
TRACKS = {
    "backend": {
        "name": "Backend Development", "name_ar": "تطوير الأنظمة الخلفية",
        "skills": [("Python", 3), ("SQL", 3), ("REST APIs", 3), ("Docker", 2), ("Git", 2), ("Node.js", 2), ("Linux", 1), ("Redis", 1)],
        "courses": [("Databases", 3), ("Data Structures", 3), ("Software Engineering", 2), ("Operating Systems", 1)],
    },
    "frontend": {
        "name": "Frontend Development", "name_ar": "تطوير الواجهات الأمامية",
        "skills": [("JavaScript", 3), ("React", 3), ("HTML", 2), ("CSS", 2), ("TypeScript", 2), ("Git", 2), ("Figma", 1), ("Testing", 1)],
        "courses": [("Web Development", 3), ("Human Computer Interaction", 2), ("Data Structures", 2)],
    },
    "data_science": {
        "name": "Data Science", "name_ar": "علم البيانات",
        "skills": [("Python", 3), ("Pandas", 3), ("SQL", 3), ("Statistics", 3), ("Machine Learning", 2), ("Data Visualization", 2), ("NumPy", 2), ("Power BI", 1)],
        "courses": [("Probability and Statistics", 3), ("Databases", 2), ("Linear Algebra", 2), ("Data Mining", 2)],
    },
    "cybersecurity": {
        "name": "Cybersecurity", "name_ar": "الأمن السيبراني",
        "skills": [("Networking", 3), ("Linux", 3), ("Penetration Testing", 3), ("Wireshark", 2), ("Python", 2), ("SIEM", 2), ("Cryptography", 2), ("Bash", 1)],
        "courses": [("Computer Networks", 3), ("Information Security", 3), ("Operating Systems", 2), ("Cryptography", 1)],
    },
    "ai_ml": {
        "name": "AI & Machine Learning", "name_ar": "الذكاء الاصطناعي وتعلم الآلة",
        "skills": [("Python", 3), ("Machine Learning", 3), ("Deep Learning", 3), ("NumPy", 2), ("PyTorch", 2), ("Statistics", 2), ("NLP", 1), ("Git", 1)],
        "courses": [("Artificial Intelligence", 3), ("Linear Algebra", 3), ("Probability and Statistics", 2), ("Machine Learning", 2)],
    },
    "devops": {
        "name": "Cloud & DevOps", "name_ar": "الحوسبة السحابية و DevOps",
        "skills": [("Linux", 3), ("Docker", 3), ("Kubernetes", 2), ("CI/CD", 3), ("AWS", 2), ("Bash", 2), ("Terraform", 1), ("Git", 2)],
        "courses": [("Operating Systems", 3), ("Computer Networks", 3), ("Cloud Computing", 2)],
    },
}

IMPORTANCE = {3: "high", 2: "medium", 1: "low"}


def _suggest(kind: str, status: str, name: str) -> tuple[str, str]:
    if kind == "skill" and status == "missing":
        return (f"Take a short course on {name} and apply it in a small portfolio project.",
                f"التحق بدورة قصيرة في {name} وطبّقها في مشروع صغير ضمن ملفك.")
    if kind == "skill":
        return (f"Deepen your {name} level by building a more advanced project.",
                f"عمّق مستواك في {name} من خلال مشروع أكثر تقدماً.")
    if status == "missing":
        return (f"Consider registering for {name} as an elective, or an equivalent online course.",
                f"فكّر في تسجيل مادة {name} كمادة اختيارية أو دورة إلكترونية مكافئة.")
    return (f"Strengthen your {name} foundation — review core topics and practice exercises.",
            f"قوِّ أساسك في {name} بمراجعة المواضيع الأساسية وحل التمارين.")


def gap_analysis(student: dict, track_key: str) -> dict:
    tr = TRACKS[track_key]
    have = skill_set(student)
    levels = {n(s["name"]): s.get("level", "intermediate") for s in student.get("skills", [])}
    courses = student.get("courses", [])
    total_w = sum(w for _, w in tr["skills"]) + sum(w for _, w in tr["courses"])
    achieved = 0.0
    gaps, strengths = [], []

    for name, w in tr["skills"]:
        if n(name) not in have:
            gaps.append(("skill", name, w, "missing", w * 1.0))
        elif levels.get(n(name)) == "beginner":
            achieved += w * 0.6
            gaps.append(("skill", name, w, "strengthen", w * 0.4))
        else:
            achieved += w
            strengths.append(name)

    for name, w in tr["courses"]:
        c = _course_match(name, courses)
        if not c:
            gaps.append(("course", name, w, "missing", w * 0.9))
        elif grade_points(c["grade"]) < 3.0:
            achieved += w * 0.5
            gaps.append(("course", name, w, "strengthen", w * 0.5))
        else:
            achieved += w
            strengths.append(f"{c['name']} ({c['grade']})")

    gaps.sort(key=lambda g: -g[4])
    items = []
    for i, (kind, name, w, status, _) in enumerate(gaps, start=1):
        en, ar = _suggest(kind, status, name)
        items.append({"rank": i, "kind": kind, "name": name, "importance": IMPORTANCE[w],
                      "status": status, "suggestion": en, "suggestion_ar": ar})
    return {
        "track_key": track_key, "track_name": tr["name"], "track_name_ar": tr["name_ar"],
        "readiness": round(100 * achieved / total_w), "strengths": strengths, "gaps": items,
    }
