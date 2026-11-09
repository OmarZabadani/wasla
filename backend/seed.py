"""Idempotent seed: demo accounts + GENERATED sample data (built from templates, clearly flagged `generated`).

Run: cd /app/backend && python seed.py
"""

import asyncio
import random
import uuid

from lib.auth import hash_password
from lib.db import db, ensure_indexes
from lib.matching import compute_match
from lib.notify import now_iso
from lib.profiles import student_out

random.seed(42)


async def upsert_user(name, email, password, role):
    u = await db.users.find_one({"email": email})
    if u:
        return u["id"]
    uid = str(uuid.uuid4())
    await db.users.insert_one({"id": uid, "name": name, "email": email, "password_hash": hash_password(password),
                               "role": role, "status": "active", "created_at": now_iso()})
    return uid


COMPANIES = [
    ("TechVentures MENA", "recruiter@techventures.jo", "Software", "Amman", "approved",
     "Product studio building SaaS platforms for MENA startups."),
    ("Orange Jordan", "hr@orange.jo", "Telecommunications", "Amman", "approved",
     "Leading telecom operator with digital, cloud and data teams."),
    ("ProgressSoft", "talent@progressoft.jo", "FinTech", "Amman", "approved",
     "Global fintech company building payment and banking systems."),
    ("CyberShield Jordan", "jobs@cybershield.jo", "Cybersecurity", "Irbid", "approved",
     "Managed security services and SOC operations."),
    ("Mawdoo3", "careers@mawdoo3.jo", "Media & AI", "Amman", "approved",
     "Largest Arabic content platform with NLP and data teams."),
    ("Aqaba Smart Logistics", "info@aqabalogistics.jo", "Logistics Tech", "Aqaba", "pending",
     "Port logistics digitization startup."),
]

OPPS = [
    ("TechVentures MENA", "Backend Developer Trainee", ["Computer Science", "Software Engineering"],
     ["Python", "SQL", "REST APIs", "Docker", "Git"], ["Databases", "Data Structures", "Software Engineering"],
     ["backend", "apis"], "Amman", "onsite"),
    ("TechVentures MENA", "Frontend React Intern", ["Software Engineering", "Computer Science", "Computer Information Systems"],
     ["JavaScript", "React", "HTML", "CSS", "Git"], ["Web Development", "Human Computer Interaction"],
     ["frontend", "design"], "Amman", "hybrid"),
    ("Orange Jordan", "Network Operations Trainee", ["Networks", "Computer Science", "Cybersecurity"],
     ["Networking", "Linux", "Bash"], ["Computer Networks", "Operating Systems"], ["devops", "security"], "Amman", "onsite"),
    ("Orange Jordan", "Data Analytics Intern", ["Data Science", "Computer Science", "Artificial Intelligence"],
     ["Python", "SQL", "Pandas", "Power BI", "Statistics"], ["Databases", "Probability and Statistics"],
     ["data", "research"], "Amman", "hybrid"),
    ("ProgressSoft", "Java Backend Trainee", ["Software Engineering", "Computer Science"],
     ["Java", "SQL", "Spring", "Git"], ["Object Oriented Programming", "Databases"], ["backend", "fintech"], "Amman", "onsite"),
    ("ProgressSoft", "QA Automation Intern", ["Software Engineering", "Computer Information Systems"],
     ["Testing", "Selenium", "Python", "Git"], ["Software Testing", "Software Engineering"], ["quality", "backend"],
     "Amman", "onsite"),
    ("CyberShield Jordan", "SOC Analyst Trainee", ["Cybersecurity", "Networks"],
     ["Networking", "SIEM", "Linux", "Wireshark"], ["Information Security", "Computer Networks"], ["security"], "Irbid", "onsite"),
    ("CyberShield Jordan", "Penetration Testing Intern", ["Cybersecurity"],
     ["Penetration Testing", "Python", "Linux", "Networking"], ["Information Security", "Cryptography"],
     ["security", "research"], "Irbid", "hybrid"),
    ("Mawdoo3", "NLP / Machine Learning Intern", ["Artificial Intelligence", "Data Science", "Computer Science"],
     ["Python", "Machine Learning", "NLP", "PyTorch"], ["Artificial Intelligence", "Linear Algebra", "Machine Learning"],
     ["ai", "research", "data"], "Amman", "remote"),
]

C = lambda name, grade, code="": {"code": code, "name": name, "grade": grade, "credit_hours": 3}  # noqa: E731
S = lambda name, level="intermediate": {"name": name, "level": level}  # noqa: E731

