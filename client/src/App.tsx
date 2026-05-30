import { Router, Route, Switch } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useHashLocation } from "@/lib/useHashLocation";
import { ThemeProvider } from "@/lib/theme";
import { AuthProvider } from "@/lib/auth";
import { Toaster } from "@/components/ui/toaster";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Routines from "@/pages/Routines";
import RoutineDetail from "@/pages/RoutineDetail";
import Schedule from "@/pages/Schedule";
import ActiveWorkout from "@/pages/ActiveWorkout";
import Exercises from "@/pages/Exercises";
import History from "@/pages/History";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/NotFound";

function AppRoutes() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/routines" component={Routines} />
        <Route path="/routines/:id" component={RoutineDetail} />
        <Route path="/schedule" component={Schedule} />
        <Route path="/workout/:sessionId" component={ActiveWorkout} />
        <Route path="/exercises" component={Exercises} />
        <Route path="/history" component={History} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <Router hook={useHashLocation}>
            <AppRoutes />
          </Router>
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
