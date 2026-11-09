import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, GraduationCap, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LangToggle, Logo } from "@/components/AppShell";
import SimpleSelect from "@/components/SimpleSelect";
import { apiPost } from "@/lib/api";
import { errMsg, roleHome, useMeta } from "@/lib/hooks";
import { useT } from "@/lib/i18n";
import { beginSession } from "@/lib/session";
import type { Me } from "@/lib/types";
import { cn } from "@/lib/utils";

const DEMOS = [
  { role: "Student", email: "ahmad@wasla.edu", password: "Student@123", icon: GraduationCap },
  { role: "Company", email: "recruiter@techventures.jo", password: "Company@123", icon: Building2 },
  { role: "University admin", email: "admin@wasla.edu", password: "Admin@123", icon: Landmark },
];

function AuthLayout({ children }: { children: React.ReactNode }) {
  const { t } = useT();
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[#0F172A] p-12 lg:flex">
        <div className="absolute -end-32 -top-32 size-96 rounded-full bg-teal-500/20 blur-3xl" />
        <div className="absolute -bottom-40 -start-20 size-96 rounded-full bg-blue-600/20 blur-3xl" />
        <Logo light />
        <div className="relative">
          <h2 className="font-heading text-4xl font-bold leading-tight text-white">{t("One platform for students, companies and the university.")}</h2>
          <p className="mt-4 max-w-md text-slate-400">{t("Transparent matching, AI-assisted CVs and supervised field training — all in one place.")}</p>
        </div>
        <p className="relative text-xs text-slate-500">Applied Science Private University · Faculty of Information Technology</p>
      </div>
      <div className="flex flex-col bg-[#F8FAFC]">
        <div className="flex items-center justify-between p-5 lg:justify-end">
          <span className="lg:hidden"><Logo /></span>
          <LangToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-5 pb-12">{children}</div>
      </div>
    </div>
  );
}

function useAuthSuccess() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return (me: Me) => {
    beginSession();
    qc.setQueryData(["me"], me);
    navigate(roleHome(me.user.role));
  };
}

export function Login() {
  const { t } = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const onSuccess = useAuthSuccess();
  const login = useMutation({
    mutationFn: () => apiPost<Me>("/auth/login", { email, password }),
    onSuccess,
    onError: (e) => toast.error(t(errMsg(e))),
  });
  const submit = (e: FormEvent) => { e.preventDefault(); login.mutate(); };

  return (
    <AuthLayout>
      <div className="w-full max-w-md">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-slate-900">{t("Welcome back")}</h1>
        <p className="mt-1 text-slate-600">{t("Sign in to continue to Wasla.")}</p>
        <form onSubmit={submit} className="mt-8 space-y-4" data-testid="login-form">
          <div className="space-y-1.5">
            <Label htmlFor="email">{t("Email")}</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required data-testid="login-email-input" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">{t("Password")}</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required data-testid="login-password-input" />
          </div>
          <Button type="submit" className="h-11 w-full bg-teal-700 text-white hover:bg-teal-800" disabled={login.isPending} data-testid="login-submit-btn">
            {login.isPending ? t("Signing in…") : t("Sign in")}
          </Button>
        </form>
        <div className="mt-8">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t("Demo accounts")}</div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {DEMOS.map((d) => (
              <button key={d.email} type="button" onClick={() => { setEmail(d.email); setPassword(d.password); }}
                data-testid={`demo-fill-${d.role.split(" ")[0].toLowerCase()}`}
                className="flex flex-col items-start gap-1 rounded-xl border border-slate-200 bg-white p-3 text-start transition-colors hover:border-teal-400 hover:bg-teal-50/50">
                <d.icon className="size-4 text-teal-700" />
                <span className="text-sm font-semibold text-slate-900">{t(d.role)}</span>
                <span className="truncate text-[11px] text-slate-500">{d.email}</span>
              </button>
            ))}
          </div>
        </div>
        <p className="mt-8 text-sm text-slate-600">
          {t("New to Wasla?")} <Link to="/register" className="font-semibold text-teal-700 hover:underline" data-testid="goto-register-link">{t("Create an account")}</Link>
        </p>
      </div>
    </AuthLayout>
  );
}

export function Register() {
  const { t } = useT();
  const meta = useMeta();
  const onSuccess = useAuthSuccess();
  const [role, setRole] = useState<"student" | "company">("student");
  const [f, setF] = useState({ name: "", email: "", password: "", major: "Computer Science", university_id: "", city: "Amman", company_name: "", industry: "" });
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const reg = useMutation({
    mutationFn: () => apiPost<Me>("/auth/register", { ...f, role }),
    onSuccess: (me) => { toast.success(t("Account created")); onSuccess(me); },
    onError: (e) => toast.error(t(errMsg(e))),
  });
  const cities = (meta.data?.cities ?? ["Amman"]).map((c) => ({ value: c, label: c }));

  return (
    <AuthLayout>
      <form className="w-full max-w-md space-y-4" onSubmit={(e) => { e.preventDefault(); reg.mutate(); }} data-testid="register-form">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-slate-900">{t("Create your account")}</h1>
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
          {(["student", "company"] as const).map((r) => (
            <button key={r} type="button" onClick={() => setRole(r)} data-testid={`register-role-${r}`}
              className={cn("rounded-lg py-2 text-sm font-semibold transition-colors", role === r ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800")}>
              {t(r === "student" ? "Student" : "Company")}
            </button>
          ))}
        </div>
        <div className="space-y-1.5">
          <Label>{t(role === "student" ? "Full name" : "Contact person name")}</Label>
          <Input value={f.name} onChange={(e) => set("name")(e.target.value)} required data-testid="register-name-input" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{t("Email")}</Label>
            <Input type="email" value={f.email} onChange={(e) => set("email")(e.target.value)} required data-testid="register-email-input" />
          </div>
          <div className="space-y-1.5">
            <Label>{t("Password")}</Label>
            <Input type="password" minLength={6} value={f.password} onChange={(e) => set("password")(e.target.value)} required data-testid="register-password-input" />
          </div>
        </div>
        {role === "student" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t("Major")}</Label>
              <SimpleSelect value={f.major} onChange={set("major")} testId="register-major-select"
                options={(meta.data?.majors ?? [f.major]).map((m) => ({ value: m, label: t(m) }))} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("University ID")}</Label>
              <Input value={f.university_id} onChange={(e) => set("university_id")(e.target.value)} data-testid="register-uid-input" />
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t("Company name")}</Label>
              <Input value={f.company_name} onChange={(e) => set("company_name")(e.target.value)} required data-testid="register-company-input" />
            </div>
            <div className="space-y-1.5">
              <Label>{t("Industry")}</Label>
              <Input value={f.industry} onChange={(e) => set("industry")(e.target.value)} data-testid="register-industry-input" />
            </div>
          </div>
        )}
        <div className="space-y-1.5">
          <Label>{t("City")}</Label>
          <SimpleSelect value={f.city} onChange={set("city")} options={cities} testId="register-city-select" />
        </div>
        {role === "company" && <p className="rounded-lg bg-blue-50 p-3 text-xs text-blue-800">{t("Company accounts are reviewed by the university before they can post opportunities.")}</p>}
        <Button type="submit" className="h-11 w-full bg-teal-700 text-white hover:bg-teal-800" disabled={reg.isPending} data-testid="register-submit-btn">
          {reg.isPending ? t("Creating…") : t("Create account")}
        </Button>
        <p className="text-sm text-slate-600">
          {t("Already have an account?")} <Link to="/login" className="font-semibold text-teal-700 hover:underline" data-testid="goto-login-link">{t("Sign in")}</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
