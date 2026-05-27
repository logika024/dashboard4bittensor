import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { signOut } from "@/app/login/actions"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Middleware already enforces this, but keep a server-side guard for safety.
  if (!user) redirect("/login")

  const displayName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    user.email ??
    "friend"
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined
  const initial = displayName.trim().charAt(0).toUpperCase() || "?"

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-12">
      <Card className="w-full max-w-md gap-6 py-8">
        <CardContent className="flex flex-col items-center gap-6">
          <Avatar size="lg" className="size-20">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
            <AvatarFallback className="text-xl">{initial}</AvatarFallback>
          </Avatar>

          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="font-heading text-3xl font-semibold tracking-tight">
              hello protected user!
            </h1>
            <p className="text-sm text-muted-foreground">
              Signed in as{" "}
              <span className="font-medium text-foreground">{displayName}</span>
            </p>
          </div>

          <form action={signOut} className="w-full">
            <Button type="submit" variant="outline" className="h-10 w-full">
              Sign out
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
