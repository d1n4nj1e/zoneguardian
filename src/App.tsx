import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { useTrackingInitializer } from "./hooks/useTrackingInitializer";

import Index from "./pages/Index";
import Login from "./pages/Login";
import OperatorDashboard from "./pages/OperatorDashboard";
import SupervisorDashboard from "./pages/SupervisorDashboard";
import AssignmentsPage from "./pages/AssignmentsPage";
import HistoryPage from "./pages/HistoryPage";
import SettingsPage from "./pages/SettingsPage";
import ZonesPage from "./pages/ZonesPage";
import ZoneTypeManagementPage from "./pages/ZoneTypeManagementPage";
import NotFound from "./pages/NotFound";
import AssignmentHistoryPage from "./pages/AssignmentHistoryPage";


const queryClient = new QueryClient();

function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: ("operator" | "supervisor")[];
}) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <Navigate
        to={user.role === "operator" ? "/operate" : "/supervise"}
        replace
      />
    );
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />

      <Route
        path="/operate"
        element={
          <ProtectedRoute allowedRoles={["operator"]}>
            <OperatorDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/supervise"
        element={
          <ProtectedRoute allowedRoles={["supervisor"]}>
            <SupervisorDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/assignments"
        element={
          <ProtectedRoute allowedRoles={["supervisor"]}>
            <AssignmentsPage />
          </ProtectedRoute>
        }
      />

      <Route
  path="/assignment-history"
  element={
    <ProtectedRoute allowedRoles={['supervisor']}>
      <AssignmentHistoryPage />
    </ProtectedRoute>
  }
/>


      <Route
        path="/zones"
        element={
          <ProtectedRoute allowedRoles={["supervisor"]}>
            <ZonesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/zone-types"
        element={
          <ProtectedRoute allowedRoles={["supervisor"]}>
            <ZoneTypeManagementPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <HistoryPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

// ================================
// INNER APP (within AuthProvider)
// ================================
function InnerApp() {
  // 🔥 START GLOBAL TRACKING
  useTrackingInitializer();

  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  );
}

// ================================
// OUTER APP
// ================================
const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <InnerApp />
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
