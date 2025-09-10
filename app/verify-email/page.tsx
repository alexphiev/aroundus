'use client'

import { Button } from '@/components/ui/button'
import { Mail } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function VerifyEmailPage() {
  const router = useRouter()

  return (
    <div className="bg-background flex min-h-[100dvh] items-center justify-center">
      <div className="md:bg-card md:text-card-foreground w-full max-w-md space-y-6 p-8 md:rounded-lg md:shadow-lg">
        <div className="text-center">
          <div className="bg-primary/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
            <Mail className="text-primary h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold">Check Your Email</h1>
          <p className="text-muted-foreground">
            We&apos;ve sent a verification link to your email address. Please
            check your inbox and click the link to verify your account.
          </p>
        </div>

        <div className="space-y-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push('/sign-in')}
          >
            Back to Sign In
          </Button>
        </div>

        <div className="text-center">
          <p className="text-muted-foreground text-sm">
            Didn&apos;t receive the email? Check your spam folder or{' '}
            <Button
              variant="link"
              className="h-auto p-0 text-sm"
              onClick={() => router.push('/sign-up')}
            >
              try signing up again
            </Button>
          </p>
        </div>
      </div>
    </div>
  )
}
