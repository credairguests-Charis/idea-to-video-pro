import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface CreditsData {
  credits: number;
  loading: boolean;
  error: string | null;
}

export function useCredits() {
  const { user } = useAuth();
  const [data, setData] = useState<CreditsData>({
    credits: 0,
    loading: true,
    error: null,
  });

  const fetchCredits = useCallback(async () => {
    if (!user) {
      setData({ credits: 0, loading: false, error: null });
      return;
    }

    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("credits")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;

      setData({
        credits: profile?.credits || 0,
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
            if (payload.new && typeof payload.new.credits === "number") {
              setData((prev) => ({
                ...prev,
                credits: payload.new.credits,
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
      return data.credits >= requiredCredits;
    },
    [data.credits]
  );

  const getVideoCount = useCallback((): number => {
    const CREDITS_PER_VIDEO = 70;
    return Math.floor(data.credits / CREDITS_PER_VIDEO);
  }, [data.credits]);

  return {
    credits: data.credits,
    loading: data.loading,
    error: data.error,
    refetch: fetchCredits,
    checkSufficientCredits,
    getVideoCount,
    CREDITS_PER_VIDEO: 70,
  };
}
