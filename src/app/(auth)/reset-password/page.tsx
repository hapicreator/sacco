// FILE: src/app/(auth)/reset-password/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, KeyRound, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm]   = useState(false)
  const [isLoading, setIsLoading]       = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [password, setPassword]         = useState('')
  const [confirm, setConfirm]           = useState('')

  const passwordStrong = password.length >= 8
  const passwordsMatch = password === confirm && confirm.length > 0

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!passwordStrong) { setErrorMessage('Password must be at least 8 characters.'); return }
    if (!passwordsMatch) { setErrorMessage('Passwords do not match.'); return }

    setIsLoading(true)
    setErrorMessage(null)

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setErrorMessage(error.message)
      setIsLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div>
      <div className="mb-8">
        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-5">
          <KeyRound className="w-6 h-6 text-green-700" />
        </div>
        <h1 className="text-3xl font-bold text-stone-900 mb-2" style={{ fontFamily: 'var(--font-heading, serif)' }}>
          Set new password
        </h1>
        <p className="text-stone-500 text-sm">Choose a strong password for your account.</p>
      </div>

      {errorMessage && (
        <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-red-700 text-sm">{errorMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-stone-700 mb-1.5">New password</label>
          <div className="relative">
            <input id="password" name="password"
              type={showPassword ? 'text' : 'password'} required
              autoComplete="new-password" placeholder="At least 8 characters"
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="input-field pr-12" />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {password.length > 0 && (
            <p className={`text-xs mt-1.5 ${passwordStrong ? 'text-green-600' : 'text-amber-600'}`}>
              {passwordStrong ? '✓ Strong enough' : '✗ Needs at least 8 characters'}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="confirm" className="block text-sm font-medium text-stone-700 mb-1.5">Confirm password</label>
          <div className="relative">
            <input id="confirm" name="confirm"
              type={showConfirm ? 'text' : 'password'} required
              autoComplete="new-password" placeholder="Re-enter new password"
              value={confirm} onChange={(e) => setConfirm(e.target.value)}
              className="input-field pr-12" />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1">
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {confirm.length > 0 && (
            <p className={`text-xs mt-1.5 ${passwordsMatch ? 'text-green-600' : 'text-red-500'}`}>
              {passwordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
            </p>
          )}
        </div>

        <button type="submit" disabled={isLoading}
          className="btn-primary flex items-center justify-center gap-2">
          {isLoading ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Saving...
            </>
          ) : (
            <><KeyRound className="w-4 h-4" /> Update password</>
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-stone-500">
        Remembered your password?{' '}
        <Link href="/login" className="text-green-700 hover:text-green-800 font-semibold">Sign in</Link>
      </p>
    </div>
  )
}
