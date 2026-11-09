import { Routes, Route, Navigate } from "react-router-dom";
import { RequireRole } from "@/components/AppShell";
import Landing from "@/pages/Landing";
import { Login, Register } from "@/pages/Auth";
import Notifications from "@/pages/Notifications";
import StudentDashboard from "@/pages/student/Dashboard";
import StudentProfilePage from "@/pages/student/Profile";
import StudentOpportunities from "@/pages/student/Opportunities";
import StudentApplications from "@/pages/student/Applications";
import StudentCV from "@/pages/student/CV";
import StudentGrowth from "@/pages/student/Growth";
import CompanyDashboard from "@/pages/company/Dashboard";
import CompanyOpportunity from "@/pages/company/OpportunityApplicants";
import CompanySearch from "@/pages/company/Search";
import AdminDashboard from "@/pages/admin/AdminDashboard";

// One <Route> per page in src/pages; BrowserRouter already wraps this in main.tsx.
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/notifications" element={<RequireRole role="any"><Notifications /></RequireRole>} />
      <Route path="/student" element={<RequireRole role="student"><StudentDashboard /></RequireRole>} />
      <Route path="/student/profile" element={<RequireRole role="student"><StudentProfilePage /></RequireRole>} />
      <Route path="/student/opportunities" element={<RequireRole role="student"><StudentOpportunities /></RequireRole>} />
      <Route path="/student/applications" element={<RequireRole role="student"><StudentApplications /></RequireRole>} />
      <Route path="/student/cv" element={<RequireRole role="student"><StudentCV /></RequireRole>} />
      <Route path="/student/growth" element={<RequireRole role="student"><StudentGrowth /></RequireRole>} />
      <Route path="/company" element={<RequireRole role="company"><CompanyDashboard /></RequireRole>} />
      <Route path="/company/opportunities/:id" element={<RequireRole role="company"><CompanyOpportunity /></RequireRole>} />
      <Route path="/company/search" element={<RequireRole role="company"><CompanySearch /></RequireRole>} />
      <Route path="/admin" element={<RequireRole role="admin"><AdminDashboard /></RequireRole>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