STUDENTS = [
    {"name": "Ahmad Al-Khalidi", "email": "ahmad@wasla.edu", "major": "Computer Science", "city": "Amman",
     "university_id": "202110345", "phone": "+962 79 555 0101", "year_level": 4,
     "bio": "Final-year CS student who enjoys building APIs and data-driven tools.",
     "courses": [C("Data Structures", "A", "CS211"), C("Databases", "B+", "CS341"), C("Web Development", "A-", "CS352"),
                 C("Software Engineering", "B", "SE301"), C("Operating Systems", "C+", "CS330"),
                 C("Object Oriented Programming", "A", "CS201"), C("Computer Networks", "B-", "CS360")],
     "skills": [S("Python", "advanced"), S("SQL"), S("REST APIs"), S("Git"), S("JavaScript"), S("React", "beginner")],
     "external_courses": [{"title": "Meta Back-End Developer", "provider": "Coursera", "year": "2024", "skills": ["Python", "REST APIs"]},
                          {"title": "Docker Essentials", "provider": "IBM", "year": "2025", "skills": ["Docker"]}],
     "projects": [{"title": "Campus Events API", "description": "FastAPI service for university events", "tech": ["Python", "FastAPI", "MongoDB"], "link": ""},
                  {"title": "Grade Tracker", "description": "React app to track semester grades", "tech": ["React", "JavaScript"], "link": ""}],
     "interests": ["backend", "apis", "fintech"],
     "languages": [{"name": "Arabic", "level": "Native"}, {"name": "English", "level": "Professional"}]},
]

TEMPLATES = [
    ("Lina Haddad", "Data Science", "Amman", ["data", "research"],
     [C("Probability and Statistics", "A"), C("Databases", "A-"), C("Linear Algebra", "B+"), C("Data Mining", "A")],
     [S("Python", "advanced"), S("Pandas", "advanced"), S("SQL"), S("Statistics"), S("Power BI")]),
    ("Omar Nasser", "Cybersecurity", "Irbid", ["security"],
     [C("Information Security", "A"), C("Computer Networks", "A-"), C("Operating Systems", "B"), C("Cryptography", "B+")],
     [S("Networking", "advanced"), S("Linux", "advanced"), S("Wireshark"), S("Penetration Testing"), S("Python", "beginner")]),
    ("Sara Al-Masri", "Software Engineering", "Zarqa", ["frontend", "design"],
     [C("Web Development", "A"), C("Human Computer Interaction", "A-"), C("Software Engineering", "B+"), C("Data Structures", "B")],
     [S("JavaScript", "advanced"), S("React"), S("HTML"), S("CSS"), S("Figma"), S("Git")]),
    ("Yousef Qasem", "Artificial Intelligence", "Salt", ["ai", "research", "data"],
     [C("Artificial Intelligence", "A"), C("Linear Algebra", "A-"), C("Machine Learning", "B+"), C("Probability and Statistics", "B")],
     [S("Python", "advanced"), S("Machine Learning"), S("PyTorch"), S("NumPy"), S("NLP", "beginner")]),
    ("Rana Abu Zaid", "Computer Information Systems", "Amman", ["quality", "backend"],
     [C("Databases", "B+"), C("Software Testing", "A-"), C("Systems Analysis", "A"), C("Web Development", "B")],
     [S("SQL"), S("Testing"), S("Selenium", "beginner"), S("Python"), S("Git")]),
    ("Khaled Shami", "Networks", "Madaba", ["devops", "security"],
     [C("Computer Networks", "A"), C("Operating Systems", "B+"), C("Cloud Computing", "B"), C("Information Security", "C+")],
     [S("Networking", "advanced"), S("Linux"), S("Bash"), S("Docker", "beginner"), S("AWS", "beginner")]),
    ("Dana Odeh", "Software Engineering", "Irbid", ["backend", "fintech"],
     [C("Object Oriented Programming", "A"), C("Databases", "A-"), C("Software Engineering", "A"), C("Data Structures", "B+")],
     [S("Java", "advanced"), S("Spring"), S("SQL"), S("Git"), S("Docker")]),
]

QUESTIONS = [
    ("Which type of work excites you most?", "ما نوع العمل الذي يثير اهتمامك أكثر؟",
     [("backend", "Building servers and APIs", "بناء الخوادم وواجهات البرمجة"),
      ("frontend", "Designing user interfaces", "تصميم واجهات المستخدم"),
      ("data", "Analyzing data and finding insights", "تحليل البيانات واستخلاص النتائج"),
      ("security", "Protecting systems from attacks", "حماية الأنظمة من الهجمات")]),
    ("Which domain would you like to train in?", "في أي مجال تود التدرّب؟",
     [("fintech", "Banking & FinTech", "البنوك والتقنية المالية"), ("ai", "AI products", "منتجات الذكاء الاصطناعي"),
      ("devops", "Telecom & infrastructure", "الاتصالات والبنية التحتية"), ("design", "Digital products & UX", "المنتجات الرقمية وتجربة المستخدم")]),
    ("How do you prefer to solve problems?", "كيف تفضّل حل المشكلات؟",
     [("research", "Research and experiment", "البحث والتجربة"), ("quality", "Test and verify carefully", "الاختبار والتحقق بعناية"),
      ("apis", "Integrate existing tools", "دمج الأدوات الموجودة")]),
    ("Which training mode suits you?", "ما نمط التدريب المناسب لك؟",
     [("onsite", "On-site at the company", "حضوري في الشركة"), ("remote", "Remote", "عن بُعد"), ("hybrid", "Hybrid", "مدمج")]),
]


