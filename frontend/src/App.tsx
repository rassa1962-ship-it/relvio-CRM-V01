import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { UserProvider, useUser } from "./hooks/useUser";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import Profile from "./pages/Profile";
import AdminLeads from "./pages/AdminLeads";

function AppRoutes() {
  const { session, loading } = useAuth();
  const { user, loading: userLoading } = useUser();

  if (loading || userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  // Проверка - если не админ и пытается зайти на /admin - редирект
  const isAdmin = user?.role === 'admin';

  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route
          path="/login"
          element={!session ? <Login /> : <Navigate to="/dashboard" />}
        />
        <Route
          path="/dashboard"
          element={session ? <Dashboard /> : <Navigate to="/login" />}
        />
        <Route
          path="/leads"
          element={session ? <Leads /> : <Navigate to="/login" />}
        />
        <Route
          path="/profile"
          element={session ? <Profile /> : <Navigate to="/login" />}
        />
        <Route
          path="/admin/leads"
          element={session && isAdmin ? <AdminLeads /> : <Navigate to="/dashboard" />}
        />
        <Route
          path="/*"
          element={<Navigate to={session ? "/dashboard" : "/login"} />}
        />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <UserProvider>
      <AppRoutes />
    </UserProvider>
  );
}

export default App;
