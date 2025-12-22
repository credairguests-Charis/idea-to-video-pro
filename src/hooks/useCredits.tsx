import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface CreditsData {
  credits: number;
  freeCredits: number;
  paidCredits: number;
  hasUnlimitedAccess: boolean;
  loading: boolean;
  error: string | null;
}

export function useCredits() {
  const { user } = useAuth();
  const [data, setData] = useState<CreditsData>({
    credits: 0,
    freeCredits: 0,
    paidCredits: 0,
    hasUnlimitedAccess: false,
    loading: true,
    error: null,
  });

  const fetchCredits = useCallback(async () => {
    if (!user) {
      setData({ credits: 0, freeCredits: 0, paidCredits: 0, hasUnlimitedAccess: false, loading: false, error: null });
      return;
    }

    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("credits, free_credits, paid_credits, has_unlimited_access")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;

      setData({
        credits: profile?.credits || 0,
        freeCredits: profile?.free_credits || 0,
        paidCredits: profile?.paid_credits || 0,
        hasUnlimitedAccess: profile?.has_unlimited_access || false,
        loading: false,
        error: null,
      });
    } catch (err) {
      console.error("Error fetching credits:", err);
      setData((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to fetch credits",
      }));
    }
  }, [user]);

  useEffect(() => {
    fetchCredits();

    // Set up real-time subscription for credit updates
    if (user) {
      const channel = supabase
        .channel("credits-changes")
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "profiles",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (payload.new) {
              const newData = payload.new as {
                credits?: number;
                free_credits?: number;
                paid_credits?: number;
                has_unlimited_access?: boolean;
              };
              setData((prev) => ({
                ...prev,
                credits: typeof newData.credits === "number" ? newData.credits : prev.credits,
                freeCredits: typeof newData.free_credits === "number" ? newData.free_credits : prev.freeCredits,
                paidCredits: typeof newData.paid_credits === "number" ? newData.paid_credits : prev.paidCredits,
                hasUnlimitedAccess: typeof newData.has_unlimited_access === "boolean" ? newData.has_unlimited_access : prev.hasUnlimitedAccess,
              }));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, fetchCredits]);

  const checkSufficientCredits = useCallback(
    (requiredCredits: number): boolean => {
      // Users with unlimited access always have sufficient credits
      if (data.hasUnlimitedAccess) return true;
      return data.credits >= requiredCredits;
    },
    [data.credits, data.hasUnlimitedAccess]
  );

  const getVideoCount = useCallback((): number => {
    // Users with unlimited access have unlimited videos
    if (data.hasUnlimitedAccess) return Infinity;
    const CREDITS_PER_VIDEO = 70;
    return Math.floor(data.credits / CREDITS_PER_VIDEO);
  }, [data.credits, data.hasUnlimitedAccess]);

  return {
    credits: data.credits,
    freeCredits: data.freeCredits,
    paidCredits: data.paidCredits,
    hasUnlimitedAccess: data.hasUnlimitedAccess,
    loading: data.loading,
    error: data.error,
    refetch: fetchCredits,
    checkSufficientCredits,
    getVideoCount,
    CREDITS_PER_VIDEO: 70,
  };
}
