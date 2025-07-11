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
  const [message, setMessage] = useState<string | null>(null)
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
    setMessage(null)
    startTransition(async () => {
      const result = await handleSignUp({ email, password })
      if (result?.error) {
        setError(result.error)
      } else {
        setMessage(
          result.message ||
            'Check your email for a confirmation link to complete your sign up.'
        )
        // Optionally, redirect to a page saying "check your email" or to sign-in page
        // For now, just shows a message.
        // router.push('/sign-in');
      }
    })
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md p-8 space-y-6 bg-card text-card-foreground rounded-lg shadow-lg">
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
          {error && <p className="text-sm text-destructive">{error}</p>}
          {message && (
            <p className="text-sm text-foreground">{message}</p> // Using foreground for general messages
          )}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Signing Up...' : 'Sign Up'}
          </Button>
        </form>
        <p className="text-sm text-center text-muted-foreground">
          Already have an account?{' '}
          <Button
            variant="link"
            className="p-0 h-auto"
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
