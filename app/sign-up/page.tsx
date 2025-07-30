'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { handleSignUp } from './actions' // We will create this

export default function SignUpPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await handleSignUp({ email, password })
      if (result?.error) {
        setError(result.error)
      } else {
        router.push('/verify-email')
      }
    })
  }

  return (
    <div className="bg-background flex min-h-[100dvh] items-center justify-center">
      <div className="bg-card text-card-foreground w-full max-w-md space-y-6 rounded-lg p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Create Account</h1>
          <p className="text-muted-foreground">
            Fill in the details to sign up
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
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
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isPending}
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Signing Up...' : 'Sign Up'}
          </Button>
        </form>
        <p className="text-muted-foreground text-center text-sm">
          Already have an account?{' '}
          <Button
            variant="link"
            className="h-auto p-0"
            onClick={() => router.push('/sign-in')}
            disabled={isPending}
          >
            Sign In
          </Button>
        </p>
      </div>
    </div>
  )
}
