import { useAuth } from "@/hooks/useAuth"
import { Navigate } from "react-router-dom"
import { CharisLoader } from "@/components/ui/charis-loader"

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth()

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

  return <>{children}</>
}
