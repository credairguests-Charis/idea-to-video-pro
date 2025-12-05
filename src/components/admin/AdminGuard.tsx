import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CharisLoader } from "@/components/ui/charis-loader";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkAdmin() {
      if (!user) {
        console.log('[AdminGuard] No user found, redirecting to auth');
        setIsAdmin(false);
        setChecking(false);
        return;
      }

      console.log('[AdminGuard] Checking admin status for user:', user.id);

      try {
        const { data, error } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });

        console.log('[AdminGuard] RPC result:', { data, error });

        if (error) {
          console.error('[AdminGuard] Error checking admin status:', error);
          setIsAdmin(false);
        } else {
          console.log('[AdminGuard] User is admin:', data === true);
          setIsAdmin(data === true);
        }
      } catch (error) {
        console.error('[AdminGuard] Exception checking admin status:', error);
        setIsAdmin(false);
      } finally {
        setChecking(false);
      }
    }

    if (!loading) {
      checkAdmin();
    }
  }, [user, loading]);

  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <CharisLoader size="lg" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
