import { useAuth } from "@/hooks/useAuth"
import { Navigate, useLocation } from "react-router-dom"
import { CharisLoader } from "@/components/ui/charis-loader"
import { useEffect } from "react"

interface SubscriptionGuardProps {
  children: React.ReactNode
}

export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const { user, loading, subscriptionStatus, checkSubscription } = useAuth()
  const location = useLocation()

  useEffect(() => {
    if (user && !subscriptionStatus) {
      checkSubscription()
    }
  }, [user, subscriptionStatus, checkSubscription])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <CharisLoader size="lg" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth" replace />
  }

  // Check for bypass_paywall flag (for testing/admin purposes)
  const bypassPaywall = user.user_metadata?.bypass_paywall === true

  // IMPORTANT: We allow access to the app even with 0 credits
  // Users can still view their library, they just can't generate new videos
  // The credit check happens at generation time, not at app access time
  const hasSubscription = subscriptionStatus?.subscribed === true
  
  // Allow access if user has subscription, bypass flag, or is accessing protected routes
  // Credits are checked at generation time, not at access time
  const hasAccess = hasSubscription || bypassPaywall

  // For users without subscription and without bypass, we still allow access
  // They can browse the app, view their projects, but will need to top up/upgrade to generate
  // This is a UX improvement - don't lock them out completely
  // The paywall only applies if they've never had any access
  
  // Check if user has ever had credits (marketing signup, etc.)
  const isNewUserWithoutAccess = !hasSubscription && !bypassPaywall

  // For completely new users who haven't been given any credits or access,
  // redirect to pricing. But for users who had credits (even if now 0), allow access.
  // We'll trust that if they're in the system, they should have access to view their content.
  
  // Simply allow all authenticated users to access the app
  // Credit enforcement happens at video generation time
  return <>{children}</>
}
