import { useAuth } from "@/hooks/useAuth"
import { useCredits } from "@/hooks/useCredits"
import { Navigate } from "react-router-dom"
import { CharisLoader } from "@/components/ui/charis-loader"
import { useEffect } from "react"

interface SubscriptionGuardProps {
  children: React.ReactNode
}

export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const { user, loading, subscriptionStatus, checkSubscription } = useAuth()
  const { credits, loading: creditsLoading } = useCredits()

  useEffect(() => {
    if (user && !subscriptionStatus) {
      checkSubscription()
    }
  }, [user, subscriptionStatus, checkSubscription])

  if (loading || creditsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <CharisLoader size="lg" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth" replace />
  }

  // Check if user has access through any of these means:
  // 1. Active Stripe subscription
  // 2. Credits in their account
  // 3. Invite bypass flag
  const hasSubscription = subscriptionStatus?.subscribed === true
  const hasCredits = credits > 0
  const bypassPaywall = user.user_metadata?.bypass_paywall === true
  
  const hasAccess = hasSubscription || hasCredits || bypassPaywall

  if (!hasAccess) {
    return <Navigate to="/pricing" replace />
  }

  return <>{children}</>
}
