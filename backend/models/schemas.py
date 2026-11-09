from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field

Role = Literal["student", "company", "admin"]
AppStatus = Literal["pending", "accepted", "rejected"]


# ---------- auth / users ----------
class UserOut(BaseModel):
    id: str
    name: str
    email: str
    role: Role
    status: Literal["active", "suspended"]
    created_at: str


class RegisterIn(BaseModel):
    name: str = Field(min_length=2)
    email: EmailStr
    password: str = Field(min_length=6)
    role: Literal["student", "company"]
    major: str = ""
    university_id: str = ""
    city: str = "Amman"
    company_name: str = ""
    industry: str = ""


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class MeOut(BaseModel):
    user: UserOut
    company_status: Optional[str] = None
    unread: int = 0


# ---------- student profile ----------
class Course(BaseModel):
    code: str = ""
    name: str
    grade: str
    credit_hours: int = 3


class ExternalCourse(BaseModel):
    title: str
    provider: str = ""
    year: str = ""
    skills: list[str] = []


class Skill(BaseModel):
    name: str
    level: Literal["beginner", "intermediate", "advanced"] = "intermediate"


class Project(BaseModel):
    title: str
    description: str = ""
    tech: list[str] = []
    link: str = ""


class Language(BaseModel):
    name: str
    level: str = ""


class StudentProfileIn(BaseModel):
    phone: str = ""
    university_id: str = ""
    major: str = ""
    year_level: int = 3
    city: str = ""
    bio: str = ""
    languages: list[Language] = []
    courses: list[Course] = []
    external_courses: list[ExternalCourse] = []
    skills: list[Skill] = []
    projects: list[Project] = []
    interests: list[str] = []


class EmailPrefs(BaseModel):
    status_updates: bool = True
    new_opportunities: bool = True
    weekly_digest: bool = True


class StudentProfile(StudentProfileIn):
    id: str
    user_id: str
    name: str
    email: str
    region: str = ""
    gpa: float = 0
    answers: dict[str, str] = {}
    generated: bool = False
    completeness: int = 0
    email_prefs: EmailPrefs = EmailPrefs()


class AnswersIn(BaseModel):
    answers: dict[str, str]


# ---------- company / opportunities ----------
class CompanyIn(BaseModel):
    company_name: str = Field(min_length=2)
    industry: str = ""
    city: str = ""
    description: str = ""
    website: str = ""
    size: str = ""


class CompanyEmailPrefs(BaseModel):
    new_applications: bool = True


class Company(CompanyIn):
    id: str
    user_id: str
    region: str = ""
    approval_status: Literal["pending", "approved", "rejected"]
    created_at: str
    generated: bool = False
    email_prefs: CompanyEmailPrefs = CompanyEmailPrefs()


class OpportunityIn(BaseModel):
    title: str = Field(min_length=3)
    description: str = ""
    majors: list[str] = []
    required_skills: list[str] = []
    related_courses: list[str] = []
    tags: list[str] = []
    city: str = "Amman"
    mode: Literal["onsite", "remote", "hybrid"] = "onsite"
    duration_weeks: int = 8
    seats: int = 2
    status: Literal["open", "closed"] = "open"


class Opportunity(OpportunityIn):
    id: str
    company_id: str
    company_name: str
    region: str = ""
    created_at: str
    applicants_count: int = 0


class Factor(BaseModel):
    key: Literal["major", "courses", "skills", "external", "interests", "location"]
    weight: int
    score: float
    points: float
    matched: list[str]
    missing: list[str]
    info: str


class MatchResult(BaseModel):
    total: float
    factors: list[Factor]


class Recommendation(BaseModel):
    opportunity: Opportunity
    match: MatchResult
    application_status: Optional[AppStatus] = None


# ---------- applications ----------
class ApplicationIn(BaseModel):
    opportunity_id: str
    cover_note: str = ""


class Evaluation(BaseModel):
    score: int = Field(ge=0, le=100)
    comments: str = ""


class Application(BaseModel):
    id: str
    student_id: str
    student_name: str
    opportunity_id: str
    opportunity_title: str
    company_id: str
    company_name: str
    status: AppStatus
    match_score: float
    cover_note: str = ""
    created_at: str
    updated_at: str
    evaluation: Optional[Evaluation] = None


class Applicant(BaseModel):
    application: Application
    student: StudentProfile
    match: MatchResult


class StatusIn(BaseModel):
    status: AppStatus


class StudentSearchResult(BaseModel):
    student: StudentProfile
    match: Optional[MatchResult] = None


# ---------- CV ----------
class CVContent(BaseModel):
    name: str
    email: str
    phone: str = ""
    city: str = ""
    major: str = ""
    university: str = "Applied Science Private University"
    year_level: int = 3
    gpa: float = 0
    summary: str
    objective: str
    courses: list[Course] = []
    skills: list[Skill] = []
    external_courses: list[ExternalCourse] = []
    projects: list[Project] = []
    languages: list[Language] = []
    interests: list[str] = []


class CV(BaseModel):
    id: str
    student_id: str
    lang: Literal["en", "ar"] = "en"
    content: CVContent
    approved: bool = False
    ai_generated: bool = False
    generated_at: str


class CVUpdate(BaseModel):
    summary: str
    objective: str
    approved: bool = False


# ---------- notifications ----------
class Notification(BaseModel):
    id: str
    user_id: str
    title: str
    body: str
    link: str = ""
    kind: str = "info"
    read: bool = False
    created_at: str
    email_status: Optional[Literal["queued", "sent", "failed", "skipped", "off"]] = None


# ---------- AI profiling questions ----------
class QOption(BaseModel):
    value: str
    label: str
    label_ar: str = ""


class QuestionIn(BaseModel):
    text: str = Field(min_length=3)
    text_ar: str = ""
    options: list[QOption] = []
    active: bool = True
    order: int = 0


class Question(QuestionIn):
    id: str


# ---------- gap analysis ----------
class GapItem(BaseModel):
    rank: int
    kind: Literal["skill", "course"]
    name: str
    importance: Literal["high", "medium", "low"]
    status: Literal["missing", "strengthen"]
    suggestion: str
    suggestion_ar: str


class GapReport(BaseModel):
    track_key: str
    track_name: str
    track_name_ar: str
    readiness: int
    strengths: list[str]
    gaps: list[GapItem]


class Track(BaseModel):
    key: str
    name: str
    name_ar: str


# ---------- meta / reports ----------
class Meta(BaseModel):
    majors: list[str]
    cities: list[str]
    tracks: list[Track]
    weights: dict[str, int]


class PublicStats(BaseModel):
    students: int
    companies: int
    opportunities: int
    applications: int


class LabelCount(BaseModel):
    label: str
    count: int


class MajorRow(BaseModel):
    major: str
    students: int
    applied: int
    accepted: int


class CompanyRow(BaseModel):
    company: str
    opportunities: int
    applications: int
    accepted: int


class Reports(BaseModel):
    students: int
    companies: int
    pending_companies: int
    opportunities: int
    applications: int
    accepted: int
    participation_rate: float
    by_status: list[LabelCount]
    by_major: list[MajorRow]
    top_skills: list[LabelCount]
    by_company: list[CompanyRow]


class StatusUpdate(BaseModel):
    status: str
