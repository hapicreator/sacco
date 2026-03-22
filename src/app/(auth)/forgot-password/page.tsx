// FILE: src/app/(auth)/forgot-password/page.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading]     = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSuccess, setIsSuccess]     = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setErrorMessage(null)

    const form  = new FormData(event.currentTarget)
    const email = form.get('email') as string

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setErrorMessage(error.message)
      setIsLoading(false)
      return
    }

    setIsLoading(false)
    setIsSuccess(true)
  }

  if (isSuccess) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-stone-900 mb-3" style={{ fontFamily: 'var(--font-heading, serif)' }}>
          Reset link sent
        </h2>
        <p className="text-stone-500 text-sm leading-relaxed mb-6">
          If an account exists for that email, you&apos;ll receive a password reset link shortly.
        </p>
        <p className="text-stone-400 text-xs mb-8">Check your spam folder if you don&apos;t see it.</p>
        <Link href="/login"
          className="inline-flex items-center gap-2 text-green-700 hover:text-green-800 font-semibold text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <Link href="/login"
          className="inline-flex items-center gap-1.5 text-stone-400 hover:text-stone-600 text-sm mb-5 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to sign in
        </Link>
        <h1 className="text-3xl font-bold text-stone-900 mb-2" style={{ fontFamily: 'var(--font-heading, serif)' }}>
          Forgot your password?
        </h1>
        <p className="text-stone-500 text-sm leading-relaxed">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-red-700 text-sm">{errorMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-1.5">
            Email address
          </label>
          <input id="email" name="email" type="email" required
            autoComplete="email" placeholder="you@example.com" className="input-field" />
        </div>

        <button type="submit" disabled={isLoading}
          className="btn-primary flex items-center justify-center gap-2">
          {isLoading ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Sending...
            </>
          ) : (
            <><Mail className="w-4 h-4" /> Send reset link</>
          )}
        </button>
      </form>
    </div>
  )
}
