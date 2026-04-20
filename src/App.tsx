import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CurrentProjectProvider } from "@/contexts/CurrentProjectContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Generate from "@/pages/Generate";
import GenerateProgress from "@/pages/GenerateProgress";
import HistoryPage from "@/pages/History";
import GenerationResult from "@/pages/GenerationResult";
import Settings from "@/pages/Settings";
import {
  CarouselVideoPage,
  VideoResizePage,
} from "@/pages/tools/Placeholders";
import NarrationAudioTool from "@/pages/tools/NarrationAudioTool";
import NarrationScriptTool from "@/pages/tools/NarrationScriptTool";
import CompositionTool from "@/pages/tools/CompositionTool";
import AppealAxisTool from "@/pages/tools/AppealAxisTool";
import ImageGenerationTool from "@/pages/tools/ImageGenerationTool";
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
                <Route path="/tools/appeal-axis" element={<AppealAxisTool />} />
                <Route path="/tools/composition" element={<CompositionTool />} />
                <Route path="/tools/narration-script" element={<NarrationScriptTool />} />
                <Route path="/tools/narration-audio" element={<NarrationAudioTool />} />
                <Route path="/tools/image-generation" element={<ImageGenerationPage />} />
                <Route path="/tools/carousel-video" element={<CarouselVideoPage />} />
                <Route path="/tools/video-resize" element={<VideoResizePage />} />
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
