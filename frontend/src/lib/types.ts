// Hand-written mirrors of backend/models/schemas.py — keep in sync.
export type Role = "student" | "company" | "admin";
export type AppStatus = "pending" | "accepted" | "rejected";

export interface UserOut {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: "active" | "suspended";
  created_at: string;
}

export interface Me {
  user: UserOut;
  company_status: string | null;
  unread: number;
}

export interface Course { code: string; name: string; grade: string; credit_hours: number }
export interface ExternalCourse { title: string; provider: string; year: string; skills: string[] }
export interface Skill { name: string; level: "beginner" | "intermediate" | "advanced" }
export interface Project { title: string; description: string; tech: string[]; link: string }
export interface Language { name: string; level: string }

export interface StudentProfileIn {
  phone: string;
  university_id: string;
  major: string;
  year_level: number;
  city: string;
  bio: string;
  languages: Language[];
  courses: Course[];
  external_courses: ExternalCourse[];
  skills: Skill[];
  projects: Project[];
  interests: string[];
}

export interface EmailPrefs { status_updates: boolean; new_opportunities: boolean; weekly_digest: boolean }
export interface CompanyEmailPrefs { new_applications: boolean }

export interface StudentProfile extends StudentProfileIn {
  id: string;
  user_id: string;
  name: string;
  email: string;
  region: string;
  gpa: number;
  answers: Record<string, string>;
  generated: boolean;
  completeness: number;
  email_prefs: EmailPrefs;
}

export interface CompanyIn {
  company_name: string;
  industry: string;
  city: string;
  description: string;
  website: string;
  size: string;
}

export interface Company extends CompanyIn {
  id: string;
  user_id: string;
  region: string;
  approval_status: "pending" | "approved" | "rejected";
  created_at: string;
  generated: boolean;
  email_prefs: CompanyEmailPrefs;
}

export type Mode = "onsite" | "remote" | "hybrid";

export interface OpportunityIn {
  title: string;
  description: string;
  majors: string[];
  required_skills: string[];
  related_courses: string[];
  tags: string[];
  city: string;
  mode: Mode;
  duration_weeks: number;
  seats: number;
  status: "open" | "closed";
}

export interface Opportunity extends OpportunityIn {
  id: string;
  company_id: string;
  company_name: string;
  region: string;
  created_at: string;
  applicants_count: number;
}

export type FactorKey = "major" | "courses" | "skills" | "external" | "interests" | "location";

export interface Factor {
  key: FactorKey;
  weight: number;
  score: number;
  points: number;
  matched: string[];
  missing: string[];
  info: string;
}

export interface MatchResult { total: number; factors: Factor[] }

export interface Recommendation {
  opportunity: Opportunity;
  match: MatchResult;
  application_status: AppStatus | null;
}

export interface Evaluation { score: number; comments: string }

export interface Application {
  id: string;
  student_id: string;
  student_name: string;
  opportunity_id: string;
  opportunity_title: string;
  company_id: string;
  company_name: string;
  status: AppStatus;
  match_score: number;
  cover_note: string;
  created_at: string;
  updated_at: string;
  evaluation: Evaluation | null;
}

export interface Applicant { application: Application; student: StudentProfile; match: MatchResult }
export interface StudentSearchResult { student: StudentProfile; match: MatchResult | null }

export interface CVContent {
  name: string;
  email: string;
  phone: string;
  city: string;
  major: string;
  university: string;
  year_level: number;
  gpa: number;
  summary: string;
  objective: string;
  courses: Course[];
  skills: Skill[];
  external_courses: ExternalCourse[];
  projects: Project[];
  languages: Language[];
  interests: string[];
}

export interface CV {
  id: string;
  student_id: string;
  lang: "en" | "ar";
  content: CVContent;
  approved: boolean;
  ai_generated: boolean;
  generated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  link: string;
  kind: string;
  read: boolean;
  created_at: string;
  email_status: "queued" | "sent" | "failed" | "skipped" | "off" | null;
}

export interface QOption { value: string; label: string; label_ar: string }
export interface QuestionIn { text: string; text_ar: string; options: QOption[]; active: boolean; order: number }
export interface Question extends QuestionIn { id: string }

export interface GapItem {
  rank: number;
  kind: "skill" | "course";
  name: string;
  importance: "high" | "medium" | "low";
  status: "missing" | "strengthen";
  suggestion: string;
  suggestion_ar: string;
}

export interface GapReport {
  track_key: string;
  track_name: string;
  track_name_ar: string;
  readiness: number;
  strengths: string[];
  gaps: GapItem[];
}

export interface Track { key: string; name: string; name_ar: string }
export interface Meta { majors: string[]; cities: string[]; tracks: Track[]; weights: Record<string, number> }
export interface PublicStats { students: number; companies: number; opportunities: number; applications: number }

export interface LabelCount { label: string; count: number }
export interface MajorRow { major: string; students: number; applied: number; accepted: number }
export interface CompanyRow { company: string; opportunities: number; applications: number; accepted: number }
export interface Reports {
  students: number;
  companies: number;
  pending_companies: number;
  opportunities: number;
  applications: number;
  accepted: number;
  participation_rate: number;
  by_status: LabelCount[];
  by_major: MajorRow[];
  top_skills: LabelCount[];
  by_company: CompanyRow[];
}