async def main():
    await ensure_indexes()
    admin_id = await upsert_user("Dr. Nadia Saleh", "admin@wasla.edu", "Admin@123", "admin")

    company_ids = {}
    for name, email, industry, city, status, desc in COMPANIES:
        uid = await upsert_user(f"{name} Recruiter", email, "Company@123", "company")
        c = await db.companies.find_one({"user_id": uid})
        if not c:
            c = {"id": str(uuid.uuid4()), "user_id": uid, "company_name": name, "industry": industry, "city": city,
                 "description": desc, "website": "", "size": "50-200", "approval_status": status, "created_at": now_iso()}
            await db.companies.insert_one(dict(c))
        company_ids[name] = c["id"]
    # Seeded companies use made-up addresses → flag them so they are never emailed.
    await db.companies.update_many({"id": {"$in": list(company_ids.values())}}, {"$set": {"generated": True}})

    opps = []
    for cname, title, majors, skills, courses, tags, city, mode in OPPS:
        o = await db.opportunities.find_one({"company_id": company_ids[cname], "title": title}, {"_id": 0})
        if not o:
            o = {"id": str(uuid.uuid4()), "company_id": company_ids[cname], "company_name": cname, "title": title,
                 "description": f"{title} at {cname}: hands-on field training with a dedicated mentor, weekly reviews and a final project.",
                 "majors": majors, "required_skills": skills, "related_courses": courses, "tags": tags, "city": city,
                 "mode": mode, "duration_weeks": random.choice([8, 10, 12]), "seats": random.choice([2, 3, 4]),
                 "status": "open", "created_at": now_iso()}
            await db.opportunities.insert_one(dict(o))
        opps.append(o)

    for i, (name, major, city, interests, courses, skills) in enumerate(TEMPLATES):
        STUDENTS.append({"name": name, "email": f"student{i + 1}@wasla.edu", "major": major, "city": city,
                         "university_id": f"2021{10400 + i}", "phone": f"+962 79 555 02{i:02d}", "year_level": 4,
                         "bio": f"Generated sample profile ({major}).", "courses": courses, "skills": skills,
                         "external_courses": [], "projects": [], "interests": interests,
                         "languages": [{"name": "Arabic", "level": "Native"}, {"name": "English", "level": "Good"}]})

    students = []
    for sd in STUDENTS:
        uid = await upsert_user(sd["name"], sd["email"], "Student@123", "student")
        s = await db.students.find_one({"user_id": uid}, {"_id": 0})
        if not s:
            s = {"id": str(uuid.uuid4()), "user_id": uid, "answers": {}, "generated": True, **sd}
            await db.students.insert_one(dict(s))
        students.append(s)

    qids = []
    for i, (text, text_ar, options) in enumerate(QUESTIONS):
        q = await db.questions.find_one({"text": text})
        if not q:
            q = {"id": str(uuid.uuid4()), "text": text, "text_ar": text_ar, "active": True, "order": i,
                 "options": [{"value": v, "label": lbl, "label_ar": la} for v, lbl, la in options]}
            await db.questions.insert_one(dict(q))
        qids.append(q["id"])

    # Generated sample applications for the non-demo students (Ahmad starts with a clean slate).
    statuses = ["pending", "accepted", "rejected", "pending", "accepted", "pending", "rejected"]
    for i, s in enumerate(students[1:]):
        so = student_out(s)
        ranked = sorted(opps, key=lambda o: -compute_match(so, o)["total"])
        for j, o in enumerate(ranked[:2]):
            if await db.applications.find_one({"student_id": s["id"], "opportunity_id": o["id"]}):
                continue
            ts = now_iso()
            st = statuses[(i + j) % len(statuses)]
            await db.applications.insert_one({
                "id": str(uuid.uuid4()), "student_id": s["id"], "student_name": s["name"], "opportunity_id": o["id"],
                "opportunity_title": o["title"], "company_id": o["company_id"], "company_name": o["company_name"],
                "status": st, "match_score": compute_match(so, o)["total"], "cover_note": "Generated sample application.",
                "created_at": ts, "updated_at": ts,
                "evaluation": {"score": 88, "comments": "Reliable and quick learner."} if st == "accepted" and j == 0 else None})

    print(f"Seeded: admin={admin_id[:8]} companies={len(company_ids)} opps={len(opps)} students={len(students)} questions={len(qids)}")


if __name__ == "__main__":
    asyncio.run(main())
