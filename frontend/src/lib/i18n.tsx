import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "en" | "ar";

// English strings are the keys; missing Arabic entries fall back to English.
const AR: Record<string, string> = {
  // nav / shell
  "Dashboard": "لوحة التحكم", "Academic profile": "الملف الأكاديمي", "Recommendations": "التوصيات",
  "My applications": "طلباتي", "AI CV": "السيرة الذاتية الذكية", "Development": "التطوير", "Find students": "البحث عن طلاب",
  "University admin": "إدارة الجامعة", "Student": "طالب", "Company": "شركة", "Sign out": "تسجيل الخروج",
  "Notifications": "الإشعارات", "Mark all read": "تعليم الكل كمقروء", "No notifications yet": "لا توجد إشعارات بعد",
  "View all": "عرض الكل", "Application updates and new opportunities.": "تحديثات الطلبات والفرص الجديدة.",
  // landing
  "Sign in": "تسجيل الدخول", "Applied Science Private University · Faculty of IT": "جامعة العلوم التطبيقية الخاصة · كلية تكنولوجيا المعلومات",
  "Field training matched on criteria,": "تدريب ميداني مبني على معايير واضحة،", "not connections.": "لا على الواسطة.",
  "Wasla connects students, companies and the university. Every opportunity gets a transparent match score built from your major, grades, skills, certificates, interests and location.":
    "وصلة تربط الطلاب والشركات والجامعة. كل فرصة تحصل على نسبة توافق شفافة مبنية على تخصصك وعلاماتك ومهاراتك وشهاداتك واهتماماتك وموقعك.",
  "Create an account": "إنشاء حساب", "Try a demo account": "جرّب حساباً تجريبياً", "Students": "الطلاب", "Companies": "الشركات",
  "Open roles": "فرص متاحة", "Applications": "الطلبات", "The match formula": "معادلة التوافق",
  "Visible to students and companies on every opportunity.": "ظاهرة للطلاب والشركات في كل فرصة.",
  "Build an academic profile, get an AI-assisted CV and a ranked list of training opportunities — with the reason behind every score.":
    "ابنِ ملفك الأكاديمي، واحصل على سيرة ذاتية بمساعدة الذكاء الاصطناعي وقائمة مرتبة بفرص التدريب — مع سبب كل نتيجة.",
  "Post training opportunities, search students by major, skills and location, and review applicants ranked by match.":
    "انشر فرص التدريب، وابحث عن الطلاب حسب التخصص والمهارات والموقع، وراجع المتقدمين مرتبين حسب التوافق.",
  "University": "الجامعة",
  "Approve companies, manage questions and opportunities, and follow field-training participation with live reports.":
    "اعتمد الشركات، وأدر الأسئلة والفرص، وتابع المشاركة في التدريب الميداني بتقارير مباشرة.",
  "Open training opportunities": "فرص التدريب المتاحة",
  "Sign in as a student to see your personal match score for each one.": "سجّل الدخول كطالب لرؤية نسبة توافقك مع كل فرصة.",
  "Opportunities will appear here when the service is online.": "ستظهر الفرص هنا عند تشغيل الخدمة.",
  "AI roadmap — stated honestly": "خارطة طريق الذكاء الاصطناعي — بكل وضوح",
  "Phase 1 · live": "المرحلة 1 · مفعّلة", "Phase 2 · planned": "المرحلة 2 · مخطط لها", "Phase 3 · planned": "المرحلة 3 · مخطط لها",
  "Gap analysis without machine learning: compare your profile with an ideal profile per career track and rank development opportunities.":
    "تحليل الفجوات دون تعلم آلة: مقارنة ملفك بالملف المثالي لكل مسار مهني وترتيب فرص التطوير.",
  "A small NumPy neural network learns each skill's importance, starting from the formula weights (manual forward and backward passes).":
    "شبكة عصبية بسيطة بـ NumPy تتعلم أهمية كل مهارة، بدءاً من أوزان المعادلة (انتشار أمامي وخلفي يدوي).",
  "Training on real admission/rejection decisions and company ratings — the point where the AI becomes truly data-driven.":
    "التدريب على قرارات القبول والرفض الحقيقية وتقييمات الشركات — عندها يصبح النظام معتمداً فعلاً على البيانات.",
  "Graduation Project": "مشروع تخرج",
  "Sample data is generated from templates. Recommendations currently use a transparent weighted formula — not a trained ML model. The AI becomes truly data-driven only after learning from real admission decisions.":
    "البيانات التجريبية مولّدة من قوالب. تعتمد التوصيات حالياً على معادلة أوزان شفافة — وليس نموذج تعلم آلة مدرّباً. يصبح الذكاء الاصطناعي معتمداً على البيانات فقط بعد التعلم من قرارات قبول حقيقية.",
  "Generated sample": "عينة مولّدة",
  // factors
  "Major / specialization": "التخصص", "University courses & grades": "المواد الجامعية والعلامات", "Skill match": "تطابق المهارات",
  "External courses & certificates": "الدورات والشهادات الخارجية", "Interests & questionnaire": "الاهتمامات والاستبيان", "Location": "الموقع",
  "Exact major match": "تطابق تام في التخصص", "Related computing major (partial credit)": "تخصص حوسبة قريب (درجة جزئية)",
  "Major not in the accepted list": "التخصص غير مدرج", "Same city": "نفس المدينة", "Same region (nearby)": "نفس الإقليم (قريب)",
  "Different region": "إقليم مختلف", "Remote opportunity": "فرصة عن بُعد", "Why this score?": "لماذا هذه النتيجة؟",
  "Transparent weighted formula: each criterion's score × its weight = points. Total = sum of points.":
    "معادلة أوزان شفافة: نتيجة كل معيار × وزنه = النقاط. المجموع = مجموع النقاط.",
  "✓ = matched · + = would raise the score": "✓ = متطابق · + = يرفع النتيجة",
  // auth
  "Welcome back": "مرحباً بعودتك", "Sign in to continue to Wasla.": "سجّل الدخول للمتابعة إلى وصلة.", "Email": "البريد الإلكتروني",
  "Password": "كلمة المرور", "Signing in…": "جارٍ تسجيل الدخول…", "Demo accounts": "حسابات تجريبية", "New to Wasla?": "جديد على وصلة؟",
  "One platform for students, companies and the university.": "منصة واحدة للطلاب والشركات والجامعة.",
  "Transparent matching, AI-assisted CVs and supervised field training — all in one place.": "توافق شفاف، وسير ذاتية بمساعدة الذكاء الاصطناعي، وتدريب ميداني بإشراف الجامعة — في مكان واحد.",
  "Create your account": "أنشئ حسابك", "Full name": "الاسم الكامل", "Contact person name": "اسم الشخص المسؤول", "Major": "التخصص",
  "University ID": "الرقم الجامعي", "Company name": "اسم الشركة", "Industry": "القطاع", "City": "المدينة",
  "Company accounts are reviewed by the university before they can post opportunities.": "تراجع الجامعة حسابات الشركات قبل السماح لها بنشر الفرص.",
  "Creating…": "جارٍ الإنشاء…", "Create account": "إنشاء الحساب", "Already have an account?": "لديك حساب؟", "Account created": "تم إنشاء الحساب",
  "Invalid email or password": "البريد الإلكتروني أو كلمة المرور غير صحيحة", "Email already registered": "البريد الإلكتروني مسجل مسبقاً",
  "Something went wrong": "حدث خطأ ما", "Account suspended": "الحساب موقوف",
  // majors
  "Computer Science": "علم الحاسوب", "Software Engineering": "هندسة البرمجيات", "Cybersecurity": "الأمن السيبراني",
  "Data Science": "علم البيانات", "Artificial Intelligence": "الذكاء الاصطناعي", "Computer Information Systems": "نظم المعلومات الحاسوبية", "Networks": "الشبكات",
  // student dashboard
  "Welcome, {name}": "أهلاً، {name}", "Your field-training journey at a glance.": "رحلتك في التدريب الميداني بنظرة سريعة.",
  "Profile completeness": "اكتمال الملف", "Complete your academic profile": "أكمل ملفك الأكاديمي", "Top matches for you": "أفضل الفرص المناسبة لك",
  "See all": "عرض الكل", "Accepted": "مقبول", "Development opportunities": "فرص التطوير", "Closest track": "المسار الأقرب", "ready": "جاهزية",
  "Opportunities to develop your profile": "فرص لتطوير ملفك", ", then ": "، ثم ", "Explore tracks": "استكشف المسارات",
  "Your CV is approved and ready.": "سيرتك الذاتية معتمدة وجاهزة.", "Draft generated — review and approve it.": "تم إنشاء مسودة — راجعها واعتمدها.",
  "Generate a professional CV from your profile.": "أنشئ سيرة ذاتية احترافية من ملفك.", "Open CV": "فتح السيرة الذاتية", "Generate CV": "إنشاء السيرة الذاتية",
  // profile
  "The more complete your profile, the more accurate your match scores and CV.": "كلما اكتمل ملفك، زادت دقة نسب التوافق وسيرتك الذاتية.",
  "Personal": "البيانات الشخصية", "Courses & grades": "المواد والعلامات", "External courses": "الدورات الخارجية", "Skills": "المهارات",
  "Projects": "المشاريع", "Interests": "الاهتمامات", "AI profiling questions": "أسئلة التوصيف الذكي", "Phone": "الهاتف", "Academic year": "السنة الدراسية",
  "City of residence": "مدينة السكن", "Short bio": "نبذة قصيرة", "Languages": "اللغات", "Language": "اللغة", "Level": "المستوى",
  "Add language": "إضافة لغة", "Code": "الرمز", "Course name": "اسم المادة", "Add course": "إضافة مادة", "Course / certificate title": "عنوان الدورة / الشهادة",
  "Provider": "الجهة المانحة", "Year": "السنة", "Skills covered (Enter to add)": "المهارات المغطاة (Enter للإضافة)", "Add external course": "إضافة دورة خارجية",
  "Skill": "المهارة", "beginner": "مبتدئ", "intermediate": "متوسط", "advanced": "متقدم", "Add skill": "إضافة مهارة", "Project title": "عنوان المشروع",
  "Link (optional)": "رابط (اختياري)", "Description": "الوصف", "Technologies (Enter to add)": "التقنيات (Enter للإضافة)", "Add project": "إضافة مشروع",
  "Interests (e.g. backend, data, security, ai, fintech)": "الاهتمامات (مثل backend، data، security، ai، fintech)",
  "These questions fill in what your courses don't say. Your answers feed the 10% interests criterion.": "تكمل هذه الأسئلة ما لا تقوله موادك. إجاباتك تغذي معيار الاهتمامات (10%).",
  "Save answers": "حفظ الإجابات", "Answers saved": "تم حفظ الإجابات", "Saving…": "جارٍ الحفظ…", "Save profile": "حفظ الملف", "Profile saved": "تم حفظ الملف",
  "Type and press Enter": "اكتب واضغط Enter",
  // opportunities
  "Recommended opportunities": "الفرص المقترحة", "Ranked by your match score. Open “Why this score?” to see exactly how each criterion contributed.":
    "مرتبة حسب نسبة توافقك. افتح «لماذا هذه النتيجة؟» لترى مساهمة كل معيار بدقة.",
  "Search title, company or skill": "ابحث بالعنوان أو الشركة أو المهارة", "All modes": "كل الأنماط", "onsite": "حضوري", "hybrid": "مدمج", "remote": "عن بُعد",
  "No opportunities match your filters.": "لا توجد فرص تطابق عوامل التصفية.", "weeks": "أسابيع", "seats": "مقاعد", "Apply": "تقدّم",
  "Apply to": "التقدم إلى", "Your match score": "نسبة توافقك", "Short note to the company (optional)": "ملاحظة قصيرة للشركة (اختياري)", "Cancel": "إلغاء",
  "Submitting…": "جارٍ الإرسال…", "Submit application": "إرسال الطلب", "Application submitted": "تم إرسال الطلب",
  "You already applied to this opportunity": "لقد تقدمت لهذه الفرصة مسبقاً",
  // applications
  "Track the status of every training application.": "تابع حالة كل طلب تدريب.", "pending": "قيد المراجعة", "accepted": "مقبول", "rejected": "مرفوض",
  "approved": "معتمد", "open": "مفتوحة", "closed": "مغلقة", "active": "نشط", "suspended": "موقوف",
  "You haven't applied yet. Explore your recommendations to get started.": "لم تتقدم بعد. استكشف التوصيات للبدء.",
  "Opportunity": "الفرصة", "Match": "التوافق", "Applied": "تقدّم", "Status": "الحالة", "Evaluation": "التقييم",
  // CV
  "Built from your profile using a structured template, with AI-assisted wording (Claude Sonnet 4.5).": "مبنية من ملفك باستخدام قالب منظم، مع صياغة بمساعدة الذكاء الاصطناعي (Claude Sonnet 4.5).",
  "Generating…": "جارٍ الإنشاء…", "Regenerate": "إعادة الإنشاء", "Print / PDF": "طباعة / PDF", "No CV yet": "لا توجد سيرة ذاتية بعد",
  "Choose a language and press Generate CV. It takes about 10–20 seconds.": "اختر اللغة واضغط إنشاء السيرة الذاتية. يستغرق ذلك 10–20 ثانية تقريباً.",
  "AI-assisted": "بمساعدة الذكاء الاصطناعي", "Template only": "قالب فقط", "Approved": "معتمدة", "Review the draft": "راجع المسودة",
  "AI text is a draft. Check every line — you must approve your CV before sharing it.": "نص الذكاء الاصطناعي مسودة. راجع كل سطر — يجب اعتماد سيرتك قبل مشاركتها.",
  "Professional summary": "الملخص المهني", "Career objective": "الهدف المهني", "I reviewed and approve this CV": "راجعت هذه السيرة وأعتمدها",
  "Save changes": "حفظ التغييرات", "CV saved": "تم حفظ السيرة الذاتية", "CV generated with AI": "تم إنشاء السيرة بالذكاء الاصطناعي",
  "CV generated from template (AI unavailable)": "تم إنشاء السيرة من القالب (الذكاء الاصطناعي غير متاح)",
  // growth
  "Compare your profile with the ideal profile of each career track and see what to develop next.": "قارن ملفك بالملف المثالي لكل مسار مهني واعرف ما تطوره لاحقاً.",
  "Phase 1: rule-based comparison and ranking against a defined ideal profile — no machine learning yet.": "المرحلة 1: مقارنة وترتيب قائم على قواعد مقابل ملف مثالي محدد — دون تعلم آلة حتى الآن.",
  "strengthening": "تعزيز", "Your profile already covers this track's ideal profile.": "ملفك يغطي الملف المثالي لهذا المسار.",
  "high": "عالية", "medium": "متوسطة", "low": "منخفضة", "To develop": "للتطوير", "To strengthen": "للتعزيز",
  // company
  "Edit profile": "تعديل الملف", "Post opportunity": "نشر فرصة", "Your company is awaiting university approval. You can post opportunities once approved.":
    "شركتك بانتظار اعتماد الجامعة. يمكنك نشر الفرص بعد الاعتماد.",
  "Your company registration was rejected by the university. Contact the field training office.": "رفضت الجامعة تسجيل شركتك. تواصل مع مكتب التدريب الميداني.",
  "Opportunities": "الفرص", "Your opportunities": "فرصك", "No opportunities posted yet.": "لم تنشر أي فرص بعد.", "applicants": "متقدمين",
  "Close": "إغلاق", "Reopen": "إعادة فتح", "Delete this opportunity and its applications?": "حذف هذه الفرصة وطلباتها؟", "Recent applications": "أحدث الطلبات",
  "No applications yet.": "لا توجد طلبات بعد.", "Opportunity saved": "تم حفظ الفرصة", "Opportunity deleted": "تم حذف الفرصة", "Company profile": "ملف الشركة",
  "Size": "الحجم", "Website": "الموقع الإلكتروني", "Save": "حفظ", "Edit opportunity": "تعديل الفرصة", "Post a training opportunity": "نشر فرصة تدريب",
  "Title": "العنوان", "Accepted majors": "التخصصات المقبولة", "Required skills": "المهارات المطلوبة", "Related university courses": "المواد الجامعية ذات الصلة",
  "Interest tags": "وسوم الاهتمامات", "Mode": "النمط", "Duration (weeks)": "المدة (أسابيع)", "Seats": "المقاعد",
  "Applicants": "المتقدمون", "Applicants ranked by match score. Every score is explainable.": "المتقدمون مرتبون حسب نسبة التوافق. كل نتيجة قابلة للتفسير.",
  "Back": "رجوع", "No applicants yet.": "لا يوجد متقدمون بعد.", "Accept": "قبول", "Reject": "رفض", "Reset": "إعادة", "Evaluate": "تقييم",
  "Status updated": "تم تحديث الحالة", "Evaluation saved": "تم حفظ التقييم", "Trainee evaluation": "تقييم المتدرب", "Score (0–100)": "الدرجة (0–100)",
  "Comments": "الملاحظات", "Save evaluation": "حفظ التقييم", "Contact": "التواصل",
  "Search by specialization, skills and location. Pick one of your opportunities to rank students by match score.": "ابحث حسب التخصص والمهارات والموقع. اختر إحدى فرصك لترتيب الطلاب حسب التوافق.",
  "All majors": "كل التخصصات", "All cities": "كل المدن", "Rank against opportunity": "الترتيب مقابل فرصة", "None (sort by GPA)": "بدون (حسب المعدل)",
  "Searching…": "جارٍ البحث…", "students found": "طالب", "No students match these filters.": "لا يوجد طلاب يطابقون عوامل التصفية.",
  "Your company must be approved by the university before posting": "يجب أن تعتمد الجامعة شركتك قبل النشر",
  "Only accepted trainees can be evaluated": "يمكن تقييم المتدربين المقبولين فقط",
  // admin
  "Supervise field training: users, companies, opportunities, AI questions and reports.": "أشرف على التدريب الميداني: المستخدمون والشركات والفرص وأسئلة الذكاء الاصطناعي والتقارير.",
  "Reports": "التقارير", "Users": "المستخدمون", "AI questions": "أسئلة الذكاء الاصطناعي", "Approved companies": "الشركات المعتمدة",
  "Participation rate": "نسبة المشاركة", "students with ≥1 application": "طلاب لديهم طلب واحد على الأقل",
  "Field-training participation by major": "المشاركة في التدريب الميداني حسب التخصص", "Applications by status": "الطلبات حسب الحالة",
  "Most requested skills": "المهارات الأكثر طلباً", "Company participation": "مشاركة الشركات", "Search users": "ابحث عن مستخدمين",
  "Name": "الاسم", "Role": "الدور", "Joined": "تاريخ الانضمام", "Suspend": "إيقاف", "Activate": "تفعيل", "User updated": "تم تحديث المستخدم",
  "Registered": "تاريخ التسجيل", "Approve": "اعتماد", "Company updated": "تم تحديث الشركة", "Opportunity updated": "تم تحديث الفرصة",
  "Add question": "إضافة سؤال", "Delete this question?": "حذف هذا السؤال؟", "Question saved": "تم حفظ السؤال", "Question deleted": "تم حذف السؤال",
  "New AI profiling question": "سؤال توصيف جديد", "Edit question": "تعديل السؤال", "Question (English)": "السؤال (بالإنجليزية)",
  "Question (Arabic)": "السؤال (بالعربية)", "Options — one per line: tag | English label | Arabic label": "الخيارات — سطر لكل خيار: الوسم | النص الإنجليزي | النص العربي",
  "The tag is matched against opportunity interest tags (10% criterion).": "يُطابق الوسم مع وسوم اهتمامات الفرص (معيار 10%).",
  "Active": "نشط", "Order": "الترتيب",
  // email alerts
  "Email alerts": "تنبيهات البريد الإلكتروني", "Sent to": "تُرسل إلى", "In-app notifications always stay on.": "تبقى الإشعارات داخل التطبيق مفعّلة دائماً.",
  "This is a generated sample account with a made-up address, so no real emails are sent to it.": "هذا حساب تجريبي مولّد بعنوان وهمي، لذلك لا تُرسل إليه رسائل بريد حقيقية.",
  "Application status updates": "تحديثات حالة الطلبات", "When a company accepts, rejects or re-opens your application.": "عندما تقبل شركة طلبك أو ترفضه أو تعيد فتحه.",
  "New matching opportunities": "فرص جديدة مناسبة", "When a company posts an opportunity in your major with a match score of 60% or more.": "عندما تنشر شركة فرصة في تخصصك بنسبة توافق 60% أو أكثر.",
  "Email preferences saved": "تم حفظ تفضيلات البريد", "Emailed": "أُرسل بالبريد", "Email sending": "جارٍ الإرسال بالبريد", "Email failed": "فشل الإرسال بالبريد",
  "Email off": "البريد متوقف", "Sample account — no email": "حساب تجريبي — بدون بريد",
  "Weekly digest": "الملخص الأسبوعي", "Every Sunday at 9:00 (Amman): your top 3 new matches and one development opportunity.": "كل أحد الساعة 9:00 (عمّان): أفضل 3 فرص جديدة لك وفرصة تطوير واحدة.",
  "New applications": "طلبات جديدة", "When a student applies to one of your opportunities, with their match score.": "عندما يتقدم طالب لإحدى فرصك، مع نسبة توافقه.",
};

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (s: string, vars?: Record<string, string | number>) => string;
}

const I18nCtx = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem("wasla_lang") === "ar" ? "ar" : "en"));
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    localStorage.setItem("wasla_lang", lang);
  }, [lang]);
  const t = useCallback((s: string, vars?: Record<string, string | number>) => {
    let out = lang === "ar" ? AR[s] ?? s : s;
    if (vars) for (const [k, v] of Object.entries(vars)) out = out.replace(`{${k}}`, String(v));
    return out;
  }, [lang]);
  const value = useMemo(() => ({ lang, setLang, t }), [lang, t]);
  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useT(): Ctx {
  const ctx = useContext(I18nCtx);
  if (!ctx) throw new Error("useT must be used inside I18nProvider");
  return ctx;
}
