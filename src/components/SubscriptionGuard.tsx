import { useAuth } from "@/hooks/useAuth"
import { Navigate } from "react-router-dom"
import { Loader2 } from "lucide-react"
import { useEffect } from "react"

interface SubscriptionGuardProps {
  children: React.ReactNode
}

export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const { user, loading, subscriptionStatus, checkSubscription } = useAuth()

  useEffect(() => {
    if (user && !subscriptionStatus) {
      checkSubscription()
    }
  }, [user, subscriptionStatus, checkSubscription])

  if (loading || !subscriptionStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth" replace />
  }

  // Check if user has invite bypass
  const bypassPaywall = user.user_metadata?.bypass_paywall === true;
  
  if (!subscriptionStatus.subscribed && !bypassPaywall) {
    return <Navigate to="/pricing" replace />
  }

  return <>{children}</>
}
