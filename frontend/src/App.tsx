import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Samples from "./pages/Samples";
import Actions from "./pages/Actions";
import Admin from "./pages/Admin";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import { ThemeProvider } from "./hooks/use-theme";
import { Role } from "./types/kanban";

const queryClient = new QueryClient();

const RequireRole = ({ allowed, children }: { allowed: Role[]; children: JSX.Element }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const roles = user.roles ?? [user.role];
  const hasAccess = roles.some((role) => allowed.includes(role));
  if (!hasAccess) return <Navigate to="/board" replace />;
  return children;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Navigate to="/board" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/board" element={<Index />} />
              <Route path="/samples" element={<Samples />} />
              <Route
                path="/actions"
                element={
                  <RequireRole allowed={["action_supervision", "admin"]}>
                    <Actions />
                  </RequireRole>
                }
              />
              <Route
                path="/admin"
                element={
                  <RequireRole allowed={["admin"]}>
                    <Admin />
                  </RequireRole>
                }
              />
              <Route
                path="/settings"
                element={
                  <RequireRole allowed={["admin"]}>
                    <Settings />
                  </RequireRole>
                }
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
