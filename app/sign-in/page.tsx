'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { handleSignIn } from './actions' // We will create this

export default function SignInPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await handleSignIn({ email, password })
      if (result?.error) {
        setError(result.error)
      } else {
        router.push('/') // Redirect to home on success
        router.refresh() // Refresh server components
      }
    })
  }

  return (
    <div className="bg-background flex min-h-[100dvh] items-center justify-center">
      <div className="w-full max-w-md space-y-6 p-8 md:bg-card md:text-card-foreground md:rounded-lg md:shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Sign In</h1>
          <p className="text-muted-foreground">
            Enter your credentials to access your account
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="m@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isPending}
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Signing In...' : 'Sign In'}
          </Button>
        </form>
        <p className="text-muted-foreground text-center text-sm">
          Don&apos;t have an account?{' '}
          <Button
            variant="link"
            className="h-auto p-0"
            onClick={() => router.push('/sign-up')}
            disabled={isPending}
          >
            Sign Up
          </Button>
        </p>
      </div>
    </div>
  )
}
