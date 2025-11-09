import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { Loader2, User, Shield, Settings as SettingsIcon } from "lucide-react"

interface Profile {
  id: string
  user_id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
}

export default function Settings() {
  const { user, signOut } = useAuth()
  const { toast } = useToast()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [user])

  const fetchProfile = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      setProfile(data || {
        id: '',
        user_id: user.id,
        full_name: user.user_metadata?.full_name || '',
        email: user.email || '',
        avatar_url: null
      })
    } catch (error) {
      console.error('Error fetching profile:', error)
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!user || !profile) return

    setUpdating(true)

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          full_name: profile.full_name,
          email: profile.email,
        })

      if (error) throw error

      toast({
        title: "Success",
        description: "Profile updated successfully",
      })
    } catch (error) {
      console.error('Error updating profile:', error)
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      })
    } finally {
      setUpdating(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your account settings and preferences.</p>
        </div>

        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Update your personal information and profile details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {profile && (
              <form onSubmit={updateProfile} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full-name">Full Name</Label>
                  <Input
                    id="full-name"
                    value={profile.full_name || ''}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email || ''}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    placeholder="Enter your email"
                  />
                </div>
                <Button type="submit" disabled={updating}>
                  {updating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Update Profile
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Account Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Account Actions
            </CardTitle>
            <CardDescription>
              Manage your account security and access.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div>
                <h3 className="font-medium">Sign Out</h3>
                <p className="text-sm text-muted-foreground">Sign out of your account on this device.</p>
              </div>
              <Button variant="outline" onClick={handleSignOut}>
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Usage Information */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Account ID:</span>
              <span className="font-mono text-xs">{user?.id}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Member Since:</span>
              <span>{user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}