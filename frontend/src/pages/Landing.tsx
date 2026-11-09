import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { ArrowRight, Building2, GraduationCap, Landmark, MapPin, ShieldCheck } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Disclaimer } from "@/components/Bits";
import { LangToggle, Logo } from "@/components/AppShell";
import { FACTOR_META } from "@/components/Match";
import { apiGet } from "@/lib/api";
import { useT } from "@/lib/i18n";
import type { FactorKey, Opportunity, PublicStats } from "@/lib/types";
import { cn } from "@/lib/utils";

const HERO = "https://images.unsplash.com/photo-1576495199011-eb94736d05d6?crop=entropy&cs=srgb&fm=jpg&q=80&w=1800";
const WEIGHTS: [FactorKey, number][] = [["major", 25], ["courses", 25], ["skills", 25], ["external", 10], ["interests", 10], ["location", 5]];

export default function Landing() {
  const { t } = useT();
  const stats = useQuery({ queryKey: ["public-stats"], queryFn: () => apiGet<PublicStats>("/public/stats") });
  const opps = useQuery({ queryKey: ["public-opps"], queryFn: () => apiGet<Opportunity[]>("/public/opportunities") });

  const roles = [
    { icon: GraduationCap, title: "Students", text: "Build an academic profile, get an AI-assisted CV and a ranked list of training opportunities — with the reason behind every score." },
    { icon: Building2, title: "Companies", text: "Post training opportunities, search students by major, skills and location, and review applicants ranked by match." },
    { icon: Landmark, title: "University", text: "Approve companies, manage questions and opportunities, and follow field-training participation with live reports." },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <section className="relative overflow-hidden">
        <img src={HERO} alt="" className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(120deg, rgba(15,23,42,0.96) 0%, rgba(15,23,42,0.88) 45%, rgba(13,148,136,0.78) 100%)" }} />
        <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
          <header className="flex h-20 items-center justify-between">
            <Logo light />
            <div className="flex items-center gap-2">
              <LangToggle dark />
              <Link to="/login" className={cn(buttonVariants({ variant: "ghost" }), "text-slate-200 hover:bg-white/10 hover:text-white")} data-testid="landing-login-btn">
                {t("Sign in")}
              </Link>
            </div>
          </header>
          <div className="grid gap-12 pb-24 pt-14 lg:grid-cols-[1.25fr_1fr] lg:pt-20">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <span className="inline-flex items-center gap-2 rounded-full border border-teal-400/30 bg-teal-400/10 px-3 py-1 text-xs font-semibold text-teal-200">
                <ShieldCheck className="size-3.5" /> {t("Applied Science Private University · Faculty of IT")}
              </span>
              <h1 className="mt-6 font-heading text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-6xl">
                {t("Field training matched on criteria,")} <span className="text-teal-300">{t("not connections.")}</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300">
                {t("Wasla connects students, companies and the university. Every opportunity gets a transparent match score built from your major, grades, skills, certificates, interests and location.")}
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link to="/register" className={cn(buttonVariants({ size: "lg" }), "h-12 gap-2 bg-teal-500 px-6 text-white hover:bg-teal-400")} data-testid="landing-register-btn">
                  {t("Create an account")} <ArrowRight className="size-4 rtl:rotate-180" />
                </Link>
                <Link to="/login" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "h-12 border-white/30 bg-white/5 px-6 text-white hover:bg-white/15 hover:text-white")} data-testid="landing-demo-btn">
                  {t("Try a demo account")}
                </Link>
              </div>
              <dl className="mt-12 grid max-w-lg grid-cols-4 gap-4">
                {([["students", "Students"], ["companies", "Companies"], ["opportunities", "Open roles"], ["applications", "Applications"]] as const).map(([k, l]) => (
                  <div key={k}>
                    <dt className="text-[11px] uppercase tracking-wider text-slate-400">{t(l)}</dt>
                    <dd className="mt-1 font-heading text-2xl font-bold text-white" data-testid={`landing-stat-${k}`}>{stats.data?.[k] ?? "—"}</dd>
                  </div>
                ))}
              </dl>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}
              className="self-end rounded-3xl border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-xl" data-testid="landing-formula-card">
              <div className="text-xs font-semibold uppercase tracking-wider text-teal-200">{t("The match formula")}</div>
              <p className="mt-1 text-sm text-slate-300">{t("Visible to students and companies on every opportunity.")}</p>
              <div className="mt-5 space-y-3.5">
                {WEIGHTS.map(([k, w], i) => (
                  <div key={k}>
                    <div className="flex justify-between text-sm text-white">
                      <span>{t(FACTOR_META[k].label)}</span><span className="font-mono">{w}%</span>
                    </div>
                    <div className="mt-1.5 h-2 rounded-full bg-white/10">
                      <motion.div className="h-full rounded-full" style={{ background: FACTOR_META[k].color }}
                        initial={{ width: 0 }} animate={{ width: `${w * 4}%` }} transition={{ delay: 0.3 + i * 0.08, duration: 0.6 }} />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="grid gap-5 md:grid-cols-[1.2fr_1fr_1fr]">
          {roles.map((r, i) => (
            <div key={r.title} className={cn("rounded-3xl border border-slate-200 bg-white p-7 transition-shadow duration-200 hover:shadow-lg", i === 0 && "md:row-span-1 bg-gradient-to-br from-white to-teal-50/60")}
              data-testid={`landing-role-${r.title.toLowerCase()}`}>
              <r.icon className="size-7 text-teal-700" />
              <h3 className="mt-5 font-heading text-xl font-bold text-slate-900">{t(r.title)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{t(r.text)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900">{t("Open training opportunities")}</h2>
            <p className="mt-1 text-slate-600">{t("Sign in as a student to see your personal match score for each one.")}</p>
          </div>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(opps.data ?? []).slice(0, 8).map((o) => (
            <div key={o.id} className="rounded-2xl border border-slate-200 bg-white p-5 transition-transform duration-200 hover:-translate-y-0.5" data-testid={`landing-opp-${o.id}`}>
              <div className="text-xs font-semibold text-teal-700">{o.company_name}</div>
              <div className="mt-1 font-heading font-semibold text-slate-900">{o.title}</div>
              <div className="mt-3 flex items-center gap-1 text-xs text-slate-500"><MapPin className="size-3" /> {o.city} · {t(o.mode)}</div>
              <div className="mt-3 flex flex-wrap gap-1">
                {o.required_skills.slice(0, 3).map((s) => <span key={s} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-700">{s}</span>)}
              </div>
            </div>
          ))}
          {opps.isError && <p className="text-sm text-slate-500">{t("Opportunities will appear here when the service is online.")}</p>}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-24 sm:px-8">
        <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900">{t("AI roadmap — stated honestly")}</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["Phase 1 · live", "Gap analysis without machine learning: compare your profile with an ideal profile per career track and rank development opportunities.", true],
            ["Phase 2 · planned", "A small NumPy neural network learns each skill's importance, starting from the formula weights (manual forward and backward passes).", false],
            ["Phase 3 · planned", "Training on real admission/rejection decisions and company ratings — the point where the AI becomes truly data-driven.", false],
          ].map(([title, text, live]) => (
            <div key={String(title)} className={cn("rounded-2xl border p-6", live ? "border-teal-300 bg-teal-50" : "border-slate-200 bg-white")}>
              <div className={cn("text-xs font-bold uppercase tracking-wider", live ? "text-teal-700" : "text-slate-500")}>{t(String(title))}</div>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">{t(String(text))}</p>
            </div>
          ))}
        </div>
        <Disclaimer className="mt-6" />
      </section>

      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500">
        Wasla Web · {t("Graduation Project")} · Applied Science Private University
      </footer>
    </div>
  );
}
