
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import AuthPage from "@/components/AuthPage";
import PasswordResetPage from "@/components/PasswordResetPage";
import AdminConsole from "@/components/AdminConsole";
import GMDashboard from "@/components/GMDashboard";
import { EmailDiagnostic } from "@/pages/EmailDiagnostic";

import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const queryClient = new QueryClient();

function AppContent() {
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    const run = async () => {
      try {
        const key = 'gm-reconcile-2025-08-11';
        if (profile?.role === 'admin' && typeof window !== 'undefined' && !localStorage.getItem(key)) {
          // 1) Récupérer tous les profils GM (exclure ceux avec auto-création désactivée)
          const { data: gmProfiles } = await supabase
            .from('profiles')
            .select('id,user_id,email,first_name,last_name,gm_id,gm_auto_create_disabled')
            .eq('role', 'gm')
            .neq('gm_auto_create_disabled', true);

          // 2) Récupérer tous les GM existants
          const { data: gms } = await supabase
            .from('game_masters')
            .select('id,email');

          const gmSet = new Set((gms || []).map((g: any) => g.id));

          const toFix = (gmProfiles || []).filter((p: any) => !p.gm_id || !gmSet.has(p.gm_id));

          for (const p of toFix) {
            await supabase.rpc('ensure_gm_profile_for_user', {
              p_user_id: p.user_id,
              p_email: p.email,
              p_first: p.first_name,
              p_last: p.last_name,
            });
          }

          localStorage.setItem(key, '1');
          console.log(`✅ Réconciliation GM terminée. Corrigé: ${toFix.length}`);
        }
      } catch (e) {
        console.error('Réconciliation GM échouée', e);
      }
    };
    run();
  }, [profile?.role]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/reset-password" element={<PasswordResetPage />} />
      <Route 
        path="/" 
        element={
          !user || !profile ? (
            <AuthPage />
          ) : profile.role === 'admin' ? (
            <AdminConsole />
          ) : (
            <GMDashboard />
          )
        } 
      />
      <Route path="/admin" element={
        user && profile?.role === 'admin' ? <AdminConsole /> : <Navigate to="/" />
      } />
      <Route path="/gm" element={
        user && profile?.role === 'gm' ? <GMDashboard /> : <Navigate to="/" />
      } />
      <Route path="/email-diagnostic" element={
        user && profile?.role === 'admin' ? <EmailDiagnostic /> : <Navigate to="/" />
      } />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
