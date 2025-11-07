import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import { Navigate, useNavigate } from "react-router-dom"
import { Loader2 } from "lucide-react"
import { useEffect } from "react"

export default function Auth() {
  const { user, subscriptionStatus, checkSubscription } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  // Check subscription status when user is authenticated
  useEffect(() => {
    if (user) {
      checkSubscription().then(() => {
        // Navigate based on subscription status will be handled by SubscriptionGuard
        navigate("/app")
      })
    }
  }, [user, checkSubscription, navigate])

  // Redirect if already authenticated
  if (user && subscriptionStatus) {
    if (subscriptionStatus.subscribed) {
      return <Navigate to="/app" replace />
    } else {
      return <Navigate to="/pricing" replace />
    }
  }

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get("signup-email") as string
    const password = formData.get("signup-password") as string
    const fullName = formData.get("full-name") as string

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: fullName,
          }
        }
      })

      if (error) {
        console.error("Sign up error:", error)
        
        if (error.message.includes("already registered")) {
          setError("This email is already registered. Please sign in instead.")
        } else if (error.message.includes("Failed to fetch") || error.message.includes("fetch")) {
          setError("Unable to connect to authentication service. Please check your internet connection and try again.")
        } else {
          setError(error.message)
        }
      } else {
        setMessage("Check your email for a confirmation link!")
      }
    } catch (err) {
      console.error("Unexpected sign up error:", err)
      const errorMessage = err instanceof Error ? err.message : "Unknown error"
      
      if (errorMessage.includes("Failed to fetch") || errorMessage.includes("fetch")) {
        setError("Unable to connect to authentication service. Please check your internet connection and try again.")
      } else {
        setError("An unexpected error occurred. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get("signin-email") as string
    const password = formData.get("signin-password") as string

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error("Sign in error:", error)
        
        if (error.message.includes("Invalid login credentials")) {
          setError("Invalid email or password. Please try again.")
        } else if (error.message.includes("Failed to fetch") || error.message.includes("fetch")) {
          setError("Unable to connect to authentication service. Please check your internet connection and try again.")
        } else {
          setError(error.message)
        }
      }
    } catch (err) {
      console.error("Unexpected sign in error:", err)
      const errorMessage = err instanceof Error ? err.message : "Unknown error"
      
      if (errorMessage.includes("Failed to fetch") || errorMessage.includes("fetch")) {
        setError("Unable to connect to authentication service. Please check your internet connection and try again.")
      } else {
        setError("An unexpected error occurred. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome to Arcads</CardTitle>
          <CardDescription>
            Create winning video ads with AI actors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {message && (
              <Alert className="mt-4">
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            <TabsContent value="signin" className="space-y-4">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    name="signin-email"
                    type="email"
                    placeholder="Enter your email"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    name="signin-password"
                    type="password"
                    placeholder="Enter your password"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Sign In
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full-name">Full Name</Label>
                  <Input
                    id="full-name"
                    name="full-name"
                    type="text"
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    name="signup-email"
                    type="email"
                    placeholder="Enter your email"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    name="signup-password"
                    type="password"
                    placeholder="Create a password"
                    minLength={6}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Sign Up
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}