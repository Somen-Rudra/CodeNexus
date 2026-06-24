import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Company from "./pages/Company";
import Profile from "./components/Profile";
import ProblemSet from "./pages/ProblemSet";
import Workspace from "./pages/Workspace";
import AIFeaturesPage from "./pages/AIFeaturePage";
import AICodeExplanation from "./components/AICodeExplanation";
import Contest from "./pages/Contests";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import SubmissionsPage from "./pages/SubmissionPage";
import AdminPanel from "./pages/AdminPanel";

export default function App() {
  const { user, loading } = useAuth();

  // Still checking session with backend — render nothing yet
  if (loading) {
    return <div>Loading...</div>;
  }

  // Not logged in — only show public routes
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/token/:token" element={<VerifyEmail />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Logged in — show sidebar layout with all protected routes
  return (
    <div className="app-with-sidebar">
      <Sidebar />
      <div className="app-with-sidebar__content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/companies" element={<Company />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/problemSet" element={<ProblemSet />} />
          <Route path="/problemSet/:slug" element={<Workspace />} />
          <Route path="/ai-features" element={<AIFeaturesPage />} />
          <Route
            path="/ai-features/code-explanation"
            element={<AICodeExplanation />}
          />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/submissions" element={<SubmissionsPage />} />
          <Route path="/contests" element={<Contest />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}
