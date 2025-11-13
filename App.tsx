import "./App.css";
import { LeadershipDashboard } from "./components/dashboard/LeadershipDashboard";
import LeadStar from "./pages/LeadStar";
import { YouView } from "./components/you-view/YouView";
import { CoachView } from "./components/coach-view/CoachView";
import LearnStar from "./pages/LearnStar";
import { KPIPage } from "./pages/KPIPage";
import { TeamPage } from "./pages/TeamPage";
import { LoginPage } from "./pages/LoginPage";
import { MatcherPage } from "./pages/MatcherPage";
import { CommunityPage } from "./pages/CommunityPage";
import { ManifestoPage } from "./pages/ManifestoPage";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { SwipeableViews } from "./components/SwipeableViews";
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { Button } from "./components/ui/button";
import { LayoutDashboard, User, LogOut, Loader2, Sparkles, GraduationCap, Home, BarChart3, Users, Heart, TrendingUp, BookOpen, Star } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "./components/ui/sonner";
import { AIAgentGlobal } from "./components/ai-agent/AIAgentGlobal";
import { StarForgeHub } from "./components/starforge/StarForgeHub";

function Navigation() {
  const location = useLocation();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign out');
    }
  };

  if (!user) return null;

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container flex h-16 items-center px-4">
        <div className="flex items-center gap-6 mr-8">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            LeadStar
          </h1>
        </div>
        <div className="flex gap-2 flex-1">
          <Link to="/">
            <Button
              variant={location.pathname === "/" ? "default" : "ghost"}
              size="sm"
              className="gap-2"
            >
              <Home className="h-4 w-4" />
              LeadStar
            </Button>
          </Link>
          <Link to="/you">
            <Button
              variant={location.pathname === "/you" ? "default" : "ghost"}
              size="sm"
              className="gap-2"
            >
              <User className="h-4 w-4" />
              YOU
            </Button>
          </Link>
          <Link to="/coach">
            <Button
              variant={location.pathname === "/coach" ? "default" : "ghost"}
              size="sm"
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              COACH
            </Button>
          </Link>
          <Link to="/learnstar">
            <Button
              variant={location.pathname === "/learnstar" ? "default" : "ghost"}
              size="sm"
              className="gap-2"
            >
              <GraduationCap className="h-4 w-4" />
              LEARNSTAR
            </Button>
          </Link>
          <Link to="/kpi">
            <Button
              variant={location.pathname === "/kpi" ? "default" : "ghost"}
              size="sm"
              className="gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              KPI
            </Button>
          </Link>
          <Link to="/team">
            <Button
              variant={location.pathname === "/team" ? "default" : "ghost"}
              size="sm"
              className="gap-2"
            >
              <Users className="h-4 w-4" />
              TEAM
            </Button>
          </Link>
          <Link to="/matcher">
            <Button
              variant={location.pathname === "/matcher" ? "default" : "ghost"}
              size="sm"
              className="gap-2"
            >
              <Heart className="h-4 w-4" />
              MATCHER
            </Button>
          </Link>
          <Link to="/community">
            <Button
              variant={location.pathname === "/community" ? "default" : "ghost"}
              size="sm"
              className="gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              COMMUNITY
            </Button>
          </Link>
        </div>
        <div className="flex gap-2 items-center">
          <Link to="/starforge">
            <Button variant="ghost" size="sm" className="gap-2">
              <Star className="h-4 w-4 text-yellow-400" />
            </Button>
          </Link>
          <Link to="/manifesto">
            <Button variant="ghost" size="sm" className="gap-2">
              <BookOpen className="h-4 w-4" />
            </Button>
          </Link>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
        </div>
      </div>
    </nav>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <div className="min-h-screen dark">
            <Navigation />
            <SwipeableViews>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <LeadStar />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/you"
                  element={
                    <ProtectedRoute>
                      <YouView />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/coach"
                  element={
                    <ProtectedRoute>
                      <CoachView />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/learnstar"
                  element={
                    <ProtectedRoute>
                      <LearnStar />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/kpi"
                  element={
                    <ProtectedRoute>
                      <KPIPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/team"
                  element={
                    <ProtectedRoute>
                      <TeamPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/matcher"
                  element={
                    <ProtectedRoute>
                      <MatcherPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/community"
                  element={
                    <ProtectedRoute>
                      <CommunityPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/manifesto" element={<ManifestoPage />} />
                <Route
                  path="/starforge"
                  element={
                    <ProtectedRoute>
                      <StarForgeHub />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </SwipeableViews>
            <AIAgentGlobal />
            <Toaster />
          </div>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
