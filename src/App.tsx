import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CurrentProjectProvider } from "@/contexts/CurrentProjectContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import RequireProject from "@/components/RequireProject";
import AppLayout from "@/components/AppLayout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Generate from "@/pages/Generate";
import GenerateProgress from "@/pages/GenerateProgress";
import HistoryPage from "@/pages/History";
import GenerationResult from "@/pages/GenerationResult";
import Settings from "@/pages/Settings";
import {
  AppealAxisPage,
  CompositionPage,
  NarrationScriptPage,
  NarrationAudioPage,
  ImageGenerationPage,
  CarouselVideoPage,
  VideoResizePage,
} from "@/pages/tools/Placeholders";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const LoginGuard = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <Login />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <CurrentProjectProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginGuard />} />
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/generate" element={<Generate />} />
                <Route path="/generate/progress" element={<GenerateProgress />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/result/:id" element={<GenerationResult />} />
                <Route path="/tools/appeal-axis" element={<RequireProject><AppealAxisPage /></RequireProject>} />
                <Route path="/tools/composition" element={<RequireProject><CompositionPage /></RequireProject>} />
                <Route path="/tools/narration-script" element={<RequireProject><NarrationScriptPage /></RequireProject>} />
                <Route path="/tools/narration-audio" element={<RequireProject><NarrationAudioPage /></RequireProject>} />
                <Route path="/tools/image-generation" element={<RequireProject><ImageGenerationPage /></RequireProject>} />
                <Route path="/tools/carousel-video" element={<RequireProject><CarouselVideoPage /></RequireProject>} />
                <Route path="/tools/video-resize" element={<RequireProject><VideoResizePage /></RequireProject>} />
                <Route path="/settings" element={<Settings />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </CurrentProjectProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
