import { Switch, Route, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { exchangeCodeForTokens, setTokens } from "@/lib/cognito";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import ProfilePage from "@/pages/profile";
import RegularPage from "@/pages/regular";
import EventDetailPage from "@/pages/event-detail";
import MyApplicationsPage from "@/pages/my-applications";
import HiringDocumentsPage from "@/pages/hiring-documents";
import NotFound from "@/pages/not-found";

function CallbackPage() {
  const [, navigate] = useLocation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (!code) {
      setError("No authorization code found");
      setTimeout(() => navigate("/"), 2000);
      return;
    }

    exchangeCodeForTokens(code)
      .then((tokens) => {
        setTokens(tokens.id_token, tokens.refresh_token);
        navigate("/");
        window.location.reload();
      })
      .catch((err) => {
        console.error("Token exchange failed:", err);
        setError("Login failed. Redirecting...");
        setTimeout(() => navigate("/"), 2000);
      });
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">로그인 처리 중...</p>
      </div>
    </div>
  );
}

function Router() {
  const { user, isLoading } = useAuth();

  // /callback은 인증 전에도 접근 가능해야 함
  const [location] = useLocation();
  if (location === "/callback" || location.startsWith("/callback?")) {
    return <CallbackPage />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Landing />;
  }

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/regular" component={RegularPage} />
      <Route path="/event/:id" component={EventDetailPage} />
      <Route path="/my-applications" component={MyApplicationsPage} />
      <Route path="/hiring-documents/:id" component={HiringDocumentsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
