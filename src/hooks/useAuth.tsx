import { createContext, useContext, useEffect, useState } from "react"
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

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        // Handle profile creation for new users
        if (event === 'SIGNED_IN' && session?.user && !user) {
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
      const { error } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || '',
        })
      
      if (error && !error.message.includes('duplicate key')) {
        console.error('Error creating profile:', error)
      }
    } catch (err) {
      console.error('Error creating profile:', err)
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