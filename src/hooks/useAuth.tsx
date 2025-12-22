import { createContext, useContext, useEffect, useRef, useState } from "react"
import { User, Session } from "@supabase/supabase-js"
import { supabase } from "@/integrations/supabase/client"

interface SubscriptionStatus {
  subscribed: boolean
  product_id?: string | null
  subscription_end?: string | null
}

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  subscriptionStatus: SubscriptionStatus | null
  checkSubscription: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null)
  const prevSubscribedRef = useRef<boolean | null>(null)

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        // Handle profile creation for new users only on SIGNED_UP event
        if (event === 'SIGNED_IN' && session?.user) {
          setTimeout(() => {
            createUserProfile(session.user)
          }, 0)
        }
      }
    )

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const createUserProfile = async (user: User) => {
    try {
      // Check if marketing_link_id is in user metadata (for marketing signups)
      const marketingLinkId = user.user_metadata?.marketing_link_id;
      
      // For marketing signups, credits are already set via MarketingSignup page
      // For normal signups, use default 210 credits
      const defaultCredits = marketingLinkId ? undefined : 210;
      
      // First check if profile already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, welcome_email_sent, created_at')
        .eq('user_id', user.id)
        .single()

      if (existingProfile) {
        // Profile exists - only send welcome email if not sent yet
        if (!existingProfile.welcome_email_sent) {
          sendWelcomeEmail(user)
          // Mark email as sent
          await supabase
            .from('profiles')
            .update({ welcome_email_sent: true })
            .eq('user_id', user.id)
        }
        return
      }

      // Create new profile for new user
      const { error } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || '',
          welcome_email_sent: true, // Will send below
          onboarding_completed: false, // New user needs onboarding
          ...(defaultCredits !== undefined ? { credits: defaultCredits, free_credits: defaultCredits } : {}),
        })
      
      if (!error) {
        // Send welcome email for new user
        sendWelcomeEmail(user)
      } else {
        console.error('Error creating profile:', error)
      }
    } catch (err) {
      console.error('Error creating profile:', err)
    }
  }

  const sendWelcomeEmail = async (user: User) => {
    if (!user?.email) return
    
    try {
      const fullName =
        (user.user_metadata?.full_name as string) ||
        (user.email?.split('@')[0]) ||
        'there'

      await supabase.functions.invoke('send-welcome-email', {
        body: {
          email: user.email,
          fullName,
          userId: user.id
        }
      })
      
      console.log('Welcome email sent to new user')
    } catch (err) {
      console.error('Failed to send welcome email:', err)
    }
  }

  const sendSubscriptionWelcomeEmail = async () => {
    if (!user?.email) return
    
    try {
      // Check if subscription email was already sent
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, subscription_email_sent')
        .eq('user_id', user.id)
        .single()

      // Don't send if already sent
      if (profile?.subscription_email_sent) {
        console.log('Subscription email already sent, skipping')
        return
      }

      const fullName =
        (profile?.full_name && profile.full_name.trim()) ||
        (user.user_metadata?.full_name as string) ||
        (user.email?.split('@')[0]) ||
        'there'

      const { error } = await supabase.functions.invoke('send-subscription-success-email', {
        body: { email: user.email, fullName }
      })

      if (!error) {
        // Mark subscription email as sent in database
        await supabase
          .from('profiles')
          .update({ subscription_email_sent: true })
          .eq('user_id', user.id)
        console.log('Subscription welcome email sent')
      } else {
        console.error('Failed to send subscription welcome email:', error)
      }
    } catch (err) {
      console.error('Exception sending subscription welcome email:', err)
    }
  }

  const checkSubscription = async () => {
    if (!user) {
      setSubscriptionStatus(null)
      return
    }

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription')
      
      if (error) {
        console.error('Error checking subscription:', error)
        setSubscriptionStatus({ subscribed: false })
      } else {
        setSubscriptionStatus(data)
      }
    } catch (error) {
      console.error('Exception checking subscription:', error)
      setSubscriptionStatus({ subscribed: false })
    }
  }

  // Check subscription on user change and periodically
  useEffect(() => {
    if (user) {
      checkSubscription()
      
      // Check subscription every 60 seconds
      const interval = setInterval(checkSubscription, 60000)
      return () => clearInterval(interval)
    } else {
      setSubscriptionStatus(null)
    }
  }, [user])

  // Send welcome email the first time we detect an active subscription
  useEffect(() => {
    if (!user) return

    const justBecameSubscribed =
      subscriptionStatus?.subscribed === true && prevSubscribedRef.current !== true

    if (justBecameSubscribed) {
      sendSubscriptionWelcomeEmail()
    }

    // Track latest value for next runs
    prevSubscribedRef.current = subscriptionStatus?.subscribed ?? null
  }, [subscriptionStatus, user])

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error)
    }
  }

  const value = {
    user,
    session,
    loading,
    subscriptionStatus,
    checkSubscription,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
